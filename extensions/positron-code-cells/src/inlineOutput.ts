/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { trace } from './logging';

/** Estimated number of editor lines per plot for height calculation */
const LINES_PER_PLOT = 10;
/** Maximum number of lines for inline output display */
const MAX_OUTPUT_LINES = 20;

/**
 * Represents the collected output from a cell execution.
 */
export interface CellOutput {
	/** Text output from stdout */
	textOutput: string[];
	/** Error output from stderr */
	errorOutput: string[];
	/** Plot data (base64 encoded images) */
	plots: string[];
	/** Whether execution completed successfully */
	success: boolean;
	/** Error message if execution failed */
	error?: string;
}

/**
 * Manages inline output display for code cells using webview insets.
 */
export class InlineOutputManager implements vscode.Disposable {
	private readonly disposables: vscode.Disposable[] = [];
	/** Map of document URI + line number to their insets */
	private readonly insets: Map<string, vscode.WebviewEditorInset> = new Map();

	constructor() {
		// Clean up insets when documents close
		this.disposables.push(
			vscode.workspace.onDidCloseTextDocument(doc => {
				this.clearOutputsForDocument(doc.uri);
			})
		);

		// Clean up insets when configuration changes
		this.disposables.push(
			vscode.workspace.onDidChangeConfiguration(e => {
				if (e.affectsConfiguration('codeCells.inlineOutput')) {
					if (!this.isEnabled()) {
						this.clearAllOutputs();
					}
				}
			})
		);
	}

	/**
	 * Check if inline output is enabled in configuration.
	 */
	public isEnabled(): boolean {
		return vscode.workspace.getConfiguration('codeCells').get('inlineOutput', false);
	}

	/**
	 * Display output for a cell at the specified line.
	 */
	public async displayOutput(
		editor: vscode.TextEditor,
		afterLine: number,
		output: CellOutput
	): Promise<void> {
		if (!this.isEnabled()) {
			return;
		}

		// Generate a unique key for this output location
		const key = this.getKey(editor.document.uri, afterLine);

		// Remove existing inset if present
		this.clearOutput(key);

		// Generate HTML content for the output
		const html = this.generateOutputHtml(output);

		// Calculate height based on content
		const lineCount = this.calculateOutputHeight(output);
		if (lineCount === 0) {
			return; // Nothing to display
		}

		// Create webview inset using the proposed API
		try {
			const inset = vscode.window.createWebviewTextEditorInset(
				editor,
				afterLine,
				lineCount,
				{
					enableScripts: false,
					localResourceRoots: []
				}
			);

			inset.webview.html = html;
			this.insets.set(key, inset);

			// Clean up when inset is disposed
			inset.onDidDispose(() => {
				this.insets.delete(key);
			});
		} catch (error) {
			trace(`Failed to create inline output inset: ${error}`);
		}
	}

	/**
	 * Clear output at a specific location.
	 */
	public clearOutput(key: string): void {
		const existingInset = this.insets.get(key);
		if (existingInset) {
			existingInset.dispose();
			this.insets.delete(key);
		}
	}

	/**
	 * Clear all outputs for a document.
	 */
	public clearOutputsForDocument(uri: vscode.Uri): void {
		const prefix = uri.toString() + ':';
		for (const [key, inset] of this.insets.entries()) {
			if (key.startsWith(prefix)) {
				inset.dispose();
				this.insets.delete(key);
			}
		}
	}

	/**
	 * Clear all outputs.
	 */
	public clearAllOutputs(): void {
		for (const inset of this.insets.values()) {
			inset.dispose();
		}
		this.insets.clear();
	}

	private getKey(uri: vscode.Uri, line: number): string {
		return `${uri.toString()}:${line}`;
	}

