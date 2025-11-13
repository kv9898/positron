# Quarto and RMarkdown Notebook Extension

This extension provides notebook support for Quarto (.qmd) and RMarkdown (.rmd, .Rmd) files in Positron.

## Features

- **Inline Output**: Execute code chunks and see results inline, just like in RStudio
- **Multi-language Support**: Support for R, Python, Julia, and other languages in code chunks
- **YAML Front Matter**: Preserves document metadata and rendering options
- **Plain Text Format**: All files remain plain text, making version control easy
- **Chunk Options**: Preserves chunk options and labels for document rendering

## Supported File Types

- `.qmd` - Quarto documents
- `.rmd`, `.Rmd` - RMarkdown documents

## Code Chunk Format

Code chunks use the standard Quarto/RMarkdown format:

```markdown
```{r}
# R code here
x <- 1:10
mean(x)
```

```{python}
# Python code here
import numpy as np
data = np.array([1, 2, 3])
```
```

## YAML Front Matter

Documents can include YAML front matter for metadata:

```markdown
---
title: "My Document"
format: html
---

# Introduction

Content here...
```

## Usage

1. Open a `.qmd` or `.rmd` file
2. Positron will automatically recognize it as a notebook
3. Execute code chunks using the run buttons or keyboard shortcuts
4. View output inline, directly below each code chunk

## Benefits Over .ipynb

- **Version Control Friendly**: Plain text format with clear diffs
- **No Output Storage**: Output is not stored in the file by default
- **Cross-IDE Compatible**: Works in RStudio, Positron, and text editors
- **Document Rendering**: Can be rendered to HTML, PDF, Word, etc. using Quarto or knitr

## License

MIT
