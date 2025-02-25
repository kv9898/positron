/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023-2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
// eslint-disable-next-line import/no-unresolved
import * as positron from 'positron';
import * as vscode from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { ProgressLocation, ProgressOptions } from 'vscode';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { IDisposableRegistry, IInstaller, InstallerResponse, Product, ProductInstallStatus } from '../common/types';
import { IInterpreterService } from '../interpreter/contracts';
import { IServiceContainer } from '../ioc/types';
import { traceError, traceInfo, traceLog } from '../logging';
import { IPYKERNEL_VERSION, MINIMUM_PYTHON_VERSION, Commands } from '../common/constants';
import { InstallOptions } from '../common/installer/types';
import { EnvironmentType } from '../pythonEnvironments/info';
import { isProblematicCondaEnvironment } from '../interpreter/configuration/environmentTypeComparer';
import { Interpreters } from '../common/utils/localize';
import { IApplicationShell } from '../common/application/types';
import { activateAppDetection as activateWebAppDetection } from './webAppContexts';
import { activateWebAppCommands } from './webAppCommands';
import { printInterpreterDebugInfo } from './interpreterSettings';

class PythonNotebookDebugAdapter implements vscode.DebugAdapter {
    private readonly _disposables: vscode.Disposable[] = [];

    private readonly _onDidSendMessage = new vscode.EventEmitter<vscode.DebugProtocolMessage>();

    public readonly onDidSendMessage = this._onDidSendMessage.event;

    constructor(
        private readonly _debugSession: vscode.DebugSession,
        private readonly _runtimeSession: positron.LanguageRuntimeSession,
    ) {
        this._disposables.push(this._onDidSendMessage);

        this._disposables.push(
            this._runtimeSession.onDidReceiveRuntimeMessage((message) => {
                if (message.type === positron.LanguageRuntimeMessageType.DebugEvent) {
                    const debugEvent = message as positron.LanguageRuntimeDebugEvent;
                    this._onDidSendMessage.fire(debugEvent.content);
                }
            }),
        );
    }

    // eslint-disable-next-line class-methods-use-this
    public handleMessage(message: DebugProtocol.ProtocolMessage): void {
        console.log('PythonNotebookDebugAdapter.handleMessage', message);
        this._handleMessageAsync(message).ignoreErrors();
    }

    private async _handleMessageAsync(message: DebugProtocol.ProtocolMessage): Promise<void> {
        if (message.type === 'request') {
            const id = randomUUID();

            const disposable = this._runtimeSession.onDidReceiveRuntimeMessage((message) => {
                if (message.parent_id !== id) {
                    return;
                }
                if (message.type === positron.LanguageRuntimeMessageType.DebugReply) {
                    const debugReply = message as positron.LanguageRuntimeDebugReply;
                    if (debugReply.content === undefined) {
                        throw new Error('No content in debug reply. Is debugpy already listening?');
                    }
                    this._onDidSendMessage.fire(debugReply.content);
                    disposable.dispose();
                }
            });

            this._runtimeSession.debug(message as DebugProtocol.Request, id);
        }
    }

    public dispose() {
        this._disposables.forEach((disposable) => disposable.dispose());
    }
}

