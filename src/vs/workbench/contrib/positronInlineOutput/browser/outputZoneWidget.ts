/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import * as dom from '../../../../base/browser/dom.js';

/**
 * A zone widget that displays code execution output inline in the editor.
 */
export class OutputZoneWidget extends ZoneWidget {
	private _outputContainer: HTMLElement;

	constructor(
		editor: ICodeEditor,
		private readonly afterLineNumber: number
	) {
		super(editor, {
			showFrame: true,
			showArrow: false,
			isAccessible: true,
			className: 'positron-inline-output-zone'
		});

		this._outputContainer = dom.$('.positron-inline-output-container');
		this.create();
	}

	protected override _fillContainer(container: HTMLElement): void {
		dom.append(container, this._outputContainer);
	}

	/**
	 * Show the zone widget after the specified line.
	 */
	public show(): void {
		super.show(this.afterLineNumber, 5); // Show with 5 lines height initially
	}

	/**
	 * Update the output content displayed in the zone.
	 */
	public updateOutput(content: string, mimeType: string = 'text/plain'): void {
		dom.clearNode(this._outputContainer);

		if (mimeType === 'text/plain') {
			const pre = dom.$('pre.output-text');
			pre.textContent = content;
			dom.append(this._outputContainer, pre);
		} else if (mimeType.startsWith('image/')) {
			const img = dom.$('img.output-image') as HTMLImageElement;
			img.src = content; // Expecting base64 data URL
			dom.append(this._outputContainer, img);
		} else if (mimeType === 'text/html') {
			// For now, just display as text for safety
			const pre = dom.$('pre.output-html');
			pre.textContent = content;
			dom.append(this._outputContainer, pre);
		} else {
			// Fallback for unknown types
			const pre = dom.$('pre.output-unknown');
			pre.textContent = `[${mimeType}]\n${content}`;
			dom.append(this._outputContainer, pre);
		}

		// Adjust height based on content
		this._relayout(this._computeHeight());
	}

	/**
	 * Compute the height needed for the current output.
	 */
	private _computeHeight(): number {
		const contentHeight = this._outputContainer.scrollHeight;
		const lineHeight = this.editor.getOption(67); // Line height option
		const numLines = Math.ceil(contentHeight / lineHeight);
		return Math.min(numLines, 20); // Cap at 20 lines
	}

	/**
	 * Clear the output from the zone.
	 */
	public clearOutput(): void {
		dom.clearNode(this._outputContainer);
		this._relayout(1);
	}
}
