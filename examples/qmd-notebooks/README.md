# QMD Notebooks Extension Example

This is a complete example extension that demonstrates how to add support for Quarto QMD notebook files in Positron.

## What This Extension Does

This extension:
- Registers a new notebook type called "quarto-notebook"
- Associates `.qmd` files with this notebook type
- Provides a serializer to convert between QMD files and VS Code's notebook format
- Adds a command to create new QMD notebooks

## How It Works

The extension uses the standard VS Code notebook API, which is fully exposed and available in Positron. No modifications to Positron's codebase were needed.

### Key Components

1. **package.json**: Declares the notebook type and file associations
2. **extension.ts**: Registers the serializer and commands
3. **qmdSerializer.ts**: Implements the logic to convert between QMD and notebook format

## Installation

This is a demonstration extension. To use it:

1. Copy this directory to your VS Code/Positron extensions folder:
   - **macOS/Linux**: `~/.vscode/extensions/` or `~/.positron/extensions/`
   - **Windows**: `%USERPROFILE%\.vscode\extensions\` or `%USERPROFILE%\.positron\extensions\`

2. Or, develop it locally:
   ```bash
   cd examples/qmd-notebooks
   npm install
   npm run compile
   # Press F5 in VS Code to launch Extension Development Host
   ```

## Usage

Once installed:

1. **Open a QMD file**: Any `.qmd` file will open in the notebook editor
2. **Create a new QMD notebook**: Use the command "Quarto: New Quarto Notebook"
3. **Edit cells**: Add markdown and code cells as you would in any notebook
4. **Save**: The notebook is saved back to QMD format

## Example QMD File

Here's what a simple QMD file looks like:

```markdown
---
title: "My Document"
format: html
---

## Introduction

This is a Quarto document.

```{r}
x <- 1:10
plot(x)
```

## Analysis

More markdown content here.

```{python}
import pandas as pd
df = pd.DataFrame({'a': [1, 2, 3]})
print(df)
```
```

## Features

- ✅ Parse QMD files into notebook cells
- ✅ Serialize notebooks back to QMD format
- ✅ Support for R, Python, and other languages
- ✅ Preserve cell metadata
- ✅ Create new QMD files
- ⚠️ Basic YAML frontmatter support (treated as a markdown cell)
- ⚠️ Basic cell option parsing

## Limitations

This is a simplified example to demonstrate the concept. A production extension would need:

- Full YAML frontmatter parsing
- Complete Quarto cell option support
- Raw block handling
- Inline code expressions
- Better error handling
- Tests

## Further Reading

See the main [NOTEBOOK_EXTENSIONS.md](../../NOTEBOOK_EXTENSIONS.md) for complete documentation on creating notebook extensions for Positron.

## License

This example is provided as-is for demonstration purposes.
