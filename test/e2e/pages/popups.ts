/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024-2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/


import { expect, Locator } from '@playwright/test';
import { Code } from '../infra/code';

const POSITRON_MODAL_DIALOG_BOX = '.positron-modal-dialog-box';
const POSITRON_MODAL_DIALOG_BOX_OK = '.positron-modal-dialog-box .ok-cancel-action-bar .positron-button.action-bar-button.default';
const POSITRON_MODAL_DIALOG_BOX_CANCEL = '.positron-modal-dialog-box .ok-cancel-action-bar .positron-button.action-bar-button:not(.default)';
const POSITRON_MODAL_DIALOG_BOX_TITLE = '.positron-modal-dialog-box .simple-title-bar-title';
const POSITRON_MODAL_DIALOG_POPUP_OPTION = '.positron-modal-popup .positron-modal-popup-children';
const POSITRON_MODAL_DIALOG_DELETE = '.positron-modal-dialog-box .action-bar-button.default';
const NOTIFICATION_TOAST = '.notification-toast';

/*
 *  Reuseable Positron popups functionality for tests to leverage.
 */
export class Popups {

	public toastLocator = this.code.driver.page.locator(NOTIFICATION_TOAST);
	public importButton = this.toastLocator.getByRole('button', { name: 'Compare settings' });
	public laterButton = this.toastLocator.getByRole('button', { name: 'Later' });
	public doNotShowAgainButton = this.toastLocator.getByRole('button', { name: 'Don\'t Show Again' });
	public acceptButton = this.toastLocator.getByRole('button', { name: 'Accept' });
	public rejectButton = this.toastLocator.getByRole('button', { name: 'Reject' });

	constructor(private code: Code) { }

