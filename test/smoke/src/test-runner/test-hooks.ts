/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2024 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'path';
import * as path from 'path';
import { Logger, } from '../../../automation';
import { installAllHandlers, } from '../utils';
import { createLogger } from './logger';

export const ROOT_PATH = join(__dirname, '..', '..', '..', '..');
const TEST_DATA_PATH = process.env.TEST_DATA_PATH || 'TEST_DATA_PATH not set';
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || 'WORKSPACE_PATH not set';
const EXTENSIONS_PATH = process.env.EXTENSIONS_PATH || 'EXTENSIONS_PATH not set';
const LOGS_ROOT_PATH = process.env.LOGS_ROOT_PATH || 'LOGS_ROOT_PATH not set';
const CRASHES_ROOT_PATH = process.env.CRASHES_ROOT_PATH || 'CRASHES_ROOT_PATH not set';

const asBoolean = (value: string | undefined): boolean | undefined => {
	return value === 'true' ? true : value === 'false' ? false : undefined;
};

// NOTE: When running with --build, the config file does not load so we are setting the options here
const OPTS: ParseOptions = {
	tracing: asBoolean(process.env.TRACING),
	parallel: asBoolean(process.env.PARALLEL),
	web: asBoolean(process.env.WEB),
	build: process.env.BUILD,
	remote: asBoolean(process.env.REMOTE),
	verbose: asBoolean(process.env.VERBOSE),
	headless: asBoolean(process.env.HEADLESS),
	browser: process.env.BROWSER,
	electronArgs: process.env.ELECTRON_ARGS,
	version: process.env.BUILD_VERSION,
};

/**
 * Setup the environment, logs, hooks for the test suite and then START the application.
 *
 * @returns The logger instance for the test suite.
 */
export function setupAndStartApp(): Logger {
	// Dynamically determine the test file name
	const suiteName = getTestFileName();
	const logsRootPath = join(LOGS_ROOT_PATH, suiteName);
	const crashesRootPath = join(CRASHES_ROOT_PATH, suiteName);

	// Create a new logger for this suite
	const logger = createLogger(logsRootPath);

	// Set test defaults and before/after hooks
	setTestDefaults(logger, logsRootPath, crashesRootPath);
	installAllHandlers(logger);

	return logger;
}

/**
 * Set the default options for the test suite.
 *
 * @param logger the logger instance for the test suite
 * @param logsRootPath  the root path for the logs
 * @param crashesRootPath the root path for the crashes
 */
function setTestDefaults(logger: Logger, logsRootPath: string, crashesRootPath: string) {
	before(async function () {
		this.defaultOptions = {
			codePath: OPTS.build,
			workspacePath: WORKSPACE_PATH,
			userDataDir: join(TEST_DATA_PATH, 'd'),
			extensionsPath: EXTENSIONS_PATH,
			logger,
			logsPath: join(logsRootPath, 'suite_unknown'),
			crashesPath: join(crashesRootPath, 'suite_unknown'),
			verbose: OPTS.verbose,
			remote: OPTS.remote,
			web: OPTS.web,
			tracing: OPTS.tracing,
			headless: OPTS.headless,
			browser: OPTS.browser,
			extraArgs: (OPTS.electronArgs || '').split(' ').map(arg => arg.trim()).filter(arg => !!arg),
		};
	});
}

/**
 * Dynamically determines the test file path based on the caller's stack trace.
 *
 * @returns The file name of the test file.
 */
function getTestFileName(): string {
	const originalFunc = Error.prepareStackTrace;

	try {
		// Capture the stack trace
		const err = new Error();
		Error.prepareStackTrace = (_, stack) => stack;

		// Stack index 2 points to the immediate caller of this function
		const stackFrames = err.stack as any;
		const callerFilePath = stackFrames[2].getFileName();  // Adjust index based on context

		return path.basename(callerFilePath);
	} catch (e) {
		console.error('Failed to retrieve caller file name:', e);
		return 'unknown';
	} finally {
		// Restore the original stack trace behavior
		Error.prepareStackTrace = originalFunc;
	}
}

type ParseOptions = {
	verbose?: boolean;
	remote?: boolean;
	headless?: boolean;
	web?: boolean;
	tracing?: boolean;
	parallel?: boolean;
	build?: string;
	'stable-build'?: string;
	browser?: string;
	electronArgs?: string;
	version?: string;
};
