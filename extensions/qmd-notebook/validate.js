#!/usr/bin/env node

// Simple validation of the parser TypeScript code
console.log('Validating qmd-notebook extension...\n');

const fs = require('fs');
const path = require('path');

// Check that all required files exist
const files = [
	'package.json',
	'tsconfig.json',
	'src/extension.ts',
	'src/parser.ts',
	'src/serializer.ts',
	'out/extension.js',
	'out/parser.js',
	'out/serializer.js'
];

let allGood = true;

files.forEach(file => {
	const filepath = path.join(__dirname, file);
	if (fs.existsSync(filepath)) {
		console.log(`✓ ${file}`);
	} else {
		console.log(`✗ ${file} - NOT FOUND`);
		allGood = false;
	}
});

console.log('');

if (allGood) {
	console.log('✓ All required files present!');
	
	// Check package.json configuration
	const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
	
	console.log('\nNotebook types registered:');
	pkg.contributes.notebooks.forEach(nb => {
		console.log(`  - ${nb.type}: ${nb.displayName}`);
		nb.selector.forEach(sel => {
			console.log(`    Pattern: ${sel.filenamePattern}`);
		});
	});
	
	process.exit(0);
} else {
	console.log('✗ Some files are missing');
	process.exit(1);
}
