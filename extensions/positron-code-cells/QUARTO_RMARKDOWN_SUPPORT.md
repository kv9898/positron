# Quarto/RMarkdown Inline Output Support

## Overview

This directory contains the initial implementation for inline output support in Quarto (.qmd) and RMarkdown (.rmd) files within Positron.

## What's Been Implemented

### Phase 1: Code Cell Parsing ✅

The `positron-code-cells` extension now recognizes and parses code chunks in Quarto and RMarkdown files.

**Supported Syntax:**
- ` ```{r} ` - R code chunks
- ` ```{python} ` - Python code chunks  
- ` ```{julia} ` - Julia code chunks
- Any fenced code block with `{language}` syntax

**Features Available:**
- Navigate between cells with Cmd/Ctrl+PageUp/Down
- "Run Cell" code lens above each chunk
- Cell highlighting for active code block
- All existing code-cells commands work

**Example:**

```qmd
---
title: "My Document"
---

## Analysis

```{r}
x <- 1:10
plot(x, x^2)
```

```{python}
import numpy as np
print(np.mean([1, 2, 3]))
```
```

Both code chunks above will be recognized and can be executed using "Run Cell" commands.

## What's Next

### Phase 2: Inline Output Display (Not Yet Implemented)

The next phase will display execution output inline after code chunks, similar to RStudio's behavior.

**Planned Features:**
- Output appears below code chunk after execution
- Support for multiple output types:
  - Text output (stdout, stderr)
  - Plots and images
  - HTML widgets
  - Data tables
  - Error messages
- Output controls:
  - Clear individual or all outputs
  - Collapse/expand output
  - Copy to clipboard
- Execution indicators:
  - Running spinner
  - Success/error icons
  - Execution time

**Technical Approach:**
Uses VS Code's ZoneWidget API to insert custom DOM content between lines in the text editor. This is the same mechanism used by "Peek Definition" and other inline views.

See `INLINE_OUTPUT_PLAN.md` for detailed implementation plan.

## Related Issues

- [posit-dev/positron#5640](https://github.com/posit-dev/positron/issues/5640) - Main feature request
- [posit-dev/positron#3718](https://github.com/posit-dev/positron/discussions/3718) - Related discussion

## Testing

To test the current implementation:

1. Open a `.qmd` or `.rmd` file in Positron
2. Add a code chunk:
   ```
   ```{r}
   print("Hello from R!")
   ```
   ```
3. You should see:
   - Code lens "Run Cell | Run Above | Run Below" above the chunk
   - Cell highlighting when cursor is in the chunk
   - Navigation commands work (Cmd+PageUp/Down)

## Contributing

To continue development:

1. Review `INLINE_OUTPUT_PLAN.md` for the implementation roadmap
2. Key files:
   - `src/parser.ts` - Cell parsing logic (Phase 1 complete)
   - `src/outputZoneWidget.ts` - To be created (Phase 2)
   - `src/outputRenderer.ts` - To be created (Phase 2)
   - `src/runtimeIntegration.ts` - To be created (Phase 2)

## Architecture

```
positron-code-cells/
├── src/
│   ├── parser.ts              ✅ Parses qmd/rmd code fences
│   ├── codeLenses.ts          ✅ Shows "Run Cell" actions
│   ├── decorations.ts         ✅ Highlights active cell
│   ├── commands.ts            ✅ Run cell commands
│   ├── outputZoneWidget.ts    ⏳ Display output inline (Phase 2)
│   ├── outputRenderer.ts      ⏳ Render different output types (Phase 2)
│   └── runtimeIntegration.ts  ⏳ Execute code, capture output (Phase 2)
└── INLINE_OUTPUT_PLAN.md      📋 Detailed implementation plan
```

## Notes

- This implementation keeps qmd/rmd files as **plain text** (not converting to notebooks)
- Outputs are stored in memory/cache, **not in the file itself**
- Compatible with existing Quarto/RMarkdown tooling
- Follows RStudio's approach rather than Jupyter's notebook paradigm
