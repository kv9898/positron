import * as vscode from 'vscode';

/**
 * A simple notebook serializer for Quarto QMD files.
 * 
 * This is a basic implementation to demonstrate the concept. A production-ready
 * serializer would need more sophisticated parsing to handle:
 * - YAML frontmatter
 * - Cell options and metadata
 * - Various code block syntaxes
 * - Inline code and expressions
 * - Raw blocks
 */
export class QmdNotebookSerializer implements vscode.NotebookSerializer {

	/**
	 * Deserialize a QMD file into notebook data
	 */
	async deserializeNotebook(
		content: Uint8Array,
		_token: vscode.CancellationToken
	): Promise<vscode.NotebookData> {
		const contentStr = Buffer.from(content).toString('utf8');

		// Parse QMD content into cells
		const cells = this.parseQmdContent(contentStr);

		// Create notebook data
		const notebookData = new vscode.NotebookData(cells);

		// Set metadata
		notebookData.metadata = {
			custom: {
				qmdFormat: true,
				cells: [] // Maintain compatibility with ipynb format
			}
		};

		return notebookData;
	}

	/**
	 * Serialize notebook data back to QMD format
	 */
	async serializeNotebook(
		data: vscode.NotebookData,
		_token: vscode.CancellationToken
	): Promise<Uint8Array> {
		// Convert cells back to QMD format
		const qmdContent = this.convertToQmd(data.cells);

		return Buffer.from(qmdContent, 'utf8');
	}

	/**
	 * Parse QMD content into notebook cells
	 */
	private parseQmdContent(content: string): vscode.NotebookCellData[] {
		const cells: vscode.NotebookCellData[] = [];

		// Regular expression to match code blocks: ```{language options}...```
		const codeBlockRegex = /```\{([^}]+)\}([\s\S]*?)```/g;
		let lastIndex = 0;
		let match;

		while ((match = codeBlockRegex.exec(content)) !== null) {
			// Add markdown cell for content before code block
			const beforeText = content.slice(lastIndex, match.index).trim();
			if (beforeText) {
				cells.push(new vscode.NotebookCellData(
					vscode.NotebookCellKind.Markup,
					beforeText,
					'markdown'
				));
			}

			// Parse code block
			const blockHeader = match[1]; // e.g., "r" or "python, echo=FALSE"
			const code = match[2].trim();

			// Extract language and options
			const { language, metadata } = this.parseBlockHeader(blockHeader);

			// Create code cell
			const codeCell = new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				code,
				language
			);

			// Add metadata if present
			if (Object.keys(metadata).length > 0) {
				codeCell.metadata = metadata;
			}

			cells.push(codeCell);

			lastIndex = match.index + match[0].length;
		}

		// Add any remaining content as markdown
		const remainingText = content.slice(lastIndex).trim();
		if (remainingText) {
			cells.push(new vscode.NotebookCellData(
				vscode.NotebookCellKind.Markup,
				remainingText,
				'markdown'
			));
		}

		// If no cells were created, add an empty code cell
		if (cells.length === 0) {
			cells.push(new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				'',
				'r' // Default to R
			));
		}

		return cells;
	}

	/**
	 * Parse code block header to extract language and options
	 * Example: "r, echo=FALSE, warning=FALSE" -> { language: "r", metadata: { echo: false, warning: false } }
	 */
	private parseBlockHeader(header: string): { language: string; metadata: Record<string, any> } {
		const parts = header.split(',').map(s => s.trim());
		const language = parts[0].toLowerCase() || 'r';
		const metadata: Record<string, any> = {};

		// Parse options (simple key=value pairs)
		for (let i = 1; i < parts.length; i++) {
			const optionMatch = parts[i].match(/^([^=]+)=(.+)$/);
			if (optionMatch) {
				const key = optionMatch[1].trim();
				let value: any = optionMatch[2].trim();

				// Convert string booleans to actual booleans
				if (value.toLowerCase() === 'true') {
					value = true;
				} else if (value.toLowerCase() === 'false') {
					value = false;
				}
				// Remove quotes from strings
				else if ((value.startsWith('"') && value.endsWith('"')) ||
					(value.startsWith("'") && value.endsWith("'"))) {
					value = value.slice(1, -1);
				}

				metadata[key] = value;
			}
		}

		return { language, metadata };
	}

	/**
	 * Convert notebook cells to QMD format
	 */
	private convertToQmd(cells: readonly vscode.NotebookCellData[]): string {
		let qmdContent = '';

		for (const cell of cells) {
			if (cell.kind === vscode.NotebookCellKind.Markup) {
				// Markdown cell
				qmdContent += cell.value;
				if (!qmdContent.endsWith('\n')) {
					qmdContent += '\n';
				}
				qmdContent += '\n';
			} else {
				// Code cell
				const language = cell.languageId || 'r';
				const metadata = cell.metadata || {};

				// Build block header
				let blockHeader = language;

				// Add metadata as options
				const metadataKeys = Object.keys(metadata).filter(k => k !== 'custom');
				if (metadataKeys.length > 0) {
					const options = metadataKeys.map(key => {
						const value = metadata[key];
						if (typeof value === 'boolean') {
							return `${key}=${value.toString().toUpperCase()}`;
						} else if (typeof value === 'string') {
							return `${key}="${value}"`;
						} else {
							return `${key}=${value}`;
						}
					});
					blockHeader += ', ' + options.join(', ');
				}

				qmdContent += '```{' + blockHeader + '}\n';
				qmdContent += cell.value;
				if (!cell.value.endsWith('\n')) {
					qmdContent += '\n';
				}
				qmdContent += '```\n\n';
			}
		}

		return qmdContent;
	}
}
