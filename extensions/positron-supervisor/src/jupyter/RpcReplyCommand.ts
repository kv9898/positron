/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024-2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { JupyterChannel } from './JupyterChannel';
import { JupyterCommand } from './JupyterCommand';
import { JupyterMessageHeader } from './JupyterMessageHeader';
import { JupyterMessageType } from './JupyterMessageType.js';


export class RpcReplyCommand extends JupyterCommand<any> {
	/**
	 * Construct a new input reply
	 *
	 * @param parent The parent message header, if any
	 * @param value The value the user entered for the input request
	 */
	constructor(readonly parent: JupyterMessageHeader | null, value: any) {
		super(JupyterMessageType.RpcReply, value, JupyterChannel.Stdin);
	}

	protected override createParentHeader(): JupyterMessageHeader | null {
		return this.parent;
	}
}
