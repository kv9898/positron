/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Parser for Quarto (.qmd) and RMarkdown (.rmd) files
 */
export class QmdRmdParser {
	/**
	 * Regular expressions for detecting code chunks
	 * Quarto/RMarkdown format: ```{language} ... ```
	 * Or RMarkdown format: ```{r} ... ```
	 */
	private static readonly CHUNK_START_REGEX = /^```+\{([^}]+)\}(.*)$/;
	private static readonly CHUNK_END_REGEX = /^```+\s*$/;
	private static readonly YAML_START_REGEX = /^---\s*$/;

	/**
	 * Parse a Quarto or RMarkdown file into NotebookData
	 */
	public static parse(content: string): vscode.NotebookData {
		const lines = content.split('\n');
		const cells: vscode.NotebookCellData[] = [];
		
		let i = 0;
		let yamlLines: string[] = [];
		
		// Check for YAML front matter
		if (lines.length > 0 && this.YAML_START_REGEX.test(lines[0])) {
			yamlLines.push(lines[0]);
			i = 1;
			
			// Collect YAML header until the closing ---
			while (i < lines.length) {
				yamlLines.push(lines[i]);
				if (this.YAML_START_REGEX.test(lines[i]) && i > 0) {
					i++;
					break;
				}
				i++;
			}
		}

		let currentMarkdown: string[] = [];
		
		while (i < lines.length) {
			const line = lines[i];
			const chunkStartMatch = line.match(this.CHUNK_START_REGEX);
			
			if (chunkStartMatch) {
				// Save any accumulated markdown as a cell
				if (currentMarkdown.length > 0) {
					const markdownText = currentMarkdown.join('\n');
					if (markdownText.trim()) {
						cells.push(new vscode.NotebookCellData(
							vscode.NotebookCellKind.Markup,
							markdownText,
							'markdown'
						));
					}
					currentMarkdown = [];
				}
				
				// Parse code chunk
				const chunkHeader = chunkStartMatch[1];
				const chunkOptions = chunkStartMatch[2];
				const language = this.extractLanguage(chunkHeader);
				const codeLines: string[] = [];
				
				i++; // Move past the chunk start line
				
				// Collect code until chunk end
				while (i < lines.length && !this.CHUNK_END_REGEX.test(lines[i])) {
					codeLines.push(lines[i]);
					i++;
				}
				
				// Create code cell
				const codeText = codeLines.join('\n');
				const codeCell = new vscode.NotebookCellData(
					vscode.NotebookCellKind.Code,
					codeText,
					language
				);
				
				// Store chunk options in metadata
				codeCell.metadata = {
					chunkHeader: chunkHeader,
					chunkOptions: chunkOptions.trim()
				};
				
				cells.push(codeCell);
				
				if (i < lines.length && this.CHUNK_END_REGEX.test(lines[i])) {
					i++; // Move past the chunk end line
				}
			} else {
				// Accumulate markdown
				currentMarkdown.push(line);
				i++;
			}
		}
		
		// Add any remaining markdown
		if (currentMarkdown.length > 0) {
			const markdownText = currentMarkdown.join('\n');
			if (markdownText.trim()) {
				cells.push(new vscode.NotebookCellData(
					vscode.NotebookCellKind.Markup,
					markdownText,
					'markdown'
				));
			}
		}
		
		// Create notebook data
		const notebookData = new vscode.NotebookData(cells);
		
		// Store YAML front matter in metadata
		if (yamlLines.length > 0) {
			notebookData.metadata = {
				frontMatter: yamlLines.join('\n')
			};
		}
		
		return notebookData;
	}
	
	/**
	 * Serialize NotebookData back to Quarto/RMarkdown format
	 */
	public static serialize(data: vscode.NotebookData): string {
		const lines: string[] = [];
		
		// Add YAML front matter if present
		if (data.metadata?.frontMatter) {
			lines.push(data.metadata.frontMatter);
			// Add blank line after YAML front matter
			if (data.cells.length > 0) {
				lines.push('');
			}
		}
		
		// Serialize each cell
		for (let i = 0; i < data.cells.length; i++) {
			const cell = data.cells[i];
			
			// Add blank line before each cell except when first cell comes right after YAML front matter
			if (i > 0 || !data.metadata?.frontMatter) {
				lines.push('');
			}
			
			if (cell.kind === vscode.NotebookCellKind.Markup) {
				// Add markdown cell
				lines.push(cell.value);
			} else if (cell.kind === vscode.NotebookCellKind.Code) {
				// Add code chunk
				const language = cell.languageId || 'r';
				const chunkHeader = cell.metadata?.chunkHeader || language;
				const chunkOptions = cell.metadata?.chunkOptions || '';
				
				lines.push(`\`\`\`{${chunkHeader}}${chunkOptions ? ' ' + chunkOptions : ''}`);
				lines.push(cell.value);
				lines.push('```');
			}
		}
		
		return lines.join('\n');
	}
	
	/**
	 * Extract language from chunk header
	 * Examples: "r", "python", "r label", "python label='name'"
	 */
	private static extractLanguage(chunkHeader: string): string {
		const parts = chunkHeader.trim().split(/[\s,]+/);
		const lang = parts[0].toLowerCase();
		
		// Map common language identifiers
		const languageMap: { [key: string]: string } = {
			'r': 'r',
			'python': 'python',
			'py': 'python',
			'julia': 'julia',
			'bash': 'bash',
			'sh': 'bash',
			'sql': 'sql',
			'javascript': 'javascript',
			'js': 'javascript',
			'typescript': 'typescript',
			'ts': 'typescript',
		};
		
		return languageMap[lang] || 'plaintext';
	}
}