	private calculateOutputHeight(output: CellOutput): number {
		let lines = 0;

		// Count text output lines
		for (const text of output.textOutput) {
			lines += text.split('\n').length;
		}

		// Count error output lines
		for (const error of output.errorOutput) {
			lines += error.split('\n').length;
		}

		// Add space for plots
		lines += output.plots.length * LINES_PER_PLOT;

		// Add error message if present
		if (output.error) {
			lines += output.error.split('\n').length;
		}

		// Clamp to valid range
		return Math.min(Math.max(lines, 0), MAX_OUTPUT_LINES);
	}

	private generateOutputHtml(output: CellOutput): string {
		const parts: string[] = [];

		// Style block
		parts.push(`
			<style>
				body {
					font-family: var(--vscode-editor-font-family);
					font-size: var(--vscode-editor-font-size);
					margin: 4px 8px;
					padding: 0;
					background-color: var(--vscode-notebook-outputContainerBackgroundColor, var(--vscode-editor-background));
					color: var(--vscode-editor-foreground);
					overflow: auto;
				}
				.output {
					white-space: pre-wrap;
					word-wrap: break-word;
				}
				.error {
					color: var(--vscode-errorForeground);
				}
				.plot {
					max-width: 100%;
					max-height: 300px;
				}
				.stderr {
					color: var(--vscode-debugConsole-errorForeground);
				}
			</style>
		`);

		// Text output
		for (const text of output.textOutput) {
			if (text.trim()) {
				parts.push(`<div class="output">${this.escapeHtml(text)}</div>`);
			}
		}

		// Error output (stderr)
		for (const error of output.errorOutput) {
			if (error.trim()) {
				parts.push(`<div class="output stderr">${this.escapeHtml(error)}</div>`);
			}
		}

		// Plots
		for (const plot of output.plots) {
			// Determine image type from base64 data using magic bytes
			const mimeType = this.detectImageMimeType(plot);
			parts.push(`<div><img class="plot" src="data:${mimeType};base64,${plot}" /></div>`);
		}

		// Execution error
		if (output.error) {
			parts.push(`<div class="output error">${this.escapeHtml(output.error)}</div>`);
		}

		return `<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body>
				${parts.join('\n')}
			</body>
			</html>`;
	}

	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * Detect image MIME type from base64-encoded data using magic bytes.
	 * Returns the detected MIME type, defaulting to PNG if unknown.
	 */
	private detectImageMimeType(base64Data: string): string {
		// Check first few characters of base64 data for known image signatures
		// PNG: starts with 'iVBORw0KGgo' (base64 of \x89PNG\r\n\x1a\n)
		// JPEG: starts with '/9j/' (base64 of \xFF\xD8\xFF)
		// GIF: starts with 'R0lGOD' (base64 of GIF89a or GIF87a)
		// WebP: starts with 'UklGR' (base64 of RIFF)
		// SVG: starts with 'PD94bW' (base64 of <?xml) or 'PHN2Zz' (base64 of <svg)

		if (base64Data.startsWith('iVBORw0KGgo')) {
			return 'image/png';
		}
		if (base64Data.startsWith('/9j/')) {
			return 'image/jpeg';
		}
		if (base64Data.startsWith('R0lGOD')) {
			return 'image/gif';
		}
		if (base64Data.startsWith('UklGR')) {
			return 'image/webp';
		}
		if (base64Data.startsWith('PD94bW') || base64Data.startsWith('PHN2Zz')) {
			return 'image/svg+xml';
		}

		// Default to PNG for unknown formats
		return 'image/png';
	}

	public dispose(): void {
		this.clearAllOutputs();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
	}
}

// Singleton instance
let inlineOutputManager: InlineOutputManager | undefined;

/**
 * Get or create the singleton InlineOutputManager instance.
 */
export function getInlineOutputManager(): InlineOutputManager {
	if (!inlineOutputManager) {
		inlineOutputManager = new InlineOutputManager();
	}
	return inlineOutputManager;
}

/**
 * Activate inline output functionality.
 */
export function activateInlineOutput(disposables: vscode.Disposable[]): void {
	disposables.push(getInlineOutputManager());
}
