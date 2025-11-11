/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

// import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import * as dom from '../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';

/**
 * A zone widget that displays code execution output inline in the editor.
 */
export class OutputZoneWidget extends ZoneWidget {
	private _outputContainer: HTMLElement;
	private _closeButton: HTMLElement;
	private _onCloseCallback?: () => void;
	override readonly _disposables = new DisposableStore();

	constructor(
		editor: ICodeEditor,
		private readonly afterLineNumber: number,
		onClose?: () => void
	) {
		super(editor, {
			showFrame: false, // Don't show blue border lines
			showArrow: false,
			isAccessible: true,
			className: 'positron-inline-output-zone'
		});

		this._onCloseCallback = onClose;
		this._outputContainer = dom.$('.positron-inline-output-container');
		this._closeButton = dom.$('button.positron-inline-output-close', {
			title: 'Close Output',
			'aria-label': 'Close Output'
		});
		this._closeButton.textContent = '\u2715';

		// Handle close button click
		this._disposables.add(dom.addDisposableListener(this._closeButton, 'click', () => {
			if (this._onCloseCallback) {
				this._onCloseCallback();
			}
			this.dispose();
		}));

		this.create();
	}

	protected override _fillContainer(container: HTMLElement): void {
		// Add close button at the top right
		const header = dom.$('.positron-inline-output-header');
		dom.append(header, this._closeButton);
		dom.append(container, header);
		dom.append(container, this._outputContainer);
	}

	/**
	 * Show the zone widget after the specified line.
	 */
	public override show(): void {
		super.show({ lineNumber: this.afterLineNumber, column: 1 }, 5); // Show with 5 lines height initially
	}

	/**
	 * Override to position the zone to align with editor content, not covering line numbers.
	 */
	getLeft(info: any): number {
		// Position at contentLeft to align with the actual code content, not covering line numbers
		return info.contentLeft || 0;
	}

	/**
	 * Override to set width to match editor content area, not full editor width.
	 */
	protected override _getWidth(info: any): number {
		// Use contentWidth instead of full width to match the code area
		return info.contentWidth || (info.width - info.minimap.minimapWidth - info.verticalScrollbarWidth);
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
		// Editor option id 67 is used upstream for lineHeight in some branches.
		// Coerce to a number safely and provide a sensible fallback to avoid NaN/div-by-zero.
		// TODO: Replace the numeric literal with the proper EditorOption enum import (EditorOption.lineHeight).
		const rawLineHeight = this.editor.getOption(67);
		const lineHeightCandidate = typeof rawLineHeight === 'number' ? rawLineHeight : Number(rawLineHeight);
		const lineHeight = (isFinite(lineHeightCandidate) && lineHeightCandidate > 0) ? lineHeightCandidate : 16; // default 16px if unknown
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

	public override dispose(): void {
		this._disposables.dispose();
		super.dispose();
	}
}
