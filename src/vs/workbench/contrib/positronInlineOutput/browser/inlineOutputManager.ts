/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { OutputZoneWidget } from './outputZoneWidget.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';

/**
 * Represents a code cell and its associated output zone.
 */
interface CellOutput {
	cellRange: Range;
	zone: OutputZoneWidget;
}

/**
 * Service to manage inline output zones for code cells.
 */
export class InlineOutputManager extends Disposable {
	private _outputs = new Map<string, CellOutput[]>();

	constructor() {
		super();
	}

	/**
	 * Show output for a code cell.
	 */
	public showOutput(
		editor: ICodeEditor,
		documentUri: URI,
		cellEndLine: number,
		content: string,
		mimeType: string = 'text/plain'
	): void {
		const key = documentUri.toString();
		let outputs = this._outputs.get(key);
		if (!outputs) {
			outputs = [];
			this._outputs.set(key, outputs);
		}

		// Check if we already have a zone for this line
		let existing = outputs.find(o => o.cellRange.endLineNumber === cellEndLine);
		
		if (existing) {
			// Update existing zone
			existing.zone.updateOutput(content, mimeType);
		} else {
			// Create new zone
			const zone = new OutputZoneWidget(editor, cellEndLine);
			zone.show();
			zone.updateOutput(content, mimeType);
			
			outputs.push({
				cellRange: new Range(cellEndLine, 1, cellEndLine, 1), // Simple range for now
				zone
			});
		}
	}

	/**
	 * Clear output for a specific cell.
	 */
	public clearCellOutput(documentUri: URI, cellEndLine: number): void {
		const key = documentUri.toString();
		const outputs = this._outputs.get(key);
		if (!outputs) {
			return;
		}

		const index = outputs.findIndex(o => o.cellRange.endLineNumber === cellEndLine);
		if (index >= 0) {
			outputs[index].zone.dispose();
			outputs.splice(index, 1);
		}
	}

	/**
	 * Clear all outputs for a document.
	 */
	public clearAllOutputs(documentUri: URI): void {
		const key = documentUri.toString();
		const outputs = this._outputs.get(key);
		if (outputs) {
			outputs.forEach(o => o.zone.dispose());
			this._outputs.delete(key);
		}
	}

	override dispose(): void {
		// Dispose all zones
		for (const outputs of this._outputs.values()) {
			outputs.forEach(o => o.zone.dispose());
		}
		this._outputs.clear();
		super.dispose();
	}
}
