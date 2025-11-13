/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2025 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { QmdRmdParser } from '../parser';

suite('QmdRmdParser Test Suite', () => {
	test('Parse simple Quarto document', () => {
		const content = `---
title: "Test"
---

# Introduction

Some text

\`\`\`{r}
x <- 1:10
mean(x)
\`\`\`

More text
`;
		
		const result = QmdRmdParser.parse(content);
		
		// Should have 3 cells: front matter markdown, code, and trailing markdown
		assert.strictEqual(result.cells.length, 3);
		
		// First cell should be markdown
		assert.strictEqual(result.cells[0].kind, 1); // NotebookCellKind.Markup = 1
		
		// Second cell should be code
		assert.strictEqual(result.cells[1].kind, 2); // NotebookCellKind.Code = 2
		assert.strictEqual(result.cells[1].languageId, 'r');
		assert.ok(result.cells[1].value.includes('x <- 1:10'));
		
		// Third cell should be markdown
		assert.strictEqual(result.cells[2].kind, 1);
	});
	
	test('Parse Quarto document with Python chunk', () => {
		const content = `\`\`\`{python}
import numpy as np
x = np.array([1, 2, 3])
\`\`\``;
		
		const result = QmdRmdParser.parse(content);
		
		assert.strictEqual(result.cells.length, 1);
		assert.strictEqual(result.cells[0].kind, 2); // Code
		assert.strictEqual(result.cells[0].languageId, 'python');
	});
	
	test('Serialize notebook data back to Quarto format', () => {
		const content = `---
title: "Test"
---

# Introduction

\`\`\`{r}
x <- 1
\`\`\`
`;
		
		const parsed = QmdRmdParser.parse(content);
		const serialized = QmdRmdParser.serialize(parsed);
		
		// Should contain the front matter
		assert.ok(serialized.includes('---'));
		assert.ok(serialized.includes('title: "Test"'));
		
		// Should contain the code chunk
		assert.ok(serialized.includes('```{r}'));
		assert.ok(serialized.includes('x <- 1'));
		assert.ok(serialized.includes('```'));
		
		// Should contain markdown
		assert.ok(serialized.includes('# Introduction'));
	});
});
