/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { refreshTestthatStatus } from './testing/watcher';

export async function setContexts(_context: vscode.ExtensionContext): Promise<void> {
	const isRPackage = await detectRPackage();
	vscode.commands.executeCommand('setContext', 'isRPackage', isRPackage);
	
	const hasTestthat = await detectTestthat();
	const isRProject = isRPackage || hasTestthat;
	vscode.commands.executeCommand('setContext', 'isRProject', isRProject);

	await refreshTestthatStatus();
}

export async function detectRPackage(): Promise<boolean> {
	const descriptionLines = await parseRPackageDescription();
	const packageLines = descriptionLines.filter(line => line.startsWith('Package:'));
	const typeLines = descriptionLines.filter(line => line.startsWith('Type:'));
	const typeIsPackage = (typeLines.length > 0
		? typeLines[0].toLowerCase().includes('package')
		: false);
	const typeIsPackageOrMissing = typeLines.length === 0 || typeIsPackage;
	return packageLines.length > 0 && typeIsPackageOrMissing;
}

export async function getRPackageName(): Promise<string> {
	const descriptionLines = await parseRPackageDescription();
	const packageLines = descriptionLines.filter(line => line.startsWith('Package:'))[0];
	const packageName = packageLines.split(' ').slice(-1)[0];
	return packageName;
}

export async function detectTestthat(): Promise<boolean> {
	// Check if the workspace has a tests/testthat directory structure
	if (vscode.workspace.workspaceFolders !== undefined) {
		const folderUri = vscode.workspace.workspaceFolders[0].uri;
		const testthatDotRPattern = 'tests/testthat.[Rr]';
		const pattern = new vscode.RelativePattern(folderUri, testthatDotRPattern);
		const testthatDotR = await vscode.workspace.findFiles(pattern, null, 1);
		return testthatDotR.length > 0;
	}
	return false;
}

async function parseRPackageDescription(): Promise<string[]> {
	if (vscode.workspace.workspaceFolders !== undefined) {
		const folderUri = vscode.workspace.workspaceFolders[0].uri;
		const fileUri = vscode.Uri.joinPath(folderUri, 'DESCRIPTION');
		try {
			const bytes = await vscode.workspace.fs.readFile(fileUri);
			const descriptionText = Buffer.from(bytes).toString('utf8');
			const descriptionLines = descriptionText.split(/(\r?\n)/);
			return descriptionLines;
		} catch { }
	}
	return [''];
}
