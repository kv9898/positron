# Extension Development Guide: Adding Custom Notebook Types to Positron

This guide explains how to create a Positron extension that adds support for custom notebook file formats.

## Overview

Positron Notebooks now supports any notebook type contributed by extensions through the standard VS Code notebooks API. This means you can write an extension to add support for formats like:

- **QMD (Quarto Markdown)** - For Quarto documents
- **RMD (R Markdown)** - For R Markdown documents  
- **Custom formats** - Any proprietary or domain-specific notebook format

Once your extension is installed, Positron Notebooks automatically becomes available as an editor option for your custom file type.

## Quick Start

See the [positron-qmd-example extension](../../../../extensions/positron-qmd-example) for a complete working example.

## Step-by-Step Guide

### 1. Create Extension Structure

```
my-notebook-extension/
├── package.json
├── tsconfig.json
├── src/
│   └── extension.ts
└── README.md
```

### 2. Configure package.json

```json
{
  "name": "my-notebook-extension",
  "displayName": "My Notebook Extension",
  "description": "Adds support for .mynb files",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.65.0"
  },
  "activationEvents": [
    "onNotebook:my-notebook"
  ],
  "contributes": {
    "notebooks": [
      {
        "type": "my-notebook",
        "displayName": "My Notebook",
        "selector": [
          {
            "filenamePattern": "*.mynb"
          }
        ],
        "priority": "default"
      }
    ]
  }
}
```

**Key fields:**
- `contributes.notebooks`: Declares your notebook type
- `type`: Unique identifier for your notebook type
- `selector`: File patterns that match your notebook files
- `priority`: `"default"` (recommended) or `"exclusive"`
- `activationEvents`: Should include `"onNotebook:your-type"`

### 3. Implement Notebook Serializer

Create `src/extension.ts`:

```typescript
import * as vscode from 'vscode';

class MyNotebookSerializer implements vscode.NotebookSerializer {
  
  async deserializeNotebook(
    content: Uint8Array,
    token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    // Parse your file format
    const contentStr = new TextDecoder().decode(content);
    
    // Convert to notebook cells
    const cells: vscode.NotebookCellData[] = [];
    
    // Example: Parse your format and create cells
    // cells.push(new vscode.NotebookCellData(
    //   vscode.NotebookCellKind.Code,
    //   'print("Hello")',
    //   'python'
    // ));
    
    return new vscode.NotebookData(cells);
  }
  
  async serializeNotebook(
    data: vscode.NotebookData,
    token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    // Convert notebook cells back to your format
    let output = '';
    
    for (const cell of data.cells) {
      if (cell.kind === vscode.NotebookCellKind.Code) {
        // Format code cells
        output += `// Code:\n${cell.value}\n\n`;
      } else {
        // Format markdown cells
        output += cell.value + '\n\n';
      }
    }
    
    return new TextEncoder().encode(output);
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      'my-notebook',  // Must match the type in package.json
      new MyNotebookSerializer(),
      {
        // Optional: Configure what gets saved
        transientOutputs: false,
        transientCellMetadata: {
          executionCount: true
        }
      }
    )
  );
}
```

### 4. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  }
}
```

### 5. Build and Test

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Test in Positron
# The extension will be loaded automatically if it's in the extensions/ folder
```

## How It Works

When your extension is activated:

1. **Extension registers notebook type** via `contributes.notebooks` in `package.json`
2. **Extension registers serializer** via `vscode.workspace.registerNotebookSerializer()`
3. **Positron Notebooks detects the new type** through `INotebookService.onAddViewType` event
4. **Positron Notebooks automatically registers** as an optional editor for your file pattern
5. **Users can open files** with your extension and choose Positron Notebooks from "Open With..."

## Serializer Implementation Tips

### Parsing Your Format

Your `deserializeNotebook()` method should:

1. **Parse metadata**: Extract notebook-level metadata from your format
2. **Identify cells**: Split the file into code cells and markdown cells
3. **Preserve cell metadata**: Extract cell-specific options or metadata
4. **Set cell languages**: Assign the correct language ID to code cells

Example patterns:
```typescript
// Parse YAML frontmatter
const frontmatterMatch = /^---\n([\s\S]*?)\n---/.exec(content);
if (frontmatterMatch) {
  const metadata = yaml.parse(frontmatterMatch[1]);
}

// Split by code chunks
const chunkRegex = /```\{(\w+)\}([\s\S]*?)```/g;
```

### Serializing to Your Format

Your `serializeNotebook()` method should:

1. **Write metadata**: Convert notebook metadata to your format's header
2. **Format cells**: Convert each cell back to your format's syntax
3. **Preserve user data**: Keep cell metadata and options
4. **Handle outputs** (if your format supports them)

### Transient Options

Control what gets saved in the file:

```typescript
{
  // Don't save outputs (regenerate on execution)
  transientOutputs: true,
  
  // Don't save specific cell metadata
  transientCellMetadata: {
    executionCount: true,  // Don't save execution counts
    statusMessage: true     // Don't save status messages
  },
  
  // Don't save specific notebook metadata
  transientDocumentMetadata: {
    lastRun: true           // Don't save last run timestamp
  }
}
```

## Testing Your Extension

### Manual Testing

1. Create a test file with your custom extension (e.g., `test.mynb`)
2. Right-click the file in Positron
3. Select "Open With..." → "Positron Notebook"
4. Edit cells and verify serialization by saving

### Automated Testing

Use VS Code's extension testing framework:

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('My Notebook Extension', () => {
  test('Can deserialize notebook', async () => {
    const content = new TextEncoder().encode('// Code:\nprint("test")');
    const serializer = new MyNotebookSerializer();
    const notebook = await serializer.deserializeNotebook(
      content,
      new vscode.CancellationToken()
    );
    assert.strictEqual(notebook.cells.length, 1);
  });
});
```

## Publishing Your Extension

Once your extension works:

1. Update `package.json` with proper metadata
2. Add a comprehensive README
3. Test with various file samples
4. Publish to VS Code Marketplace (optional)
5. Or distribute as a `.vsix` file

## Common Issues

### Extension not activating

- Check `activationEvents` includes `onNotebook:your-type`
- Verify notebook type name matches in both `package.json` and `registerNotebookSerializer()`

### Positron Notebook not appearing in "Open With"

- Ensure `positron.notebook.enabled: true` in settings
- Restart Positron after installing extension
- Check that file pattern in `selector` matches your file

### Serialization errors

- Add error handling in deserialize/serialize methods
- Validate file format before parsing
- Provide clear error messages to users

## Resources

- [VS Code Notebook API Documentation](https://code.visualstudio.com/api/extension-guides/notebook)
- [Positron Notebooks Architecture](./positron_notebooks_architecture.md)
- [Example QMD Extension](../../../../extensions/positron-qmd-example)
- [VS Code Extension API](https://code.visualstudio.com/api)

## Support

For questions about Positron Notebooks extension development:
- [GitHub Discussions](https://github.com/posit-dev/positron/discussions)
- [Issue Tracker](https://github.com/posit-dev/positron/issues)
