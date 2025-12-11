# Extending Positron Notebooks

This document explains how to create extensions that add support for additional notebook file formats in Positron.

## Overview

Positron notebooks are built on top of VS Code's standard notebook API, which means **extensions can register custom notebook serializers without modifying Positron's codebase**. This allows you to add support for any notebook format (e.g., `.qmd`, `.Rmd`, `.jl`, etc.) through a regular VS Code extension.

## Architecture

Positron's notebook implementation has two main components:

1. **Positron Notebook Editor** (`src/vs/workbench/contrib/positronNotebook/`): A custom UI editor that provides the Positron notebook experience, registered to handle `.ipynb` files by default.

2. **VS Code Notebook Infrastructure**: The underlying notebook API from VS Code that handles:
   - Notebook document management
   - Notebook serializers (converting between file formats and notebook data)
   - Notebook kernels (executing code)
   - Notebook renderers (displaying output)

## How Notebook Serializers Work

When you open a notebook file in Positron:

1. The file extension (e.g., `.ipynb`, `.qmd`) determines which **notebook type** is used
2. The notebook type determines which **serializer** converts the file content to/from `NotebookData`
3. The `NotebookData` is displayed using either:
   - Positron's notebook editor (for `.ipynb` files when enabled)
   - VS Code's standard notebook editor (for other types or when Positron notebooks are disabled)

## Creating a Custom Notebook Extension

Here's how to create an extension that adds support for a new notebook format (using `.qmd` as an example):

### 1. Extension Structure

```
my-qmd-extension/
├── package.json
├── src/
│   ├── extension.ts
│   └── qmdSerializer.ts
└── tsconfig.json
```

### 2. Package.json Configuration

Define your notebook type and register it with file patterns:

```json
{
  "name": "qmd-notebooks",
  "displayName": "Quarto QMD Notebooks",
  "description": "Support for Quarto QMD notebook files",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.65.0"
  },
  "activationEvents": [
    "onNotebook:quarto-notebook"
  ],
  "contributes": {
    "notebooks": [
      {
        "type": "quarto-notebook",
        "displayName": "Quarto Notebook",
        "selector": [
          {
            "filenamePattern": "*.qmd"
          }
        ],
        "priority": "default"
      }
    ]
  },
  "main": "./out/extension.js"
}
```

### 3. Implement the Serializer

Create a class that implements `vscode.NotebookSerializer`:

```typescript
// src/qmdSerializer.ts
import * as vscode from 'vscode';

export class QmdNotebookSerializer implements vscode.NotebookSerializer {
    
    /**
     * Deserialize a QMD file into notebook data
     */
    async deserializeNotebook(
        content: Uint8Array,
        token: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const contentStr = Buffer.from(content).toString('utf8');
        
        // Parse QMD format
        const cells = this.parseQmdContent(contentStr);
        
        // Create notebook data
        const notebookData = new vscode.NotebookData(cells);
        
        // Set metadata (optional)
        notebookData.metadata = {
            custom: { qmdFormat: true }
        };
        
        return notebookData;
    }
    
    /**
     * Serialize notebook data back to QMD format
     */
    async serializeNotebook(
        data: vscode.NotebookData,
        token: vscode.CancellationToken
    ): Promise<Uint8Array> {
        // Convert cells back to QMD format
        const qmdContent = this.convertToQmd(data.cells);
        
        return Buffer.from(qmdContent, 'utf8');
    }
    
    private parseQmdContent(content: string): vscode.NotebookCellData[] {
        const cells: vscode.NotebookCellData[] = [];
        
        // Simple parser for demonstration
        // In a real implementation, you'd use a proper QMD parser
        const codeBlockRegex = /```\{([^\}]+)\}([\s\S]*?)```/g;
        let lastIndex = 0;
        let match;
        
        while ((match = codeBlockRegex.exec(content)) !== null) {
            // Add markdown cell for content before code block
            const beforeText = content.slice(lastIndex, match.index).trim();
            if (beforeText) {
                cells.push(new vscode.NotebookCellData(
                    vscode.NotebookCellKind.Markup,
                    beforeText,
                    'markdown'
                ));
            }
            
            // Add code cell
            const language = this.parseLanguage(match[1]);
            const code = match[2].trim();
            cells.push(new vscode.NotebookCellData(
                vscode.NotebookCellKind.Code,
                code,
                language
            ));
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining content as markdown
        const remainingText = content.slice(lastIndex).trim();
        if (remainingText) {
            cells.push(new vscode.NotebookCellData(
                vscode.NotebookCellKind.Markup,
                remainingText,
                'markdown'
            ));
        }
        
        return cells;
    }
    
    private parseLanguage(blockHeader: string): string {
        // Extract language from block header like "{r}" or "{python}"
        const match = blockHeader.match(/^([a-z]+)/i);
        return match ? match[1].toLowerCase() : 'plaintext';
    }
    
    private convertToQmd(cells: vscode.NotebookCellData[]): string {
        let qmdContent = '';
        
        for (const cell of cells) {
            if (cell.kind === vscode.NotebookCellKind.Markup) {
                qmdContent += cell.value + '\n\n';
            } else {
                const language = cell.languageId || 'r';
                qmdContent += '```{' + language + '}\n';
                qmdContent += cell.value + '\n';
                qmdContent += '```\n\n';
            }
        }
        
        return qmdContent;
    }
}
```

### 4. Register the Serializer

In your extension's activation function:

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { QmdNotebookSerializer } from './qmdSerializer';

export function activate(context: vscode.ExtensionContext) {
    // Create and register the serializer
    const serializer = new QmdNotebookSerializer();
    
    // Register for the notebook type defined in package.json
    const registration = vscode.workspace.registerNotebookSerializer(
        'quarto-notebook',  // Must match the type in package.json
        serializer,
        {
            // Options for notebook document content
            transientOutputs: false,  // Preserve outputs when saving
            transientCellMetadata: {
                // Specify which cell metadata fields are transient (not saved)
                executionCount: false,  // Save execution count
                runStartTime: true,     // Don't save run times
            }
        }
    );
    
    context.subscriptions.push(registration);
    
    console.log('QMD Notebook extension activated!');
}

export function deactivate() {}
```

