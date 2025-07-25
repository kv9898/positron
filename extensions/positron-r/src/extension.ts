/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023-2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as positron from 'positron';

import { registerCommands } from './commands';
import { providePackageTasks } from './tasks';
import { setContexts } from './contexts';
import { setupTestExplorer, refreshTestExplorer } from './testing/testing';
import { RRuntimeManager } from './runtime-manager';
import { registerUriHandler } from './uri-handler';
import { registerRLanguageModelTools } from './llm-tools.js';
import { registerFileAssociations } from './file-associations.js';

export const LOGGER = vscode.window.createOutputChannel('R Language Pack', { log: true });

export function activate(context: vscode.ExtensionContext) {
	const onDidChangeLogLevel = (logLevel: vscode.LogLevel) => {
		LOGGER.appendLine(vscode.l10n.t('Log level: {0}', vscode.LogLevel[logLevel]));
	};
	context.subscriptions.push(LOGGER.onDidChangeLogLevel(onDidChangeLogLevel));
	onDidChangeLogLevel(LOGGER.logLevel);

	const rRuntimeManager = new RRuntimeManager(context);
	positron.runtime.registerLanguageRuntimeManager('r', rRuntimeManager);

	// Set contexts.
	setContexts(context);

	// Register commands.
	registerCommands(context, rRuntimeManager);

	// Register LLM tools.
	registerRLanguageModelTools(context);

	// Provide tasks.
	providePackageTasks(context);

	// Register file associations.
	registerFileAssociations();

	// Prepare to handle cli-produced hyperlinks that target the positron-r extension.
	registerUriHandler();

	// Setup testthat test explorer.
	setupTestExplorer(context);
	vscode.workspace.onDidChangeConfiguration(async event => {
		if (event.affectsConfiguration('positron.r.testing')) {
			refreshTestExplorer(context);
		}
	});
}
