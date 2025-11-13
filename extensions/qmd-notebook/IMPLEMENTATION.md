# Implementation Summary: Quarto and RMarkdown Notebook Support

## Overview

This implementation adds notebook support for Quarto (.qmd) and RMarkdown (.rmd, .Rmd) files in Positron, addressing issue #5640. The solution allows users to work with these files as interactive notebooks with inline output, similar to the experience in RStudio.

## What Was Implemented

### 1. New Extension: `qmd-notebook`

Created a new VS Code extension (`extensions/qmd-notebook/`) that provides:

- **Notebook Serializer**: Converts between plain text Quarto/RMarkdown format and VS Code's internal notebook representation
- **Parser**: Parses code chunks, markdown content, and YAML front matter
- **Serializer**: Converts notebook data back to plain text format while preserving all metadata

### 2. Key Components

#### `src/parser.ts` - QmdRmdParser
- Parses Quarto/RMarkdown files into notebook cells
- Detects code chunks using regex: ` ```{language} ... ``` `
- Extracts YAML front matter (metadata between `---` markers)
- Separates code cells from markdown cells
- Preserves chunk options and labels in cell metadata
- Supports multiple languages: R, Python, Julia, Bash, SQL, JavaScript, TypeScript

#### `src/serializer.ts` - QmdRmdSerializer
- Implements VS Code's `NotebookSerializer` interface
- Handles `deserializeNotebook`: text → notebook data
- Handles `serializeNotebook`: notebook data → text
- Maintains round-trip fidelity

#### `src/extension.ts` - Extension Entry Point
- Registers two notebook types:
  - `quarto-notebook` for .qmd files
  - `rmarkdown-notebook` for .rmd/.Rmd files
- Configures notebook behavior (transient outputs, metadata)

### 3. Build Integration

Modified `build/gulpfile.extensions.js` to include the new extension in the compilation pipeline.

### 4. Configuration

`package.json` declares:
- Notebook type contributions
- File pattern selectors
- Activation events
- Extension metadata

## How It Works

### Opening a .qmd or .rmd File

1. User opens a .qmd or .rmd file
2. VS Code recognizes it as a notebook type (via `contributes.notebooks`)
3. The extension activates and its serializer is invoked
4. The parser converts the plain text into notebook cells:
   - YAML front matter → notebook metadata
   - Code chunks → code cells with language ID
   - Everything else → markdown cells
5. VS Code displays the notebook UI with cells

### Executing Code

1. User clicks "Run Cell" or uses keyboard shortcuts
2. VS Code/Positron sends the code to the appropriate kernel (R, Python, etc.)
3. Output is displayed inline below the cell
4. Output is transient (not saved to file by default)

### Saving the File

1. User saves the notebook
2. The serializer converts cells back to plain text format
3. Code cells → code chunks with proper fencing
4. Markdown cells → plain markdown
5. Notebook metadata → YAML front matter
6. The plain text is written to disk

## Advantages

### Version Control Friendly
- Files remain plain text
- Git diffs are clear and readable
- No JSON noise or base64-encoded outputs
- Easy to review in pull requests

### Cross-Compatible
- Files work in RStudio, Positron, and text editors
- Can be rendered with Quarto or knitr
- No special tools needed for viewing or editing

### Clean Separation
- Code and documentation in one file
- Output shown inline during development
- Output not cluttering version control
- Professional document generation via Quarto/knitr

## File Format Example

### Input .qmd File
```markdown
---
title: "Analysis Report"
format: html
---

# Introduction

This is our data analysis.

```{r}
data <- read.csv("data.csv")
summary(data)
```

## Results

The analysis shows...

```{python}
import pandas as pd
df = pd.read_csv("data.csv")
df.describe()
```
```

### After Opening as Notebook
- Cell 1: Markdown (includes YAML and "# Introduction" section)
- Cell 2: R Code Cell (`data <- read.csv...`)
- Cell 3: Markdown ("## Results" section)
- Cell 4: Python Code Cell (`import pandas...`)

### After Running and Saving
The file is saved back in the exact same format (plain text with code chunks).

## Testing

### Included Tests
- `src/test/parser.test.ts`: Unit tests for parser logic
- `validate.js`: Validates extension structure

### Manual Testing Checklist
1. Open a .qmd file → should display as notebook
2. Open a .rmd file → should display as notebook
3. Execute R code chunk → output appears inline
4. Execute Python code chunk → output appears inline
5. Add new cell → converts to appropriate format
6. Save file → maintains plain text format
7. View in text editor → readable plain text
8. Commit to git → clean diff

## Limitations and Future Work

### Current Limitations
1. Output is transient (not persisted in file)
2. No special handling for chunk options like `echo=FALSE`
3. Basic language detection (only common languages mapped)

### Potential Enhancements
1. Support for inline code execution (`` `r code` ``)
2. Advanced chunk option handling
3. Integration with Quarto preview
4. Cached output for specific workflows
5. Better handling of cell metadata

## Files Changed

### New Files
- `extensions/qmd-notebook/package.json`
- `extensions/qmd-notebook/tsconfig.json`
- `extensions/qmd-notebook/src/extension.ts`
- `extensions/qmd-notebook/src/parser.ts`
- `extensions/qmd-notebook/src/serializer.ts`
- `extensions/qmd-notebook/src/test/parser.test.ts`
- `extensions/qmd-notebook/README.md`
- `extensions/qmd-notebook/.vscodeignore`
- `extensions/qmd-notebook/.gitignore`
- `extensions/qmd-notebook/validate.js`

### Modified Files
- `build/gulpfile.extensions.js` (added qmd-notebook to compilation list)

## Conclusion

This implementation provides the core functionality requested in issue #5640: notebook support for Quarto and RMarkdown files with inline output. Users can now work with .qmd and .rmd files as interactive notebooks in Positron, getting the benefits of both the notebook experience and plain text version control.

The implementation follows VS Code extension patterns, integrates cleanly with the existing Positron build system, and maintains full compatibility with other tools in the Quarto/RMarkdown ecosystem.
