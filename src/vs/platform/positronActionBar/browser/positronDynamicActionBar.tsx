/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

// CSS.
import './positronDynamicActionBar.css';

// React.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Other dependencies.
import { IMenu, MenuId, MenuItemAction } from '../../actions/common/actions.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { usePositronActionBarContext } from './positronActionBarContext.js';
import { optionalValue, positronClassNames } from '../../../base/common/positronUtilities.js';
import { ActionBarButton } from './components/actionBarButton.js';
import { ActionBarRegion } from './components/actionBarRegion.js';

/**
 * CommonPositronDynamicActionBarProps interface.
 */
interface CommonPositronDynamicActionBarProps {
	size: 'small' | 'large';
	gap?: number;
	paddingLeft?: number;
	paddingRight?: number;
	leftActionsMenuID: MenuId;
	rightActionsMenuID: MenuId;
}

/**
 * NestedPositronDynamicActionBarProps interface.
 */
type NestedPositronDynamicActionBarProps = | {
	nestedActionBar?: true;
	borderTop?: never;
	borderBottom?: never
} | {
	nestedActionBar?: false | undefined;
	borderTop?: boolean;
	borderBottom?: boolean
};

/**
 * PositronDynamicActionBarProps interface.
 */
type PositronDynamicActionBarProps =
	CommonPositronDynamicActionBarProps &
	NestedPositronDynamicActionBarProps;

/**
 * PositronDynamicActionBar component.
 * @param props A PositronDynamicActionBarProps that contains the component properties.
 * @returns The rendered component.
 */
export const PositronDynamicActionBar = (props: PositronDynamicActionBarProps) => {
	// Context hooks.
	const context = usePositronActionBarContext();

	// Reference hooks.
	const ref = useRef<HTMLDivElement>(undefined!);

	// State hooks.
	const [width, setWidth] = useState(0);
	const [leftActionsMenu, setLeftActionsMenu] = useState<IMenu>(undefined!);
	const [rightActionsMenu, setRightActionsMenu] = useState<IMenu>(undefined!);

	const [leftStuff, setLeftStuff] = useState<JSX.Element[]>([]);
	// const [rightStuff, setRightStuff] = useState<JSX.Element[]>([]);

	// const [focusedIndex, setFocusedIndex] = React.useState(0);
	// const [prevIndex, setPrevIndex] = React.useState(-1);

	// Width useLayoutEffect. This sets the initial width and then tracks changes to
	// the width of the component.
	useLayoutEffect(() => {
		// Set the initial width.
		setWidth(ref.current.offsetWidth);

		// Allocate and initialize the resize observer.
		const resizeObserver = new ResizeObserver(async entries => {
			// Set the width and height.
			setWidth(entries[0].contentRect.width);
		});

		// Start observing risize events.
		resizeObserver.observe(ref.current);

		// Return the cleanup function that will disconnect the resize observer.
		return () => resizeObserver.disconnect();
	}, []);

	// Actions menu useEffect. This creates the actions menus and processes the actions.
	useEffect(() => {
		// Create the disposable store for cleanup.
		const disposableStore = new DisposableStore();

		// Create the left actions menu.
		const leftActionsMenu = disposableStore.add(context.menuService.createMenu(
			props.leftActionsMenuID,
			context.contextKeyService,
			{
				emitEventsForSubmenuChanges: true,
				eventDebounceDelay: 0
			}
		));

		// Add the left actions menu change event listener.
		disposableStore.add(leftActionsMenu.onDidChange(() => {
			console.log('Left actions menu changed');
			const actions = leftActionsMenu.getActions();
			console.log(actions);
		}));

		// Set the left actions menu.
		setLeftActionsMenu(leftActionsMenu);

		// Create the right actions menu.
		const rightActionsMenu = disposableStore.add(context.menuService.createMenu(
			props.rightActionsMenuID,
			context.contextKeyService,
			{
				emitEventsForSubmenuChanges: true,
				eventDebounceDelay: 0
			}
		));

		// Add the right actions menu change event listener.
		disposableStore.add(rightActionsMenu.onDidChange(() => {
			console.log('Right actions menu changed');
			const actions = rightActionsMenu.getActions();
			console.log(actions);
		}));

		// Set the right actions menu.
		setRightActionsMenu(rightActionsMenu);

		// Return the cleanup function that will dispose of the disposables.
		return () => disposableStore.dispose();
	}, [context.contextKeyService, context.menuService, props.leftActionsMenuID, props.rightActionsMenuID]);

	useEffect(() => {
		console.log(`Automatic layout useEffect for width ${width}`);

		if (leftActionsMenu) {
			console.log('Left actions:');

			// Process the menu actions.
			// const primaryActions: IAction[] = [];
			for (const [group, actions] of leftActionsMenu.getActions()) {
				console.log(`    Group: ${group}`);

				const a: JSX.Element[] = [];
				// Enumerate the actions of the group.
				for (const action of actions) {
					if (action instanceof MenuItemAction) {
						if (action.item) {
							console.log(`        Item: ${action.item.displayTitleOnActionBar}`);
							if (action.item.foo) {
								a.push(action.item.foo());
							} else {
								a.push(
									<ActionBarButton
										align='right'
										ariaLabel={action.label}
										iconId='clear-all'
										tooltip={action.label}
										onPressed={async () => await action.run()}
									/>
								)
							}
						}
					}

					// Push the action to the target actions.
					// const index = primaryActions.push(action) - 1;
				}

				setLeftStuff(a);
			}
		}


	}, [leftActionsMenu, rightActionsMenu, width]);

	// Create the class names.
	const classNames = positronClassNames(
		'positron-action-bar',
		{ 'border-top': props?.borderTop },
		{ 'border-bottom': props?.borderBottom },
		{ 'transparent-background': props?.nestedActionBar },
		props.size
	);

	// Render.
	return (
		<div
			ref={ref}
			className={classNames}
			style={{
				gap: optionalValue(props.gap, 0),
				paddingLeft: optionalValue(props.paddingLeft, 0),
				paddingRight: optionalValue(props.paddingRight, 0)
			}}
		>
			<ActionBarRegion location='left'>
				{leftStuff}
			</ActionBarRegion>
		</div>
	);
};