	async popupCurrentlyOpen() {
		try {
			await expect(this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX)).toBeVisible();
			return true;
		} catch (error) {
			this.code.logger.log('No modal dialog box found');
		}
	}

	async acceptModalDialog() {
		try {
			this.code.logger.log('Checking for modal dialog box');
			// fail fast if the modal is not present
			await expect(this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX)).toBeVisible();
			await this.code.driver.page.locator(POSITRON_MODAL_DIALOG_DELETE).click();
		} catch {
			this.code.logger.log('Did not find modal dialog box');
		}
	}

	async confirmDeleteModalDialog() {
		try {
			this.code.logger.log('Checking for confirm delete modal dialog box');
			// fail fast if the modal is not present
			await expect(this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX)).toBeVisible();
			await this.code.driver.page.locator(POSITRON_MODAL_DIALOG_DELETE).click();
		} catch {
			this.code.logger.log('Did not find confirm delete modal dialog box');
		}
	}

	async installIPyKernel() {

		try {
			this.code.logger.log('Checking for modal dialog box');
			// fail fast if the modal is not present
			await expect(this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX)).toBeVisible();
			await this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX_OK).click();
			this.code.logger.log('Installing ipykernel');
			await this.waitForToastToAppear();
			await this.waitForToastToDisappear();
			this.code.logger.log('Installed ipykernel');
			// after toast disappears console may not yet be refreshed (still on old interpreter)
			// TODO: make this smart later, perhaps by getting the console state from the API
			await this.code.wait(5000);
		} catch {
			this.code.logger.log('Did not find modal dialog box for ipykernel install');
		}
	}

	/**
	 * Interacts with the Renv install modal dialog box. This dialog box appears when a user opts to
	 * use Renv in the New Folder Flow and creates a new folder, but Renv is not installed.
	 * @param action The action to take on the modal dialog box. Either 'install' or 'cancel'.
	 */
	async installRenvModal(action: 'install' | 'cancel') {
		try {
			await expect(this.code.driver.page.locator('.simple-title-bar').filter({ hasText: 'Missing R package' })).toBeVisible({ timeout: 30000 });

			if (action === 'install') {
				this.code.logger.log('Install Renv modal detected: clicking `Install now`');
				await this.code.driver.page.getByRole('button', { name: 'Install now' }).click();
			} else if (action === 'cancel') {
				this.code.logger.log('Install Renv modal detected: clicking `Cancel`');
				await this.code.driver.page.getByRole('button', { name: 'Cancel', exact: true }).click();
			}
		} catch (error) {
			this.code.logger.log('No Renv modal detected');
			if (process.env.CI) {
				throw new Error('Renv modal not detected');
			}
		}
	}

	async waitForToastToDisappear() {
		this.code.logger.log('Waiting for toast to be detacted');
		await this.toastLocator.waitFor({ state: 'detached', timeout: 20000 });
	}

	async waitForToastToAppear() {
		this.code.logger.log('Waiting for toast to be attached');
		await this.toastLocator.waitFor({ state: 'attached', timeout: 20000 });
	}

	async verifyToastDoesNotAppear(timeoutMs: number = 3000): Promise<void> {
		const endTime = Date.now() + timeoutMs;

		while (Date.now() < endTime) {
			const count = await this.toastLocator.count();
			if (count > 0) {
				throw new Error('Toast appeared unexpectedly');
			}

			await this.code.driver.page.waitForTimeout(1000);
		}

		this.code.logger.log('Verified: Toast did not appear');
	}

	async closeAllToasts() {
		const count = await this.toastLocator.count();
		this.code.logger.log(`Closing ${count} toasts`);
		for (let i = 0; i < count; i++) {
			try {
				await this.toastLocator.nth(i).hover();
				await this.code.driver.page.locator(`${NOTIFICATION_TOAST} .codicon-notifications-clear`).nth(i).click();
			} catch (error) { // toasts can auto close before we get to them
				this.code.logger.log(`Failed to close toast ${i}`);
			}
		}
	}

	// To implement in a test, use await app.workbench.popups.closeSpecificToast('messageText');
	async closeSpecificToast(messageText: string) {
		this.code.logger.log(`Closing specific toast with message: ${messageText}`);
		try {
			const toast = this.toastLocator.filter({ hasText: messageText });
			// await toast.waitFor({ state: 'visible'});
			await toast.hover();
			await this.code.driver.page.locator(`${NOTIFICATION_TOAST} .codicon-notifications-clear`).click();
			this.code.logger.log(`Closed toast containing: ${messageText}`);
		} catch (error) {
			this.code.logger.log('Toast not found or already closed');
		}
	}

	async waitForModalDialogBox() {
		await expect(this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX)).toBeVisible({ timeout: 30000 });
	}

	async waitForModalDialogBoxToDisappear() {
		await expect(this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX)).not.toBeVisible({ timeout: 30000 });
	}

	async clickOkOnModalDialogBox() {
		await this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX_OK).click();
	}

	async clickCancelOnModalDialogBox() {
		await this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX_CANCEL).click();
	}

	/**
	 * Can be called after a DropDownListBox is clicked. Selects the option with the given label.
	 * @param label The label of the option to select.
	 */
	async clickOnModalDialogPopupOption(label: string | RegExp) {
		const el = this.code.driver.page.locator(POSITRON_MODAL_DIALOG_POPUP_OPTION).getByText(label);
		await el.click();
	}

	/**
	 * Waits for the modal dialog box title to match the given title.
	 * @param title The title to wait for.
	 */
	async waitForModalDialogTitle(title: string) {
		await expect(async () => {
			const textContent = await this.code.driver.page.locator(POSITRON_MODAL_DIALOG_BOX_TITLE).textContent();
			expect(textContent).toContain(title);
		}).toPass({ timeout: 10000 });
	}

	/**
	 * Right clicks and selects a menu item, waiting for menu dismissal.
	 * @param locator Where to right click to get a context menu
	 * @param action Which action to perform on the context menu
	 */
	async handleContextMenu(locator: Locator, action: 'Select All' | 'Copy' | 'Paste') {
		await locator.click({ button: 'right' });
		const menu = this.code.driver.page.locator('.monaco-menu');

		// dismissing dialog can be erratic, allow retries
		for (let i = 0; i < 4; i++) {
			try {
				await menu.locator(`[aria-label="${action}"]`).click();
				await expect(menu).toBeHidden({ timeout: 2000 });
				break;
			} catch {
			}
		}
	}

	/**
	 * Checks if the import prompt is visible or not visible based on the parameter.
	 * @param shouldBeVisible Optional parameter to check if the prompt should be visible or not. Defaults to true.
	 */
	async expectImportPromptToBeVisible(shouldBeVisible: boolean = true) {
		if (shouldBeVisible) {
			await expect(this.importButton).toBeVisible();
			await expect(this.laterButton).toBeVisible();
			await expect(this.doNotShowAgainButton).toBeVisible();
		} else {
			await expect(this.importButton).not.toBeVisible();
			await expect(this.laterButton).not.toBeVisible();
			await expect(this.doNotShowAgainButton).not.toBeVisible();
		}
	}
}
