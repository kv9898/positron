/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'path';
import { test, expect, tags } from '../_test.setup';

test.use({
	suiteId: __filename
});

test.describe('Top Action Bar - Save Actions', {
	tag: [tags.WEB, tags.TOP_ACTION_BAR]
}, () => {

	test.beforeAll(async function ({ app, settings }) {
		if (app.web) {
			await settings.set({ 'files.autoSave': false });
		}
	});

	test.afterAll(async function ({ cleanup }) {
		await cleanup.discardAllChanges();
	});

	test('Verify `Save` and `Save All` are disabled when no unsaved editors are open', async function ({ app }) {
		await app.workbench.quickaccess.runCommand('workbench.action.closeAllEditors', { keepOpen: false });
		await expect(app.workbench.topActionBar.saveButton).not.toBeEnabled();
		await expect(app.workbench.topActionBar.saveAllButton).not.toBeEnabled();
	});

	test('Verify `Save` enabled and `Save All` disabled when a single unsaved file is open', async function ({ app }) {
		const fileName = 'README.md';
		await app.workbench.quickaccess.runCommand('workbench.action.closeAllEditors', { keepOpen: false });
		await app.workbench.quickaccess.openFile(join(app.workspacePathOrFolder, fileName));
		await app.workbench.quickaccess.runCommand('workbench.action.keepEditor', { keepOpen: false });
		await app.workbench.editor.selectTabAndType(fileName, 'Puppies frolicking in a meadow of wildflowers');

		// The file is now "dirty" and the save buttons should be enabled
		await expect(app.workbench.topActionBar.saveButton).toBeEnabled();
		await expect(app.workbench.topActionBar.saveAllButton).toBeEnabled();
		await app.workbench.topActionBar.saveButton.click();

		// The file is now saved, so the file should no longer be "dirty"
		// The Save button stays enabled even when the active file is not "dirty"
		await expect(app.workbench.topActionBar.saveButton).toBeEnabled();
		// The Save All button is disabled when less than 2 files are "dirty"
		await expect(app.workbench.topActionBar.saveAllButton).not.toBeEnabled();
	});

	test('Verify `Save` and `Save All` are enabled when multiple unsaved files are open', async function ({ app }) {
		const fileName1 = 'README.md';
		const fileName2 = 'DESCRIPTION';
		const text = 'Kittens playing with yarn';

		// Open two files and type in some text
		await app.workbench.quickaccess.runCommand('workbench.action.closeAllEditors', { keepOpen: false });
		await app.workbench.quickaccess.openFile(join(app.workspacePathOrFolder, fileName1));
		await app.workbench.quickaccess.runCommand('workbench.action.keepEditor', { keepOpen: false });
		await app.workbench.quickaccess.openFile(join(app.workspacePathOrFolder, fileName2));
		await app.workbench.quickaccess.runCommand('workbench.action.keepEditor', { keepOpen: false });
		await app.workbench.editor.selectTabAndType(fileName1, text);
		await app.workbench.editor.selectTabAndType(fileName2, text);

		// The files are now "dirty" and the save buttons should be enabled
		await expect(app.workbench.topActionBar.saveButton).toBeEnabled();
		await expect(app.workbench.topActionBar.saveAllButton).toBeEnabled();
		await app.workbench.topActionBar.saveAllButton.click();

		// The files are now saved, so the files should no longer be "dirty"
		await app.workbench.editors.waitForTab(fileName1, false);
		await app.workbench.editors.waitForTab(fileName2, false);

		// The Save button stays enabled even when the active file is not "dirty"
		await expect(app.workbench.topActionBar.saveButton).toBeEnabled();
		// The Save All button is disabled when less than 2 files are "dirty"
		await expect(app.workbench.topActionBar.saveAllButton).not.toBeEnabled();
	});

	test('Verify `Save` and `Save All` are enabled when an unsaved new file is open', async function ({ app }) {
		const fileName = 'Untitled-1';
		const text = 'Bunnies hopping through a field of clover';

		// Open a new file and type in some text
		await app.workbench.quickaccess.runCommand('workbench.action.closeAllEditors', { keepOpen: false });
		await app.workbench.quickaccess.runCommand('workbench.action.files.newUntitledFile', { keepOpen: false });
		await app.workbench.editor.selectTabAndType(fileName, text);

		// The file is now "dirty" and the save buttons should be enabled
		await expect(app.workbench.topActionBar.saveButton).toBeEnabled();
		await expect(app.workbench.topActionBar.saveAllButton).toBeEnabled();
		// We won't try to click the Save buttons because a system dialog will pop up and we
		// can't automate interactions with the native file dialog
	});
});

