/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

// CSS.
import './positronDynamicActionBar.css';

// React.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Other dependencies.
import { DisposableStore } from '../../../base/common/lifecycle.js';
// import { IAction, SubmenuAction } from '../../../base/common/actions.js';
import { usePositronActionBarContext } from './positronActionBarContext.js';
import { /*IMenuActionOptions,*/ MenuId } from '../../actions/common/actions.js';
import { optionalValue, positronClassNames } from '../../../base/common/positronUtilities.js';

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
	const [, setWidth] = useState(0);
	// const [leftActionsMenu, setLeftActionsMenu] = useState<IMenu>(undefined!);
	// const [rightActionsMenu, setRightActionsMenu] = useState<IMenu>(undefined!);

	// const [focusedIndex, setFocusedIndex] = React.useState(0);
	// const [prevIndex, setPrevIndex] = React.useState(-1);

	// Resize observer useLayoutEffect.
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

	// Automatic layout useEffect.
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

		disposableStore.add(leftActionsMenu.onDidChange(() => {
			console.log('Left actions menu changed');
			const actions = leftActionsMenu.getActions();
			console.log(actions);
		}));

		// Create the right actions menu.
		const rightActionsMenu = disposableStore.add(context.menuService.createMenu(
			props.rightActionsMenuID,
			context.contextKeyService,
			{
				emitEventsForSubmenuChanges: true,
				eventDebounceDelay: 0
			}
		));

		disposableStore.add(rightActionsMenu.onDidChange(() => {
			console.log('Right actions menu changed');
			const actions = rightActionsMenu.getActions();
			console.log(actions);
		}));

		// Return the cleanup function that will dispose of the disposables.
		return () => disposableStore.dispose();
	}, [context.contextKeyService, context.menuService, props.leftActionsMenuID, props.rightActionsMenuID]);

	// /**
	//  * Builds action bar elements for a menu.
	//  * @param menuId The menu ID.
	//  * @param buildSecondaryActions A value which indicates whether to build secondary actions.
	//  */
	// const buildActionBarElements = (
	// 	menuId: MenuId,
	// 	buildSecondaryActions: boolean
	// ) => {
	// 	// Get the menu.
	// 	const menu = this._menus.get(menuId);
	// 	if (!menu) {
	// 		return [];
	// 	}

	// 	// Process the menu actions.
	// 	const primaryActions: IAction[] = [];
	// 	const secondaryActions: IAction[] = [];
	// 	const submenuDescriptors = new Set<SubmenuDescriptor>();
	// 	const options = {
	// 		arg: this._editorGroup.activeEditor?.resource,
	// 		shouldForwardArgs: true
	// 	} satisfies IMenuActionOptions;

	// 	for (const [group, actions] of menu.getActions(options)) {
	// 		// Determine the target actions.
	// 		const targetActions = !buildSecondaryActions || this.isPrimaryGroup(group) ?
	// 			primaryActions :
	// 			secondaryActions;

	// 		// Push a separator between groups.
	// 		if (targetActions.length > 0) {
	// 			targetActions.push(new Separator());
	// 		}

	// 		// Enumerate the actions of the group.
	// 		for (const action of actions) {
	// 			// Push the action to the target actions.
	// 			const index = targetActions.push(action) - 1;

	// 			// Build the submenu descriptors for inlining below.
	// 			if (action instanceof SubmenuAction) {
	// 				submenuDescriptors.add({
	// 					group,
	// 					action,
	// 					index
	// 				});
	// 			}
	// 		}
	// 	}

	// 	// Inline submenus, where possible.
	// 	for (const { group, action, index } of submenuDescriptors) {
	// 		// Set the target.
	// 		const target = !buildSecondaryActions || this.isPrimaryGroup(group) ?
	// 			primaryActions :
	// 			secondaryActions;

	// 		// Inline the submenu, if possible.
	// 		if (this.shouldInlineSubmenuAction(group, action)) {
	// 			target.splice(index, 1, ...action.actions);
	// 		}
	// 	}

	// 	// Build the action bar elements.
	// 	const elements: JSX.Element[] = [];
	// 	for (const action of primaryActions) {
	// 		// Process the action.
	// 		if (action instanceof Separator) {
	// 			// Separator action.
	// 			elements.push(<ActionBarSeparator />);
	// 		} else if (action instanceof MenuItemAction) {
	// 			// Menu item action.
	// 			if (!processedActions.has(action.id)) {
	// 				processedActions.add(action.id);
	// 				elements.push(<ActionBarActionButton action={action} />);
	// 			}
	// 		} else if (action instanceof SubmenuItemAction) {
	// 			// Process the action.
	// 			if (!action.item.rememberDefaultAction) {
	// 				// Get the icon ID. TODO: Deal with non-theme icons.
	// 				const iconId = ThemeIcon.isThemeIcon(action.item.icon) ?
	// 					action.item.icon.id :
	// 					undefined;

	// 				// Push the action bar menu button.
	// 				elements.push(
	// 					<ActionBarMenuButton
	// 						actions={() => action.actions}
	// 						align='left'
	// 						ariaLabel={action.label ?? action.tooltip}
	// 						dropdownIndicator='disabled'
	// 						iconId={iconId}
	// 						tooltip={actionTooltip(
	// 							this._contextKeyService,
	// 							this._keybindingService,
	// 							action,
	// 							false
	// 						)}
	// 					/>
	// 				);
	// 			} else {
	// 				// Submenu action. Get the first action.
	// 				const firstAction = action.actions[0];

	// 				// The first action must be a menu item action.
	// 				if (firstAction instanceof MenuItemAction) {
	// 					// Extract the icon ID from the class.
	// 					const iconIdResult = action.actions[0].class?.match(CODICON_ID);
	// 					const iconId = iconIdResult?.length === 2 ? iconIdResult[1] : undefined;

	// 					// Push the action bar menu button.
	// 					elements.push(
	// 						<ActionBarMenuButton
	// 							actions={() => action.actions}
	// 							align='left'
	// 							ariaLabel={firstAction.label ?? firstAction.tooltip}
	// 							dropdownAriaLabel={action.label ?? action.tooltip}
	// 							dropdownIndicator='enabled-split'
	// 							dropdownTooltip={actionTooltip(
	// 								this._contextKeyService,
	// 								this._keybindingService,
	// 								action,
	// 								false
	// 							)}
	// 							iconId={iconId}
	// 							text={iconId ? undefined : firstAction.label}
	// 							tooltip={actionTooltip(
	// 								this._contextKeyService,
	// 								this._keybindingService,
	// 								firstAction,
	// 								false
	// 							)}
	// 						/>
	// 					);
	// 				}
	// 			}
	// 		}
	// 	}

	// 	// If there are secondary actions, add the more actions button. Note that the normal
	// 	// dropdown arrow is hidden on this button because it uses the ··· icon.
	// 	if (secondaryActions.length) {
	// 		elements.push(
	// 			<ActionBarMenuButton
	// 				actions={() => secondaryActions}
	// 				align='left'
	// 				ariaLabel={positronMoreActionsAriaLabel}
	// 				dropdownIndicator='disabled'
	// 				iconId='toolbar-more'
	// 				tooltip={positronMoreActionsTooltip}
	// 			/>
	// 		);
	// 	}

	// 	// Return the action bar elements.
	// 	return elements;
	// }

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
			<div className='hh88'>Dynamic Action Bar</div>
		</div>
	);
};
