/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { Application } from '../../../../../automation';
import { setupAndStartApp } from '../../../test-runner/test-hooks';
import { expect } from '@playwright/test';
const path = require('path');
const fs = require('fs-extra');


describe('Quarto #web', () => {
	setupAndStartApp();
	let app: Application;

	before(async function () {
		app = this.app as Application;
		await app.workbench.quickaccess.openFile(path.join(app.workspacePathOrFolder, 'workspaces', 'quarto_basic', 'quarto_basic.qmd'));
	});

	afterEach(async function () {
		await deleteGeneratedFiles(app);
	});

	it('should be able to render html [C842847]', async function () {
		await renderQuartoDocument(app, 'html');
		await verifyDocumentExists(app, 'html');
	});

	it('should be able to render docx [C842848]', async function () {
		await renderQuartoDocument(app, 'docx');
		await verifyDocumentExists(app, 'docx');
	});

	it('should be able to render pdf (LaTeX) [C842890]', async function () {
		await renderQuartoDocument(app, 'pdf');
		await verifyDocumentExists(app, 'pdf');
	});

	it('should be able to render pdf (typst) [C842889]', async function () {
		await renderQuartoDocument(app, 'typst');
		await verifyDocumentExists(app, 'pdf');
	});

	it('should be able to generate preview [C842891]', async function () {
		await app.workbench.quickaccess.runCommand('quarto.preview', { keepOpen: true });

		const previewHeader = app.workbench.positronViewer.getViewerFrame().frameLocator('iframe').locator('h1');
		await expect(previewHeader).toBeVisible({ timeout: 20000 });
		await expect(previewHeader).toHaveText('Diamond sizes');
	});
});


const renderQuartoDocument = async (app: Application, fileExtension: string) => {
	await app.workbench.quickaccess.runCommand('quarto.render.document', { keepOpen: true });
	await app.workbench.quickinput.selectQuickInputElementContaining(fileExtension);
};

const verifyDocumentExists = async (app: Application, fileExtension: string) => {
	await expect(async () => {
		await app.workbench.terminal.waitForTerminalText(buffer => buffer.some(line => line.includes(`Output created: quarto_basic.${fileExtension}`)));
		expect(await fileExists(app, `quarto_basic.${fileExtension}`)).toBe(true);
	}).toPass();
};

const deleteGeneratedFiles = async (app: Application) => {
	const files = ['quarto_basic.pdf', 'quarto_basic.html', 'quarto_basic.docx'];

	for (const file of files) {
		const filePath = path.join(app.workspacePathOrFolder, 'workspaces', 'quarto_basic', file);
		if (await fs.pathExists(filePath)) {
			await fs.remove(filePath);
		}
	}
};

const fileExists = (app: Application, file: String) => {
	const filePath = path.join(app.workspacePathOrFolder, 'workspaces', 'quarto_basic', file);
	return fs.pathExists(filePath);
};
