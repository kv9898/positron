/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/
import { IExtensionManagementService } from '../common/extensionManagement.js';
import { IExtensionManifest } from '../../extensions/common/extensions.js';
import { URI } from '../../../base/common/uri.js';
import { join } from 'path';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { FileOperationResult, IFileService, IFileStat, toFileOperationResult } from '../../files/common/files.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Disposable } from '../../../base/common/lifecycle.js';
import { getSystemArchitecture } from '../../../base/node/arch.js';

export class PositronBootstrapExtensionsInitializer extends Disposable {

	constructor(
		@INativeEnvironmentService private readonly environmentService: INativeEnvironmentService,
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IFileService private readonly fileService: IFileService,
		@IProductService private readonly productService: IProductService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		const storageFilePath = join(this.environmentService.extensionsPath, '.version');
		const currentVersion = this.productService.positronVersion;

		const lastKnownVersion = existsSync(storageFilePath) ? readFileSync(storageFilePath, 'utf8').trim() : '';

		if (lastKnownVersion !== currentVersion) {
			this.logService.info('First launch after first install, upgrade, or downgrade. Installing bootstrapped extensions');
			this.installVSIXOnStartup()
				.then(() => {
					try {
						writeFileSync(storageFilePath, currentVersion);
					} catch (error) {
						this.logService.error('Error writing bootstrapped extension storage file', storageFilePath, getErrorMessage(error));
					}
				})
				.catch(error => {
					this.logService.error('Error installing bootstrapped extensions', getErrorMessage(error));
				});
			this.cleanupOldExtensions(lastKnownVersion);

		} else {
			this.logService.info('Subsequent launch, skipping bootstrapped extensions');
		}
	}

	async installVSIXOnStartup(): Promise<void> {
		await this.installDefaultVSIX();
		await this.installArchitectureSpecificVSIX();
		await this.installCustomVSIX();
	}

	private async installDefaultVSIX(): Promise<void> {
		const extensionsLocation = this.getSystemVSIXPath();
		await this.installVSIXFromLocation(extensionsLocation, 'default');
	}

	private async installArchitectureSpecificVSIX(): Promise<void> {
		const archLocation = this.getArchSpecificVSIXPath();
		await this.installVSIXFromLocation(archLocation, 'arch-specific');
	}

	private async installCustomVSIX(): Promise<void> {
		const customExtensionsLocation = this.getCustomVSIXPath();
		if (!customExtensionsLocation) {
			this.logService.trace('No custom extensions directory configured');
			return;
		}

		await this.installVSIXFromLocation(customExtensionsLocation, 'custom');
	}

	private async installVSIXFromLocation(extensionsLocation: URI, sourceType: string): Promise<void> {
		let stat: IFileStat;
		try {
			stat = await this.fileService.resolve(extensionsLocation);
			if (!stat.children) {
				this.logService.debug(`No ${sourceType} extensions to install`, extensionsLocation.toString());
				return;
			}
		} catch (error) {
			if (toFileOperationResult(error) === FileOperationResult.FILE_NOT_FOUND) {
				this.logService.debug(`No ${sourceType} extensions to install`, extensionsLocation.toString());
			} else {
				this.logService.error(`Error initializing ${sourceType} extensions `, error);
			}
			return;
		}

		const vsixFiles = stat.children.filter(child => child.name.endsWith('.vsix'));
		if (vsixFiles.length === 0) {
			this.logService.debug(`No ${sourceType} VSIX extension files to install`, extensionsLocation.toString());
			return;
		}

		const installedExtensions = await this.extensionManagementService.getInstalled();
		await Promise.all(vsixFiles.map(async vsix => {
			this.logService.info(`Installing ${sourceType} extension:`, vsix.resource.toString());
			try {
				const vsixManifest: IExtensionManifest = await this.extensionManagementService.getManifest(vsix.resource);
				const extensionId = vsixManifest.publisher + '.' + vsixManifest.name;

				const installedExtension = installedExtensions.find(e => e.identifier.id === extensionId);
				if (installedExtension) {
					const installedVersion = installedExtension.manifest.version;
					if (!this.isVSIXNewer(installedVersion, vsixManifest.version)) {
						this.logService.info(`${sourceType} extension is already installed and is up to date:`, vsix.resource.toString());
						return;
					}
				}
				await this.extensionManagementService.install(vsix.resource, { donotIncludePackAndDependencies: true, keepExisting: false });
				this.logService.info(`Successfully installed ${sourceType} extension:`, vsix.resource.toString());
			} catch (error) {
				this.logService.error(`Error installing ${sourceType} extension:`, vsix.resource.toString(), getErrorMessage(error));
			}
		}));
		this.logService.info(`${sourceType} extensions initialized`, extensionsLocation.toString());

	}

	private isVSIXNewer(installedVersion: string, vsixVersion: string): boolean {
		const [iMajor, iMinor, iPatch] = installedVersion.split('.').map(Number);
		const [vMajor, vMinor, vPatch] = vsixVersion.split('.').map(Number);

		return vMajor > iMajor || (vMajor === iMajor && vMinor > iMinor) || (vMajor === iMajor && vMinor === iMinor && vPatch > iPatch);
	}

	private getSystemVSIXPath(): URI {
		return process.env['VSCODE_DEV']
			? URI.file(join(this.environmentService.appRoot, '.build', 'bootstrapExtensions'))
			: URI.file(join(this.environmentService.appRoot, 'extensions', 'bootstrap'));
	}

	private getArchSpecificVSIXPath(): URI {
		const arch = getSystemArchitecture();
		return URI.file(join(this.getSystemVSIXPath().fsPath, arch));
	}

	private getCustomVSIXPath(): URI | undefined {
		if (!this.environmentService.bootstrapExtensionsPath) {
			return undefined;
		}

		return URI.file(this.environmentService.bootstrapExtensionsPath);
	}

	/**
	 * Manages the cleanup of extensions that were bootstrapped in previous release of Positron,
	 * but have since been removed or replaced.
	 * Typically, we should only log warnings since the extension ultimately falls under the user's
	 * control. However, there may be cases when the consequences of having a previously bootstrapped
	 * extension installed are severe enough to warrant us forcing an uninstall.
	 */
	private cleanupOldExtensions(lastKnownVersion: string): void {
		// If lastKnownVersion is < 2025.06, check for the Black Formatter extension.
		if (/^2025\.0[0-5].*/.test(lastKnownVersion)) {
			this.extensionManagementService.getInstalled()
				.then(installedExtensions => {
					const blackExtension = installedExtensions.find(e => e.identifier.id === 'ms-python.black-formatter');
					if (blackExtension) {
						const cmdCtrl = process.platform === 'darwin' ? 'Cmd' : 'Ctrl';
						this.logService.warn(
							'Positron has replaced the bootstrapped Black Formatter extension with Ruff. We recommend',
							'uninstalling Black Formatter to avoid conflicts. You can uninstall the extension from the',
							`Extensions view (${cmdCtrl}+Shift+X).`
						);
					}
				});
		}
	}

	override dispose(): void {
		this.logService.info('Disposing PositronBootstrapExtensionsInitializer');
		super.dispose();
	}
}
