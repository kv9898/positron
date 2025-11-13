/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { QmdRmdSerializer } from './serializer';

export function activate(context: vscode.ExtensionContext) {
	const serializer = new QmdRmdSerializer();
	
	// Register serializer for Quarto (.qmd) files
	const quartoOptions: vscode.NotebookDocumentContentOptions = {
		transientOutputs: false,
		transientCellMetadata: {
			breakpointMargin: true,
		}
	};
	
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			'quarto-notebook',
			serializer,
			quartoOptions
		)
	);
	
	// Register serializer for RMarkdown (.rmd, .Rmd) files
	const rmdOptions: vscode.NotebookDocumentContentOptions = {
		transientOutputs: false,
		transientCellMetadata: {
			breakpointMargin: true,
		}
	};
	
	context.subscriptions.push(
		vscode.workspace.registerNotebookSerializer(
			'rmarkdown-notebook',
			serializer,
			rmdOptions
		)
	);
}

export function deactivate() { }
