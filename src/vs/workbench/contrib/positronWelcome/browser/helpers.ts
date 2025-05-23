/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { PositronImportSettings } from './actions.js';
import * as platform from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { env } from '../../../../base/common/process.js';

const WAS_PROMPTED_KEY = 'positron.welcome.promptedImport';

export async function getImportWasPrompted(
	storageService: IStorageService,
): Promise<boolean> {
	return storageService.getBoolean(WAS_PROMPTED_KEY, StorageScope.PROFILE, false);
}

export function setImportWasPrompted(
	storageService: IStorageService,
	state: boolean = true
) {
	storageService.store(WAS_PROMPTED_KEY, state, StorageScope.PROFILE, StorageTarget.MACHINE);
}

export async function promptImport(
	storageService: IStorageService,
	notificationService: INotificationService,
	commandService: ICommandService,
) {
	// Show the prompt to the user.
	// The prompt will show up in the notification center.
	notificationService.prompt(
		Severity.Info,
		localize('positron.settingsImport.prompt', 'Import your settings from Visual Studio Code into Positron?'),
		[
			// Open the import settings command and set the import was prompted flag to true.
			// This will prevent the prompt from showing up again.
			{
				label: localize('positron.settingsImport.import', 'Import'),
				run: () => {
					commandService.executeCommand(PositronImportSettings.ID);
					setImportWasPrompted(storageService);
				},
			},
			// Dismisses notification, but will prompt again on next launch.
			{
				label: localize('positron.settingsImport.later', 'Later'),
				run: () => { },
			},
			// Adds a "Don't show again" action to the prompt.
			// This will allow the user to dismiss the prompt and not show it again.
			{
				label: localize('positron.settingsImport.dontShowAgain', "Don't show again"),
				run: () => {
					setImportWasPrompted(storageService);
				},
			}
		],
		{
			sticky: true,
			onCancel: () => { },
		}
	);
}

export async function getCodeSettingsPath(
	pathService: IPathService, os: platform.OperatingSystem = platform.OS): Promise<URI> {
	const path = await pathService.path;
	const homedir = await pathService.userHome();

	switch (os) {
		case platform.OperatingSystem.Windows:
			if (env['APPDATA']) {
				return URI.file(path.join(env['APPDATA'], 'Code', 'User', 'settings.json'));
			} else if (env['USERPROFILE']) {
				const userProfile = env['USERPROFILE'];
				return URI.file(path.join(userProfile, 'AppData', 'Roaming', 'Code', 'User', 'settings.json'));
			} else {
				return URI.joinPath(homedir, 'AppData', 'Roaming', 'Code', 'User', 'settings.json');
			}

		case platform.OperatingSystem.Macintosh:
			return URI.joinPath(homedir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');

		case platform.OperatingSystem.Linux:
			return URI.joinPath(
				(env['XDG_CONFIG_HOME'] ?
					URI.file(env['XDG_CONFIG_HOME']) :
					URI.joinPath(homedir, '.config')
				), 'Code', 'User', 'settings.json'
			);

		default:
			throw new Error('Platform not supported');
	}
}
