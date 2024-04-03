import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs';
import { CURSOR, type, withFileEditor } from './editor-utils';
import { EXTENSION_ROOT_DIR } from '../constants';
import { removeLeadingLines } from '../util';

const snapshotsFolder = `${EXTENSION_ROOT_DIR}/src/test/snapshots`;
const snippetsPath = `${snapshotsFolder}/indentation-cases.R`;
const snapshotsPath = `${snapshotsFolder}/indentation-snapshots.R`;

// FIXME: This should normally be run as part of tests setup in `before()` but
// it's somehow not defined
async function init() {
	// Open workspace with custom configuration for snapshots. If you need
	// custom settings set them there via `config.update()`.
	const uri = vscode.Uri.file(snapshotsFolder);
	await vscode.commands.executeCommand('vscode.openFolder', uri, false);
	const config = vscode.workspace.getConfiguration();

	// Prevents `ENOENT: no such file or directory` errors caused by us
	// deleting temporary editor files befor Code had the opportunity to
	// save the user history of these files.
	config.update('workbench.localHistory.enabled', false, vscode.ConfigurationTarget.Workspace);
}

suite('Indentation', () => {
	// This regenerates snapshots in place. If the snapshots differ from last
	// run, a failure is emitted. You can either commit the new output or discard
	// it if that's a bug to fix.
	test('Regenerate and check', async () => {
		await init();
		const expected = fs.readFileSync(snapshotsPath, 'utf8');
		const current = await regenerateIndentSnapshots();

		// Update snapshot file
		fs.writeFileSync(snapshotsPath, current, 'utf8');

		// Notify if snapshots were outdated
		assert.strictEqual(expected, current);
	});
});

async function regenerateIndentSnapshots() {
	const snippets = fs.
		readFileSync(snippetsPath, 'utf8').
		split('# ---\n');

	// Remove documentation snippet
	snippets.splice(0, 1);

	const snapshots: string[] = ['# File generated from `indentation-cases.R`.\n\n'];

	for (const snippet of snippets) {
		const bareSnippet = snippet.split('\n').slice(0, -1).join('\n');

		await withFileEditor(snippet, 'R', async (_editor, doc) => {
			// Type one newline character to trigger indentation
			await type(doc, `\n${CURSOR}`);
			const snapshot = removeLeadingLines(doc.getText(), /^$|^#/);
			snapshots.push(bareSnippet + '\n# ->\n' + snapshot);
		});
	}

	return snapshots.join('# ---\n');
}