/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import './positronInlineOutput.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { InlineOutputManager } from './inlineOutputManager.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IRuntimeSessionService } from '../../../services/runtimeSession/common/runtimeSessionService.js';
import { RuntimeCodeExecutionMode, RuntimeErrorBehavior } from '../../../services/languageRuntime/common/languageRuntimeService.js';

/**
 * Main workbench contribution for inline output feature.
 */
export class PositronInlineOutputContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.positronInlineOutput';

	private _outputManager: InlineOutputManager;

	constructor(
		// @IEditorService private readonly editorService: IEditorService,
		// @ICodeEditorService private readonly codeEditorService: ICodeEditorService
	) {
		super();
		this._outputManager = this._register(new InlineOutputManager());
	}

	public getOutputManager(): InlineOutputManager {
		return this._outputManager;
	}
}

/**
 * Command to run current code cell and show output inline.
 */
class RunCellInlineCommand extends Action2 {
	constructor() {
		super({
			id: 'positron.runCellInline',
			title: { value: 'Run Cell and Show Output Inline', original: 'Run Cell and Show Output Inline' },
			category: 'View',
			f1: true,
			keybinding: {
				when: EditorContextKeys.editorTextFocus,
				primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const codeEditorService = accessor.get(ICodeEditorService);
		const runtimeSessionService = accessor.get(IRuntimeSessionService);
		const activeEditor = codeEditorService.getFocusedCodeEditor();

		if (!activeEditor) {
			return;
		}

		const model = activeEditor.getModel();
		if (!model) {
			return;
		}

		// Get the current selection or line
		const selection = activeEditor.getSelection();
		if (!selection) {
			return;
		}

		let code: string;
		let endLine: number;

		if (selection.isEmpty()) {
			// No selection, execute current line
			const position = activeEditor.getPosition();
			if (!position) {
				return;
			}
			code = model.getLineContent(position.lineNumber);
			endLine = position.lineNumber;
		} else {
			// Execute selected code
			code = model.getValueInRange(selection);
			endLine = selection.endLineNumber;
		}

		if (!code.trim()) {
			return;
		}

		// Get the foreground runtime session
		const session = runtimeSessionService.foregroundSession;
		if (!session) {
			console.warn('No active runtime session');
			return;
		}

		// Create output manager
		const outputManager = new InlineOutputManager();
		let outputText = '';

		// Subscribe to runtime messages to capture output
		const disposables: any[] = [];

		// Capture stream output (stdout)
		disposables.push(session.onDidReceiveRuntimeMessageStream((message) => {
			if (message.parent_id === executionId) {
				outputText += message.text;
			}
		}));

		// Capture output messages
		disposables.push(session.onDidReceiveRuntimeMessageOutput((message) => {
			if (message.parent_id === executionId) {
				// Handle different output types
				if (message.data['text/plain']) {
					outputText += message.data['text/plain'];
				}
			}
		}));

		// Capture errors
		disposables.push(session.onDidReceiveRuntimeMessageError((message) => {
			if (message.parent_id === executionId) {
				outputText += `Error: ${message.name}\n${message.message}\n`;
				if (message.traceback && message.traceback.length > 0) {
					outputText += message.traceback.join('\n');
				}
			}
		}));

		// Capture result
		disposables.push(session.onDidReceiveRuntimeMessageResult((message) => {
			if (message.parent_id === executionId) {
				if (message.data['text/plain']) {
					outputText += message.data['text/plain'];
				}

				// Show the accumulated output
				if (outputText.trim()) {
					outputManager.showOutput(
						activeEditor,
						model.uri,
						endLine,
						outputText,
						'text/plain'
					);
				}

				// Clean up event listeners
				disposables.forEach(d => d.dispose());
			}
		}));

		// Generate a unique execution ID
		const executionId = `inline-${Date.now()}`;

		// Execute the code
		session.execute(
			code,
			executionId,
			RuntimeCodeExecutionMode.Interactive,
			RuntimeErrorBehavior.Continue
		);
	}
}

/**
 * Command to clear inline output for current cell.
 */
class ClearCellOutputCommand extends Action2 {
	constructor() {
		super({
			id: 'positron.clearCellOutput',
			title: { value: 'Clear Cell Output', original: 'Clear Cell Output' },
			category: 'View',
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		// TODO: Implement clear logic
		console.log('Clear Cell Output command triggered');
	}
}

/**
 * Demo command to test showing inline output (for development/testing).
 */
class ShowTestOutputCommand extends Action2 {
	constructor() {
		super({
			id: 'positron.showTestInlineOutput',
			title: { value: 'Show Test Inline Output (Demo)', original: 'Show Test Inline Output (Demo)' },
			category: 'View',
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const codeEditorService = accessor.get(ICodeEditorService);
		// const editorService = accessor.get(IEditorService);
		const activeEditor = codeEditorService.getFocusedCodeEditor();

		if (!activeEditor) {
			return;
		}

		// For demo, we'll create output manager directly
		// In production, this would be accessed through a service
		const outputManager = new InlineOutputManager();

		// Get current line
		const position = activeEditor.getPosition();
		if (!position) {
			return;
		}

		const model = activeEditor.getModel();
		if (!model) {
			return;
		}

		// Show test output after current line
		const testOutput = `[Demo Output]
This is a test of inline output display.
Current line: ${position.lineNumber}
Time: ${new Date().toLocaleTimeString()}

This demonstrates the ZoneWidget approach for displaying
code execution results inline in the editor.`;

		outputManager.showOutput(
			activeEditor,
			model.uri,
			position.lineNumber,
			testOutput,
			'text/plain'
		);
	}
}

// Register actions
registerAction2(RunCellInlineCommand);
registerAction2(ClearCellOutputCommand);
registerAction2(ShowTestOutputCommand);

// Register the workbench contribution
registerWorkbenchContribution2(
	PositronInlineOutputContribution.ID,
	PositronInlineOutputContribution,
	WorkbenchPhase.AfterRestored
);
