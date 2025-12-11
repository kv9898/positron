/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Example Quarto Notebook Serializer
 * 
 * This is a simplified example that demonstrates how to register a custom notebook type
 * with Positron notebooks. A production implementation would need to:
 * 
 * 1. Parse QMD YAML frontmatter for notebook metadata
 * 2. Parse code chunks (```{language} ... ```) into code cells
 * 3. Parse markdown sections into markdown cells
 * 4. Handle chunk options (e.g., #| label: fig-plot)
 * 5. Serialize notebook data back to QMD format
 * 
 * For a complete QMD/Quarto implementation, see the Quarto extension.
 */
export class QuartoNotebookSerializer implements vscode.NotebookSerializer {
	
	/**
	 * Deserialize a QMD file into notebook data
	 */
	async deserializeNotebook(
		content: Uint8Array,
		_token: vscode.CancellationToken
	): Promise<vscode.NotebookData> {
		const contentStr = new TextDecoder().decode(content);
		
		// Simple parser - in production, use a proper QMD parser
		const cells: vscode.NotebookCellData[] = [];
		
		// Split by code chunks: ```{language}...```
		const chunkRegex = /```\{(\w+)\}([\s\S]*?)```/g;
		let lastIndex = 0;
		let match;
		
		while ((match = chunkRegex.exec(contentStr)) !== null) {
			// Add markdown cell for content before this chunk
			if (match.index > lastIndex) {
				const markdownContent = contentStr.substring(lastIndex, match.index).trim();
				if (markdownContent) {
					cells.push(new vscode.NotebookCellData(
						vscode.NotebookCellKind.Markup,
						markdownContent,
						'markdown'
					));
				}
			}
			
			// Add code cell for this chunk
			const language = match[1].toLowerCase();
			const code = match[2].trim();
			cells.push(new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				code,
				language === 'r' ? 'r' : language === 'python' ? 'python' : language
			));
			
			lastIndex = chunkRegex.lastIndex;
		}
		
		// Add remaining content as markdown
		if (lastIndex < contentStr.length) {
			const markdownContent = contentStr.substring(lastIndex).trim();
			if (markdownContent) {
				cells.push(new vscode.NotebookCellData(
					vscode.NotebookCellKind.Markup,
					markdownContent,
					'markdown'
				));
			}
		}
		
		return new vscode.NotebookData(cells);
	}
	
	/**
	 * Serialize notebook data back to QMD format
	 */
	async serializeNotebook(
		data: vscode.NotebookData,
		_token: vscode.CancellationToken
	): Promise<Uint8Array> {
		let qmdContent = '';
		
		for (const cell of data.cells) {
			if (cell.kind === vscode.NotebookCellKind.Code) {
				// Add code chunk
				qmdContent += `\`\`\`{${cell.languageId}}\n`;
				qmdContent += cell.value;
				qmdContent += '\n```\n\n';
			} else {
				// Add markdown cell
				qmdContent += cell.value;
				qmdContent += '\n\n';
			}
		}
		
		return new TextEncoder().encode(qmdContent.trim() + '\n');
	}
}

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
	// Register the Quarto notebook serializer
	// This makes Positron Notebooks available as an editor for .qmd files
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			'quarto-notebook',
			new QuartoNotebookSerializer(),
			{
				// Don't save outputs - Quarto regenerates them on render
				transientOutputs: true,
				// Don't save execution counts
				transientCellMetadata: {
					executionCount: true
				}
			}
		)
	);
}

/**
 * Deactivate the extension
 */
export function deactivate() {
	// Nothing to clean up
}