## Working with Positron's Notebook Editor

When you create a custom notebook serializer, it will work with both:

1. **VS Code's standard notebook editor** (always available)
2. **Positron's notebook editor** (if the user has it enabled and it's registered for your file type)

By default, Positron's notebook editor only registers for `.ipynb` files. If you want your custom notebook format to use Positron's editor UI, users would need to configure the editor associations manually or you could provide instructions.

## Example: Full QMD Extension

A complete working example would include:

1. **Robust parsing**: Use a proper QMD/Quarto parser library
2. **YAML frontmatter handling**: Parse and preserve document metadata
3. **Cell metadata**: Handle Quarto-specific cell options (e.g., `#| echo: false`)
4. **Kernel integration**: Ensure the notebook can connect to appropriate kernels (R, Python, Julia, etc.)
5. **Output preservation**: Save and restore cell outputs appropriately

## Testing Your Extension

1. **Development Mode**:
   ```bash
   # In your extension directory
   npm install
   npm run watch
   # Press F5 in VS Code to launch Extension Development Host
   ```

2. **Create a test file**:
   Create a `.qmd` file and verify it opens in the notebook editor

3. **Test serialization**:
   - Open a QMD file
   - Make edits
   - Save and verify the file format is preserved
   - Close and reopen to verify deserialization

## API Reference

### Key VS Code APIs

- **`vscode.NotebookSerializer`**: Interface to implement for custom formats
- **`vscode.workspace.registerNotebookSerializer()`**: Register your serializer
- **`vscode.NotebookData`**: Data structure representing notebook contents
- **`vscode.NotebookCellData`**: Data structure for individual cells
- **`vscode.NotebookCellKind`**: Enum for cell types (Code or Markup)

### Positron-Specific APIs

While Positron's notebook editor works with standard VS Code notebooks, you can optionally use Positron-specific APIs from the `positron` module:

```typescript
import * as positron from 'positron';

// Get the runtime session for a notebook
const session = await positron.runtime.getNotebookSession(notebookUri);

// Start a runtime for a notebook
const session = await positron.runtime.startLanguageRuntime(
    runtimeId,
    sessionName,
    notebookUri
);
```

## Additional Resources

- [VS Code Notebook API Documentation](https://code.visualstudio.com/api/extension-guides/notebook)
- [Positron Extension API](./src/positron-dts/positron.d.ts)
- [ipynb Extension Source](./extensions/ipynb/) - Reference implementation for Jupyter notebooks
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples/tree/main/notebook-extend-markdown-renderer-sample)

## Common Issues and Solutions

### Issue: Notebook doesn't open in editor

**Solution**: Verify your `package.json` has:
- Correct `notebooks` contribution point
- Matching `type` between contribution and `registerNotebookSerializer` call
- Proper `activationEvents` for your notebook type

### Issue: Changes not saved correctly

**Solution**: Ensure your serializer's `serializeNotebook` method properly handles:
- Cell metadata
- Output data
- Notebook-level metadata
- Character encoding (UTF-8)

### Issue: Kernel doesn't connect

**Solution**: 
- Verify the notebook's language ID matches available kernels
- Check that notebook metadata includes kernel information
- Use Positron's runtime API to explicitly manage kernel connections if needed

## Contributing

If you create a useful notebook extension for Positron, consider:
- Publishing it to the VS Code Marketplace
- Sharing it with the Positron community
- Contributing examples or improvements to this documentation

## Questions?

For questions or issues:
- File an issue on the [Positron GitHub repository](https://github.com/posit-dev/positron)
- Check the [VS Code Extension Development documentation](https://code.visualstudio.com/api)
