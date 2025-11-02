# Positron QMD Example Extension

This is an example extension that demonstrates how to add custom notebook file format support to Positron notebooks.

## What This Example Shows

This extension demonstrates how to:

1. **Contribute a notebook type** via the `notebooks` contribution point in `package.json`
2. **Register a notebook serializer** that converts between your file format and VS Code's notebook format
3. **Make Positron notebooks available** as an editor for your custom file type

## How It Works

### 1. Contribute Notebook Type

In `package.json`, we declare a notebook type:

```json
{
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
  }
}
```

### 2. Register Serializer

In `src/extension.ts`, we register a serializer:

```typescript
vscode.workspace.registerNotebookSerializer(
  'quarto-notebook',
  new QuartoNotebookSerializer(),
  {
    transientOutputs: true,
    transientCellMetadata: { executionCount: true }
  }
);
```

### 3. Positron Notebooks Automatically Registers

Once your extension is activated, Positron notebooks automatically:
- Detects the new notebook type
- Registers itself as an optional editor for `.qmd` files
- Appears in the "Open With..." menu
- Can be set as the default editor via `workbench.editorAssociations`

## Using This Example

1. **Install the extension** (it's included in the Positron extensions folder)
2. **Open a `.qmd` file**
3. **Right-click** and select "Open With..." → "Positron Notebook"
4. **Optionally set as default**: Right-click → "Open With..." → "Configure Default Editor..." → "Positron Notebook"

## Implementing Your Own Format

To support your own notebook format:

1. **Copy this example** as a starting point
2. **Update `package.json`**:
   - Change `name`, `displayName`, `description`
   - Update the notebook type name
   - Update the file pattern selector
3. **Implement the serializer**:
   - `deserializeNotebook()`: Parse your format → notebook data
   - `serializeNotebook()`: Convert notebook data → your format
4. **Set transient options** based on what should be persisted

## Limitations of This Example

This is a **simplified example** for demonstration purposes. A production QMD extension would need to:

- Parse YAML frontmatter for notebook metadata
- Handle chunk options (e.g., `#| label: fig-plot`)
- Support all Quarto-specific features
- Implement proper error handling
- Handle edge cases and malformed files

For a complete Quarto/QMD implementation, use the official Quarto extension.

## More Information

- [VS Code Notebook API](https://code.visualstudio.com/api/extension-guides/notebook)
- [Positron Notebooks Architecture](../../../src/vs/workbench/contrib/positronNotebook/docs/positron_notebooks_architecture.md)
- [Quarto Documentation](https://quarto.org)
