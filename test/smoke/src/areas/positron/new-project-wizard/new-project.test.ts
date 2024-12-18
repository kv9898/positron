/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from '@playwright/test';
import { Application, PositronPythonFixtures, ProjectType, ProjectWizardNavigateAction } from '../../../../../automation';
import { setupAndStartApp } from '../../../test-runner/test-hooks';

describe('New Project Wizard', () => {
	setupAndStartApp();

	describe('Python - New Project Wizard', () => {
		const defaultProjectName = 'my-python-project';

		describe('Python Project with new environment', () => {
			it('Create a new Venv environment [C627912] #pr', async function () {
				// This is the default behaviour for a new Python Project in the Project Wizard
				const app = this.app as Application;
				const pw = app.workbench.positronNewProjectWizard;
				await pw.startNewProject(ProjectType.PYTHON_PROJECT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.navigate(ProjectWizardNavigateAction.CREATE);
				await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
				await app.workbench.positronExplorer.explorerProjectTitle.waitForText(defaultProjectName);
				await app.workbench.positronConsole.waitForReady('>>>', 10000);
				await app.workbench.quickaccess.runCommand('workbench.action.toggleAuxiliaryBar');
				await app.workbench.positronConsole.barClearButton.click();
				await app.workbench.quickaccess.runCommand('workbench.action.toggleAuxiliaryBar');
			});
			it('Create a new Conda environment [C628628]', async function () {
				// This test relies on Conda already being installed on the machine
				this.timeout(180000);

				const projSuffix = addRandomNumSuffix('_condaInstalled');
				const app = this.app as Application;
				const pw = app.workbench.positronNewProjectWizard;
				await pw.startNewProject(ProjectType.PYTHON_PROJECT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.projectNameLocationStep.appendToProjectName(projSuffix);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				// Select 'Conda' as the environment provider
				await pw.pythonConfigurationStep.selectEnvProvider('Conda');
				await pw.navigate(ProjectWizardNavigateAction.CREATE);
				await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
				await app.workbench.positronExplorer.explorerProjectTitle.waitForText(
					defaultProjectName + projSuffix
				);
				// Check that the `.conda` folder gets created in the project
				await expect(async () => {
					const projectFiles = await app.workbench.positronExplorer.getExplorerProjectFiles();
					expect(projectFiles).toContain('.conda');
				}).toPass({ timeout: 50000 });
				// The console should initialize without any prompts to install ipykernel
				await app.workbench.positronConsole.waitForReady('>>>', 40000);
				await app.workbench.quickaccess.runCommand('workbench.action.toggleAuxiliaryBar');
				await app.workbench.positronConsole.barClearButton.click();
				await app.workbench.quickaccess.runCommand('workbench.action.toggleAuxiliaryBar');
			});
		});

		describe('Python Project with existing interpreter', () => {
			it('With ipykernel already installed [C609619]', async function () {
				const projSuffix = addRandomNumSuffix('_ipykernelInstalled');
				const app = this.app as Application;
				const pw = app.workbench.positronNewProjectWizard;
				const pythonFixtures = new PositronPythonFixtures(app);
				// Start the Python interpreter and ensure ipykernel is installed
				await pythonFixtures.startAndGetPythonInterpreter(true);
				// Ensure the console is ready with the selected interpreter
				await app.workbench.positronConsole.waitForReady('>>>', 10000);
				const interpreterInfo =
					await app.workbench.positronInterpreterDropdown.getSelectedInterpreterInfo();
				expect(interpreterInfo?.path).toBeDefined();
				await app.workbench.positronInterpreterDropdown.closeInterpreterDropdown();
				// Create a new Python project and use the selected python interpreter
				await pw.startNewProject(ProjectType.PYTHON_PROJECT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.projectNameLocationStep.appendToProjectName(projSuffix);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.pythonConfigurationStep.existingEnvRadioButton.click();
				// Select the interpreter that was started above. It's possible that this needs
				// to be attempted a few times to ensure the interpreters are properly loaded.
				await expect(
					async () =>
						await pw.pythonConfigurationStep.selectInterpreterByPath(
							interpreterInfo!.path
						)
				).toPass({
					intervals: [1_000, 2_000, 10_000],
					timeout: 50_000
				});
				await expect(pw.pythonConfigurationStep.interpreterFeedback).not.toBeVisible();
				await pw.navigate(ProjectWizardNavigateAction.CREATE);
				await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
				await app.workbench.positronExplorer.explorerProjectTitle.waitForText(
					defaultProjectName + projSuffix
				);
				// The console should initialize without any prompts to install ipykernel
				await app.workbench.positronConsole.waitForReady('>>>', 10000);
			});

			it('With ipykernel not already installed [C609617]', async function () {
				const projSuffix = addRandomNumSuffix('_noIpykernel');
				const app = this.app as Application;
				const pw = app.workbench.positronNewProjectWizard;
				const pythonFixtures = new PositronPythonFixtures(app);
				// Start the Python interpreter and uninstall ipykernel
				await pythonFixtures.startAndGetPythonInterpreter(true);
				// Ensure the console is ready with the selected interpreter
				await app.workbench.positronConsole.waitForReady('>>>', 10000);
				const interpreterInfo =
					await app.workbench.positronInterpreterDropdown.getSelectedInterpreterInfo();
				expect(interpreterInfo?.path).toBeDefined();
				await app.workbench.positronInterpreterDropdown.closeInterpreterDropdown();
				await app.workbench.positronConsole.typeToConsole('pip uninstall -y ipykernel');
				await app.workbench.positronConsole.sendEnterKey();
				await app.workbench.positronConsole.waitForConsoleContents((contents) =>
					contents.some((line) => line.includes('Successfully uninstalled ipykernel'))
				);
				// Create a new Python project and use the selected python interpreter
				await pw.startNewProject(ProjectType.PYTHON_PROJECT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.projectNameLocationStep.appendToProjectName(projSuffix);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				// Choose the existing environment which does not have ipykernel
				await pw.pythonConfigurationStep.existingEnvRadioButton.click();
				// Select the interpreter that was started above. It's possible that this needs
				// to be attempted a few times to ensure the interpreters are properly loaded.
				await expect(
					async () =>
						await pw.pythonConfigurationStep.selectInterpreterByPath(
							interpreterInfo!.path
						)
				).toPass({
					intervals: [1_000, 2_000, 10_000],
					timeout: 50_000
				});
				await expect(pw.pythonConfigurationStep.interpreterFeedback).toHaveText(
					'ipykernel will be installed for Python language support.',
					{ timeout: 10_000 }
				);
				await pw.navigate(ProjectWizardNavigateAction.CREATE);
				await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
				await app.workbench.positronExplorer.explorerProjectTitle.waitForText(
					defaultProjectName + projSuffix
				);
				// If ipykernel was successfully installed during the new project initialization,
				// the console should be ready without any prompts to install ipykernel
				await app.workbench.positronConsole.waitForReady('>>>', 10000);
				await app.workbench.quickaccess.runCommand('workbench.action.toggleAuxiliaryBar');
				await app.workbench.positronConsole.barClearButton.click();
				await app.workbench.quickaccess.runCommand('workbench.action.toggleAuxiliaryBar');
			});
		});

		it('Default Python Project with git init [C674522] #pr #win', async function () {
			const projSuffix = addRandomNumSuffix('_gitInit');
			const app = this.app as Application;
			const pw = app.workbench.positronNewProjectWizard;
			await pw.startNewProject(ProjectType.PYTHON_PROJECT);
			await pw.navigate(ProjectWizardNavigateAction.NEXT);
			await pw.projectNameLocationStep.appendToProjectName(projSuffix);

			// Check the git init checkbox
			await pw.projectNameLocationStep.gitInitCheckbox.waitFor();
			await pw.projectNameLocationStep.gitInitCheckbox.setChecked(true);
			await pw.navigate(ProjectWizardNavigateAction.NEXT);
			await pw.navigate(ProjectWizardNavigateAction.CREATE);

			// Open the new project in the current window and wait for the console to be ready
			await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
			await app.workbench.positronExplorer.explorerProjectTitle.waitForText(
				defaultProjectName + projSuffix
			);
			await app.workbench.positronConsole.waitForReady('>>>', 10000);

			// Verify git-related files are present
			await expect(async () => {
				const projectFiles = await app.workbench.positronExplorer.getExplorerProjectFiles();
				expect(projectFiles).toContain('.gitignore');
				expect(projectFiles).toContain('README.md');
				// Ideally, we'd check for the .git folder, but it's not visible in the Explorer
				// by default due to the default `files.exclude` setting in the workspace.
			}).toPass({ timeout: 50000 });

			// Git status should show that we're on the main branch
			await app.workbench.terminal.createTerminal();
			await app.workbench.terminal.runCommandInTerminal('git status');
			await app.workbench.terminal.waitForTerminalText(buffer => buffer.some(e => e.includes('On branch main')));
		});
	});

	describe('R - New Project Wizard', () => {
		const defaultProjectName = 'my-r-project';

		it('R Project Defaults [C627913] #pr #win', async function () {
			const app = this.app as Application;
			const pw = app.workbench.positronNewProjectWizard;
			await pw.startNewProject(ProjectType.R_PROJECT);
			await pw.navigate(ProjectWizardNavigateAction.NEXT);
			await pw.navigate(ProjectWizardNavigateAction.NEXT);
			await pw.navigate(ProjectWizardNavigateAction.CREATE);
			await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
			await app.workbench.positronExplorer.explorerProjectTitle.waitForText(defaultProjectName);
			// NOTE: For completeness, we probably want to await app.workbench.positronConsole.waitForReady('>', 10000);
			// here, but it's timing out in CI, so it is not included for now.
		});

		describe('R Project with Renv Environment', () => {
			beforeEach(async function () {
				this.timeout(120000);
				const app = this.app as Application;
				await app.workbench.positronConsole.waitForReadyOrNoInterpreter();
			});

			it('Accept Renv install [C633084]', async function () {
				const projSuffix = addRandomNumSuffix('_installRenv');
				const app = this.app as Application;
				const pw = app.workbench.positronNewProjectWizard;
				// Create a new R project - select Renv and install
				await pw.startNewProject(ProjectType.R_PROJECT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.projectNameLocationStep.appendToProjectName(projSuffix);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				// Select the renv checkbox
				await pw.rConfigurationStep.renvCheckbox.click();
				await pw.navigate(ProjectWizardNavigateAction.CREATE);
				await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
				await app.workbench.positronExplorer.explorerProjectTitle.waitForText(
					defaultProjectName + projSuffix
				);
				// Interact with the modal to install renv
				await app.workbench.positronPopups.installRenv();

				// If this test is running on a machine that is using Renv for the first time, we
				// may need to interact with the Console to allow the renv installation to complete
				// An example: https://github.com/posit-dev/positron/pull/3881#issuecomment-2211123610.

				// You should either manually interact with the Console to proceed with the Renv
				// install or temporarily uncomment the code below to automate the interaction.
				// await app.workbench.positronConsole.waitForConsoleContents((contents) =>
				// 	contents.some((line) => line.includes('Do you want to proceed?'))
				// );
				// await app.workbench.positronConsole.typeToConsole('y');
				// await app.workbench.positronConsole.sendEnterKey();

				// Verify renv files are present
				await expect(async () => {
					const projectFiles = await app.workbench.positronExplorer.getExplorerProjectFiles();
					expect(projectFiles).toContain('renv');
					expect(projectFiles).toContain('.Rprofile');
					expect(projectFiles).toContain('renv.lock');
				}).toPass({ timeout: 50000 });
				// Verify that renv output in the console confirms no issues occurred
				await app.workbench.positronConsole.waitForConsoleContents((contents) =>
					contents.some((line) => line.includes('renv activated'))
				);
			});

			it('Renv already installed [C656251]', async function () {
				// Renv will already be installed from the previous test
				const projSuffix = addRandomNumSuffix('_renvAlreadyInstalled');
				const app = this.app as Application;
				const pw = app.workbench.positronNewProjectWizard;
				await pw.startNewProject(ProjectType.R_PROJECT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.projectNameLocationStep.appendToProjectName(projSuffix);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				// Select the renv checkbox
				await pw.rConfigurationStep.renvCheckbox.click();
				await pw.navigate(ProjectWizardNavigateAction.CREATE);
				await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
				await app.workbench.positronExplorer.explorerProjectTitle.waitForText(
					defaultProjectName + projSuffix
				);
				// Verify renv files are present
				await expect(async () => {
					const projectFiles = await app.workbench.positronExplorer.getExplorerProjectFiles();
					expect(projectFiles).toContain('renv');
					expect(projectFiles).toContain('.Rprofile');
					expect(projectFiles).toContain('renv.lock');
				}).toPass({ timeout: 50000 });
				// Verify that renv output in the console confirms no issues occurred
				await app.workbench.positronConsole.waitForConsoleContents((contents) =>
					contents.some((line) => line.includes('renv activated'))
				);
			});

			it('Cancel Renv install [C656252]', async function () {
				const projSuffix = addRandomNumSuffix('_cancelRenvInstall');
				const app = this.app as Application;
				const pw = app.workbench.positronNewProjectWizard;
				// Remove renv package so we are prompted to install it again
				await app.workbench.positronConsole.executeCode('R', 'remove.packages("renv")', '>');
				await app.workbench.positronConsole.waitForConsoleContents((contents) =>
					contents.some((line) => line.includes(`Removing package`))
				);
				// Create a new R project - select Renv but opt out of installing
				await pw.startNewProject(ProjectType.R_PROJECT);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				await pw.projectNameLocationStep.appendToProjectName(projSuffix);
				await pw.navigate(ProjectWizardNavigateAction.NEXT);
				// Select the renv checkbox
				await pw.rConfigurationStep.renvCheckbox.click();
				await pw.navigate(ProjectWizardNavigateAction.CREATE);
				await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
				await app.workbench.positronExplorer.explorerProjectTitle.waitForText(
					defaultProjectName + projSuffix
				);
				// Interact with the modal to skip installing renv
				await app.workbench.positronPopups.installRenv(false);
				// Verify renv files are **not** present
				await expect(async () => {
					const projectFiles = await app.workbench.positronExplorer.getExplorerProjectFiles();
					expect(projectFiles).not.toContain('renv');
					expect(projectFiles).not.toContain('.Rprofile');
					expect(projectFiles).not.toContain('renv.lock');
				}).toPass({ timeout: 50000 });
			});
		});
	});

	describe('Jupyter - New Project Wizard', () => {
		const defaultProjectName = 'my-jupyter-notebook';

		it('Jupyter Project Defaults [C629352] #pr', async function () {
			const app = this.app as Application;
			const pw = app.workbench.positronNewProjectWizard;
			await pw.startNewProject(ProjectType.JUPYTER_NOTEBOOK);
			await pw.navigate(ProjectWizardNavigateAction.NEXT);
			await pw.navigate(ProjectWizardNavigateAction.NEXT);
			await pw.navigate(ProjectWizardNavigateAction.CREATE);
			await pw.currentOrNewWindowSelectionModal.currentWindowButton.click();
			await app.workbench.positronExplorer.explorerProjectTitle.waitForText(defaultProjectName);
			// NOTE: For completeness, we probably want to await app.workbench.positronConsole.waitForReady('>>>', 10000);
			// here, but it's timing out in CI, so it is not included for now.
		});
	});

});

function addRandomNumSuffix(name: string): string {
	return `${name}_${Math.floor(Math.random() * 1000000)}`;
}
