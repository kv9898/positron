# Extension API for Custom Notebook Types

## Question Answered

**Q: Does Positron expose an API for extensions to add custom notebook support (like QMD)? Or do I have to modify Positron's codebase?**

**A: Yes, Positron now exposes a standard VS Code extension API for adding custom notebook types! You do NOT need to modify Positron's codebase.**

## What Was Implemented

Positron Notebooks now automatically supports any notebook type contributed by extensions through the standard VS Code notebooks API. This means:

✅ **Extensions can add QMD support** (or any other format) without modifying Positron  
✅ **Standard VS Code API** - use the same API as regular VS Code extensions  
✅ **Automatic registration** - Positron Notebooks automatically becomes available for your file type  
✅ **No Positron code changes needed** - just write a standard extension

## How to Add QMD Support (or Any Format)

### Option 1: Use the Example Extension

We've included a complete example extension at:
```
extensions/positron-qmd-example/
```

This demonstrates exactly how to add QMD notebook support.

### Option 2: Write Your Own Extension

Follow the [Extension Development Guide](src/vs/workbench/contrib/positronNotebook/docs/extension_development_guide.md) to create your own extension.

**Quick steps:**

1. **Create an extension** with a `package.json` that declares your notebook type:
```json
{
  "contributes": {
    "notebooks": [
      {
        "type": "quarto-notebook",
        "displayName": "Quarto Notebook",
        "selector": [{ "filenamePattern": "*.qmd" }],
        "priority": "default"
      }
    ]
  }
}
```

2. **Implement a serializer** that converts your format ↔ notebook data:
```typescript
class QuartoNotebookSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(content: Uint8Array): Promise<vscode.NotebookData> {
    // Parse your QMD file into cells
  }
  
  async serializeNotebook(data: vscode.NotebookData): Promise<Uint8Array> {
    // Convert cells back to QMD format
  }
}
```

3. **Register the serializer** in your activation function:
```typescript
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      'quarto-notebook',
      new QuartoNotebookSerializer()
    )
  );
}
```

That's it! Positron Notebooks will automatically detect your notebook type and become available as an editor option.

## Using Custom Notebooks

Once an extension is installed:

1. **Open a file** with the custom extension (e.g., `document.qmd`)
2. **Right-click** and select "Open With..."
3. **Choose "Positron Notebook"**
4. **Optionally set as default** via "Configure Default Editor..."

## Architecture Changes

The implementation modified Positron Notebooks to:

- **Listen for contributed notebook types** via `INotebookService.getContributedNotebookTypes()`
- **Dynamically register** editor handlers for all notebook types
- **Listen for runtime additions** via `INotebookService.onAddViewType` event
- **Register all file patterns** declared by each notebook type

See the [Architecture Documentation](src/vs/workbench/contrib/positronNotebook/docs/positron_notebooks_architecture.md) for technical details.

## Files Changed

### Core Implementation
- `src/vs/workbench/contrib/positronNotebook/browser/positronNotebook.contribution.ts`
  - Modified to dynamically register for all contributed notebook types
  - Added listener for new notebook types being added at runtime

### Documentation
- `src/vs/workbench/contrib/positronNotebook/docs/positron_notebooks_architecture.md`
  - Updated with extension API documentation
  - Added example of how extensions can contribute notebook types

- `src/vs/workbench/contrib/positronNotebook/docs/extension_development_guide.md`
  - New comprehensive guide for extension developers
  - Step-by-step instructions with code examples

### Example Extension
- `extensions/positron-qmd-example/`
  - Complete working example extension
  - Demonstrates QMD notebook serialization
  - Includes test file and README

### Tests
- `src/vs/workbench/contrib/positronNotebook/test/browser/positronNotebookDynamicRegistration.test.ts`
  - Unit tests for dynamic registration
  - Tests for multiple file patterns
  - Tests for runtime registration

## Benefits

✅ **No Positron modifications needed** - Extensions are self-contained  
✅ **Standard VS Code API** - Compatible with VS Code extension ecosystem  
✅ **Easy to distribute** - Extensions can be packaged and shared  
✅ **Multiple formats supported** - Any number of custom formats can coexist  
✅ **Automatic updates** - Extension updates don't require Positron updates  

## Next Steps for Extension Developers

1. **Read the [Extension Development Guide](src/vs/workbench/contrib/positronNotebook/docs/extension_development_guide.md)**
2. **Review the [QMD Example Extension](extensions/positron-qmd-example/)**
3. **Implement your serializer** for your format
4. **Test with sample files**
5. **Publish or distribute** your extension

## Questions or Issues?

- [GitHub Discussions](https://github.com/posit-dev/positron/discussions) - Ask questions
- [Issue Tracker](https://github.com/posit-dev/positron/issues) - Report bugs
- [Documentation](src/vs/workbench/contrib/positronNotebook/docs/) - Technical details

---

**Summary**: Positron now provides a complete extension API for adding custom notebook formats. Extensions can add QMD, RMD, or any custom format support without modifying Positron's codebase, using the standard VS Code notebooks API.
