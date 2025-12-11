# FAQ: Can Extensions Add Custom Notebook Support to Positron?

## Question

> "Does Positron expose an API for extensions? If I want to make Positron notebook support QMD, can I write an extension or do I have to modify Positron's codebase?"

## Short Answer

**YES!** You can write an extension to add QMD (or any other notebook format) support. **No modifications to Positron's codebase are needed.**

## Detailed Explanation

### How Positron Notebooks Work

Positron's notebook implementation is built on top of VS Code's standard notebook API. This means:

1. **Positron Notebook Editor** is a custom UI registered to handle `.ipynb` files
2. **VS Code Notebook Infrastructure** handles all notebook operations (serialization, kernel management, etc.)
3. **Extensions can register new notebook types** using the same API that the ipynb extension uses

### What You Can Do with Extensions

✅ Register custom notebook file formats (`.qmd`, `.Rmd`, `.jl`, etc.)  
✅ Implement serializers to convert between your format and notebook data  
✅ Work with Positron's notebook UI or VS Code's standard notebook editor  
✅ Execute code using Positron's runtime system  
✅ Distribute your extension via VS Code Marketplace  

### What You Don't Need

❌ Modify Positron's source code  
❌ Fork the Positron repository  
❌ Build Positron from source  
❌ Access private/internal APIs  

## How to Create a QMD Extension

Here's the high-level process:

### 1. Define Your Notebook Type

In `package.json`:
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
        ]
      }
    ]
  }
}
```

### 2. Implement a Serializer

Create a class implementing `vscode.NotebookSerializer`:
```typescript
export class QmdNotebookSerializer implements vscode.NotebookSerializer {
    async deserializeNotebook(content: Uint8Array, token: CancellationToken): Promise<NotebookData> {
        // Parse QMD file → NotebookData
    }
    
    async serializeNotebook(data: NotebookData, token: CancellationToken): Promise<Uint8Array> {
        // Convert NotebookData → QMD file
    }
}
```

### 3. Register the Serializer

In your extension activation:
```typescript
export function activate(context: vscode.ExtensionContext) {
    const serializer = new QmdNotebookSerializer();
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer('quarto-notebook', serializer)
    );
}
```

That's it! Your extension will now handle `.qmd` files in Positron.

## Resources

We've created comprehensive resources to help you:

### 📚 Documentation
- **[NOTEBOOK_EXTENSIONS.md](NOTEBOOK_EXTENSIONS.md)** - Complete guide for creating notebook extensions
  - Architecture overview
  - Step-by-step tutorial
  - API reference
  - Troubleshooting

### 💻 Working Example
- **[examples/qmd-notebooks/](examples/qmd-notebooks/)** - Complete QMD extension
  - Full implementation of QMD serializer
  - Ready to install and test
  - Extensively commented code
  - Sample QMD file included

### 🔗 External Resources
- [VS Code Notebook API Documentation](https://code.visualstudio.com/api/extension-guides/notebook)
- [Positron Extension API](src/positron-dts/positron.d.ts)
- [ipynb Extension Source](extensions/ipynb/) - Reference implementation

## Example: Opening a QMD File

With the QMD extension installed, this QMD file:

```markdown
---
title: "My Analysis"
---

## Introduction

Some text here.

```{r}
plot(1:10)
```

More analysis...

```{python}
import pandas as pd
print("Hello from Python!")
```
```

...will open as a notebook with:
- A markdown cell with the frontmatter and intro text
- A code cell with R code
- A markdown cell with "More analysis..."
- A code cell with Python code

## Why This Works

Positron is built on **VS Code's open extension architecture**. The notebook API is:

- **Fully documented** - Part of VS Code's stable API
- **Well-tested** - Used by Jupyter, Python, and many other extensions
- **Flexible** - Supports any file format you can parse
- **Positron-compatible** - Works with both VS Code's and Positron's notebook UI

## Common Questions

### Q: Will my custom notebooks work with Positron's notebook UI?

A: By default, Positron's notebook UI registers for `.ipynb` files only. Your custom format will use VS Code's standard notebook editor, which still works great in Positron. If you want Positron's UI, users can configure editor associations.

### Q: Can I use Positron-specific APIs?

A: Yes! Your extension can use both VS Code APIs and Positron APIs. For example:
```typescript
import * as positron from 'positron';

// Get the runtime session for your notebook
const session = await positron.runtime.getNotebookSession(notebookUri);
```

### Q: How do I distribute my extension?

A: Package and publish to the VS Code Marketplace:
```bash
npm install -g @vscode/vsce
vsce package
vsce publish
```

### Q: What about kernel/runtime support?

A: Notebook extensions handle file formats. Kernel support comes from:
- Positron's built-in R and Python runtimes
- Jupyter kernels (via Positron's Jupyter kernel integration)
- Custom runtime extensions (using Positron's runtime API)

## Getting Started

1. Read the [full documentation](NOTEBOOK_EXTENSIONS.md)
2. Try the [QMD example](examples/qmd-notebooks/)
3. Modify it for your needs
4. Share your extension with the community!

## Need Help?

- [GitHub Discussions](https://github.com/posit-dev/positron/discussions) - Ask questions
- [GitHub Issues](https://github.com/posit-dev/positron/issues) - Report bugs
- [VS Code Extension Docs](https://code.visualstudio.com/api) - VS Code API reference

---

**Summary**: Positron fully exposes the notebook API through standard VS Code extension APIs. You can create extensions for any notebook format without modifying Positron's source code.
