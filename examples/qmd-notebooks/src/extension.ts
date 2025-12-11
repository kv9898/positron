import * as vscode from 'vscode';
import { QmdNotebookSerializer } from './qmdSerializer';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('QMD Notebooks extension is activating...');

	// Create and register the QMD notebook serializer
	const serializer = new QmdNotebookSerializer();
	const serializerRegistration = vscode.workspace.registerNotebookSerializer(
		'quarto-notebook', // Must match the type in package.json
		serializer,
		{
			transientOutputs: false, // Preserve outputs when saving
			transientCellMetadata: {
				// Cell metadata that should not be saved
				executionCount: false, // Save execution count
				runStartTime: true,    // Don't save run start times
				runEndTime: true,      // Don't save run end times
			},
			transientDocumentMetadata: {
				// Document metadata that should not be saved
			}
		}
	);
	context.subscriptions.push(serializerRegistration);

	// Register command to create a new QMD notebook
	const newQmdCommand = vscode.commands.registerCommand('qmdNotebooks.newQmd', async () => {
		// Create a new untitled QMD notebook
		const language = 'r'; // Default to R, could be configurable
		
		// Create initial cell
		const cell = new vscode.NotebookCellData(
			vscode.NotebookCellKind.Code,
			'',
			language
		);
		
		// Create notebook data with YAML frontmatter as first cell
		const yamlCell = new vscode.NotebookCellData(
			vscode.NotebookCellKind.Markup,
			'---\ntitle: "Untitled"\nformat: html\n---\n',
			'markdown'
		);
		
		const data = new vscode.NotebookData([yamlCell, cell]);
		data.metadata = {
			custom: {
				qmdFormat: true
			}
		};
		
		// Open the notebook
		const doc = await vscode.workspace.openNotebookDocument('quarto-notebook', data);
		await vscode.window.showNotebookDocument(doc);
	});
	context.subscriptions.push(newQmdCommand);

	console.log('QMD Notebooks extension activated successfully!');
}

/**
 * Extension deactivation function
 */
export function deactivate() {
	console.log('QMD Notebooks extension is deactivating...');
}
