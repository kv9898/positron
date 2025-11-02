/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import './positronInlineOutput.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { InlineOutputManager } from './inlineOutputManager.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';

/**
 * Main workbench contribution for inline output feature.
 */
export class PositronInlineOutputContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.positronInlineOutput';

	private _outputManager: InlineOutputManager;

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService
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
			category: 'Positron',
			f1: true,
			keybinding: {
				when: ContextKeyExpr.and(
					EditorContextKeys.editorTextFocus,
					ContextKeyExpr.equals('editorLangId', 'quarto')
				),
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		// TODO: Implement actual execution logic
		// For now, just show a test message
		const codeEditorService = accessor.get(ICodeEditorService);
		const activeEditor = codeEditorService.getFocusedCodeEditor();
		
		if (!activeEditor) {
			return;
		}

		// This is a placeholder - in full implementation, this would:
		// 1. Detect the current code cell
		// 2. Execute it via positron.runtime
		// 3. Capture the output
		// 4. Display it inline using the OutputManager
		
		console.log('Run Cell Inline command triggered');
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
			category: 'Positron',
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
			category: 'Positron',
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const codeEditorService = accessor.get(ICodeEditorService);
		const editorService = accessor.get(IEditorService);
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
