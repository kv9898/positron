/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { QmdRmdParser } from './parser';

/**
 * Notebook serializer for Quarto and RMarkdown files
 */
export class QmdRmdSerializer implements vscode.NotebookSerializer {
	
	async deserializeNotebook(
		content: Uint8Array,
		_token: vscode.CancellationToken
	): Promise<vscode.NotebookData> {
		const text = new TextDecoder().decode(content);
		return QmdRmdParser.parse(text);
	}
	
	async serializeNotebook(
		data: vscode.NotebookData,
		_token: vscode.CancellationToken
	): Promise<Uint8Array> {
		const text = QmdRmdParser.serialize(data);
		return new TextEncoder().encode(text);
	}
}
