/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEphemeralStateService } from '../../../../platform/ephemeralState/common/ephemeralState.js';
import { EPHEMERAL_STATE_CHANNEL_NAME, EphemeralStateChannelClient } from '../../../../platform/ephemeralState/common/ephemeralStateIpc.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';

/**
 * The implementation of the `IEphemeralStateService` for the browser. This is
 * only used in web-based environments.
 */
export class BrowserEphemeralStateService implements IEphemeralStateService {

	_serviceBrand: undefined;
	_channel: EphemeralStateChannelClient | undefined;

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@ILogService logService: ILogService,
	) {
		const connection = remoteAgentService.getConnection();
		if (connection) {
			this._channel = instantiationService.createInstance(EphemeralStateChannelClient, connection.getChannel(EPHEMERAL_STATE_CHANNEL_NAME));
		} else {
			logService.warn(`Cannot create ephemeral state service; no remote connection.`);
		}
	}

	getItem<T>(key: unknown, defaultValue?: unknown): Promise<T | undefined> {
		if (!this._channel) {
			throw new Error(`Cannot get item ${key}; no remote connection.`);
		}
		return this._channel.getItem(key, defaultValue);
	}

	setItem(key: string, data?: object | string | number | boolean | undefined | null): Promise<void> {
		if (!this._channel) {
			throw new Error(`Cannot set item ${key}; no remote connection.`);
		}
		return this._channel.setItem(key, data);
	}

	removeItem(key: string): Promise<void> {
		if (!this._channel) {
			throw new Error(`Cannot remove item ${key}; no remote connection.`);
		}
		return this._channel.removeItem(key);
	}
}

registerSingleton(IEphemeralStateService, BrowserEphemeralStateService, InstantiationType.Delayed);

