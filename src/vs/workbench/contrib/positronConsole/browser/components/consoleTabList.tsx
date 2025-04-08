/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

// CSS.
import './consoleTabList.css';

// React.
import React, { useState } from 'react';

// Other dependencies.
import { localize } from '../../../../../nls.js';
import { ConsoleInstanceState } from './consoleInstanceState.js';
import { usePositronConsoleContext } from '../positronConsoleContext.js';
import { IPositronConsoleInstance } from '../../../../services/positronConsole/browser/interfaces/positronConsoleService.js';
import { positronClassNames } from '../../../../../base/common/positronUtilities.js';

/**
 * The minimum width required for the delete action to be displayed on the console tab.
 * The width of the tab is set to 108px to accommodate the icon, session name, and delete button.
 */
const MINIMUM_ACTION_CONSOLE_TAB_WIDTH = 108;

interface ConsoleTabProps {
	id: string;
	positronConsoleInstance: IPositronConsoleInstance;
	width: number; // The width of the console tab list.
	onClick: (instance: IPositronConsoleInstance) => void;
}

const ConsoleTab = React.forwardRef<HTMLDivElement, ConsoleTabProps>(
	({ id, positronConsoleInstance, width, onClick }, ref) => {
		const positronConsoleContext = usePositronConsoleContext();
		const [deleteDisabled, setDeleteDisabled] = useState(false);
		const isSelected = positronConsoleContext.activePositronConsoleInstance?.sessionMetadata.sessionId === positronConsoleInstance.sessionMetadata.sessionId;

		const handleDelete = async (
			e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
			consoleInstance: IPositronConsoleInstance
		) => {
			e.stopPropagation();

			// Prevent the button from being clicked multiple times
			setDeleteDisabled(true);
			try {
				if (consoleInstance.attachedRuntimeSession) {
					await positronConsoleContext.runtimeSessionService.deleteSession(
						consoleInstance.sessionId);
				} else {
					positronConsoleContext.positronConsoleService.deletePositronConsoleSession(
						consoleInstance.sessionId);
				}
			} catch (error) {
				// Show an error notification if the session could not be deleted.
				positronConsoleContext.notificationService.error(
					localize('positronDeleteSessionError', "Failed to delete session: {0}", error)
				);
				// Re-enable the button if the session could not be deleted.
				// If it is deleted, the component is destroyed and the
				// button is no longer clickable anyway.
				setDeleteDisabled(false);
			}
		}

		return (
			<div
				aria-controls={`console-panel-${positronConsoleInstance.sessionMetadata.sessionId}`}
				aria-label={positronConsoleInstance.sessionMetadata.sessionName}
				aria-selected={isSelected}
				className={positronClassNames(
					'tab-button',
					{ 'tab-button--active': isSelected }
				)}
				data-testid={`console-tab-${positronConsoleInstance.sessionMetadata.sessionId}`}
				id={id}
				role='tab'
				tabIndex={isSelected ? 0 : -1}
				title={positronConsoleInstance.sessionMetadata.sessionName}
				onClick={() => onClick(positronConsoleInstance)}
			>
				<ConsoleInstanceState positronConsoleInstance={positronConsoleInstance} />
				<img
					className='icon'
					src={`data:image/svg+xml;base64,${positronConsoleInstance.runtimeMetadata.base64EncodedIconSvg}`}
				/>
				<p className='session-name'>
					{positronConsoleInstance.sessionMetadata.sessionName}
				</p>
				{width >= MINIMUM_ACTION_CONSOLE_TAB_WIDTH &&
					<button
						className='delete-button'
						data-testid='trash-session'
						disabled={deleteDisabled}
						onClick={evt => handleDelete(evt, positronConsoleInstance)}
					>
						<span className='codicon codicon-trash' />
					</button>
				}
			</div>
		)
	}
);

ConsoleTab.displayName = 'ConsoleTab';

// ConsoleCoreProps interface.
interface ConsoleTabListProps {
	readonly width: number;
	readonly height: number;
}