export async function activatePositron(serviceContainer: IServiceContainer): Promise<void> {
    try {
        const disposables = serviceContainer.get<IDisposableRegistry>(IDisposableRegistry);
        // Register a command to check if ipykernel is installed for a given interpreter.
        disposables.push(
            vscode.commands.registerCommand('python.isIpykernelInstalled', async (pythonPath: string) => {
                const interpreterService = serviceContainer.get<IInterpreterService>(IInterpreterService);
                const interpreter = await interpreterService.getInterpreterDetails(pythonPath);
                if (interpreter) {
                    const installer = serviceContainer.get<IInstaller>(IInstaller);
                    const hasCompatibleKernel = await installer.isProductVersionCompatible(
                        Product.ipykernel,
                        IPYKERNEL_VERSION,
                        interpreter,
                    );
                    return hasCompatibleKernel === ProductInstallStatus.Installed;
                }
                traceError(
                    `Could not check if ipykernel is installed due to an invalid interpreter path: ${pythonPath}`,
                );
                return false;
            }),
        );
        // Register a command to install ipykernel for a given interpreter.
        disposables.push(
            vscode.commands.registerCommand('python.installIpykernel', async (pythonPath: string) => {
                const interpreterService = serviceContainer.get<IInterpreterService>(IInterpreterService);
                const interpreter = await interpreterService.getInterpreterDetails(pythonPath);
                if (interpreter) {
                    const installer = serviceContainer.get<IInstaller>(IInstaller);
                    // Using a process to install modules avoids using the terminal service,
                    // which has issues waiting for the outcome of the install.
                    const installOptions: InstallOptions = { installAsProcess: true };
                    const installResult = await installer.install(
                        Product.ipykernel,
                        interpreter,
                        undefined,
                        undefined,
                        installOptions,
                    );
                    if (installResult !== InstallerResponse.Installed) {
                        traceError(
                            `Could not install ipykernel for interpreter: ${pythonPath}. Install result - ${installResult}`,
                        );
                    }
                } else {
                    traceError(`Could not install ipykernel due to an invalid interpreter path: ${pythonPath}`);
                }
            }),
        );
        // Register a command to get the minimum version of python supported by the extension.
        disposables.push(
            vscode.commands.registerCommand('python.getMinimumPythonVersion', (): string => MINIMUM_PYTHON_VERSION.raw),
        );
        // Register a command to output information about Python environments.
        disposables.push(
            vscode.commands.registerCommand(Commands.Show_Interpreter_Debug_Info, async () => {
                // Open up the Python Language Pack output channel.
                await vscode.commands.executeCommand(Commands.ViewOutput);

                // Log information about the Python environments.
                const interpreterService = serviceContainer.get<IInterpreterService>(IInterpreterService);
                const interpreters = interpreterService.getInterpreters();
                printInterpreterDebugInfo(interpreters);
            }),
        );

        // Activate detection for web applications
        activateWebAppDetection(disposables);

        // Activate web application commands.
        activateWebAppCommands(serviceContainer, disposables);

        disposables.push(
            vscode.debug.registerDebugAdapterDescriptorFactory('pythonNotebook', {
                async createDebugAdapterDescriptor(
                    debugSession: vscode.DebugSession,
                    _executable: vscode.DebugAdapterExecutable,
                ) {
                    const notebook = vscode.workspace.notebookDocuments.find(
                        (doc) => doc.uri.toString() === debugSession.configuration.__notebookUri,
                    );
                    if (!notebook) {
                        return undefined;
                    }

                    const runtimeSession = await positron.runtime.getNotebookSession(notebook.uri);
                    if (!runtimeSession) {
                        return undefined;
                    }

                    const adapter = new PythonNotebookDebugAdapter(debugSession, runtimeSession);
                    return new vscode.DebugAdapterInlineImplementation(adapter);
                },
            }),
        );

        disposables.push(
            vscode.commands.registerCommand('python.runAndDebugCell', async () => {
                const notebookEditor = vscode.window.activeNotebookEditor;
                if (!notebookEditor) {
                    return;
                }

                await vscode.debug.startDebugging(undefined, {
                    type: 'pythonNotebook',
                    name: path.basename(notebookEditor.notebook.uri.fsPath),
                    request: 'attach',
                    // TODO: Get from config.
                    justMyCode: false,
                    __notebookUri: notebookEditor.notebook.uri.toString(),
                });
            }),
        );

        traceInfo('activatePositron: done!');
    } catch (ex) {
        traceError('activatePositron() failed.', ex);
    }
}

export async function checkAndInstallPython(
    pythonPath: string,
    serviceContainer: IServiceContainer,
): Promise<InstallerResponse> {
    const interpreterService = serviceContainer.get<IInterpreterService>(IInterpreterService);
    const interpreter = await interpreterService.getInterpreterDetails(pythonPath);
    if (!interpreter) {
        return InstallerResponse.Ignore;
    }
    if (
        isProblematicCondaEnvironment(interpreter) ||
        (interpreter.id && !fs.existsSync(interpreter.id) && interpreter.envType === EnvironmentType.Conda)
    ) {
        if (interpreter) {
            const installer = serviceContainer.get<IInstaller>(IInstaller);
            const shell = serviceContainer.get<IApplicationShell>(IApplicationShell);
            const progressOptions: ProgressOptions = {
                location: ProgressLocation.Window,
                title: `[${Interpreters.installingPython}](command:${Commands.ViewOutput})`,
            };
            traceLog('Conda envs without Python are known to not work well; fixing conda environment...');
            const promise = installer.install(
                Product.python,
                await interpreterService.getInterpreterDetails(pythonPath),
            );
            shell.withProgress(progressOptions, () => promise);

            // If Python is not installed into the environment, install it.
            if (!(await installer.isInstalled(Product.python))) {
                traceInfo(`Python not able to be installed.`);
                return InstallerResponse.Ignore;
            }
        }
    }
    return InstallerResponse.Installed;
}