export const ConsoleTabList = (props: ConsoleTabListProps) => {
	// Context hooks.
	const positronConsoleContext = usePositronConsoleContext();

	//Refs.
	const tabListRef = React.useRef<HTMLDivElement>(null);
	// Ref to each console tab
	const tabRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

	// Sort console instances by created time of the attached session, oldest to newest
	const consoleInstances = Array.from(positronConsoleContext.positronConsoleInstances.values()).sort((a, b) => {
		return a.sessionMetadata.createdTimestamp - b.sessionMetadata.createdTimestamp;
	});



	/**
	 * Function to change the active console instance that is tied to a specific session
	 *
	 * @param {string}   sessionId The Id of the session that should be active
	 */
	const onChangeActiveConsoleInstance = async (sessionId: string): Promise<void> => {
		// Get the session object attached to the console instance.
		const session =
			positronConsoleContext.runtimeSessionService.getSession(sessionId);

		if (session) {
			// Set the session as the foreground session which will cause
			// the console instance to become active.
			positronConsoleContext.runtimeSessionService.foregroundSession = session;
		} else {
			// It is possible for a console instance to exist without a
			// session; this typically happens when we create a provisional
			// instance while waiting for a session to be connected, but the
			// session never connects. In this case we can't set the session as
			// the foreground session, but we can still set the console
			// instance as the active console instance.
			positronConsoleContext.positronConsoleService.setActivePositronConsoleSession(sessionId);
		}
	};

	const handleClick = (e: React.MouseEvent) => {
		tabListRef.current?.focus();
	};

	// Set the selected tab to the active console instance.
	const handleKeyDown = (e: React.KeyboardEvent) => {
		console.log(`DHRUVI: `, e.code)
		// Find the console instance that is currently active.
		const currentIndex = consoleInstances.findIndex(tab => {
			tab.sessionId === positronConsoleContext.activePositronConsoleInstance?.sessionId;
		});

		let newIndex = currentIndex;

		switch (e.code) {
			case 'ArrowDown':
				e.preventDefault();
				e.stopPropagation();
				if (currentIndex < consoleInstances.length - 1) {
					newIndex = currentIndex + 1;
					onChangeActiveConsoleInstance(consoleInstances[newIndex].sessionId);
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				e.stopPropagation();
				if (currentIndex > 0) {
					newIndex = currentIndex - 1;
					onChangeActiveConsoleInstance(consoleInstances[newIndex].sessionId);
				}
				break;
			case 'Home':
				e.preventDefault();
				e.stopPropagation();
				if (consoleInstances.length > 0) {
					newIndex = 0;
					onChangeActiveConsoleInstance(consoleInstances[0].sessionId);
				}
				break;
			case 'End':
				e.preventDefault();
				e.stopPropagation();
				if (consoleInstances.length > 0) {
					newIndex = consoleInstances.length - 1;
					onChangeActiveConsoleInstance(consoleInstances[consoleInstances.length - 1].sessionId);
				}
				break;
		}

		// Focus the new active tab
		const newTab = consoleInstances[newIndex];
		if (newTab) {
			const tabElement = tabRefs.current.get(newTab.sessionId);
			if (tabElement) {
				tabElement.focus();
			}
		}
	};

	// Render.
	return (
		<div
			ref={tabListRef}
			aria-orientation='vertical'
			className='tabs-container'
			role='tablist'
			style={{ height: props.height, width: props.width }}
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			{consoleInstances.map((positronConsoleInstance) =>
				<ConsoleTab
					ref={(element: HTMLDivElement) => {
						if (element) {
							tabRefs.current.set(positronConsoleInstance.sessionId, element);
						} else {
							tabRefs.current.delete(positronConsoleInstance.sessionId);
						}
					}}
					id={`tab-${positronConsoleInstance.sessionMetadata.sessionId}`}
					positronConsoleInstance={positronConsoleInstance}
					width={props.width}
					onClick={() => onChangeActiveConsoleInstance(positronConsoleInstance.sessionId)}
				/>
			)}
		</div>
	)
}
