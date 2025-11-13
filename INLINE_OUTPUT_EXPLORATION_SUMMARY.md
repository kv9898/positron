# Summary: Inline Output for Quarto/RMarkdown in Positron

## What Was Done

I've explored the possibility of adding inline output support for Quarto (.qmd) and RMarkdown (.rmd) files in Positron, as requested in issue #5640.

### ✅ Phase 1: Code Cell Parsing (Implemented)

I've implemented the foundation by adding support for parsing Quarto/RMarkdown code fences to the `positron-code-cells` extension:

**Changes:**
- Modified `extensions/positron-code-cells/src/parser.ts`
- Added regex patterns to detect ` ```{r} `, ` ```{python} `, and other code fence formats
- Registered parsers for `quarto`, `rmd`, and `markdown` language IDs

**What This Enables Now:**
- ✅ Code chunks in .qmd/.rmd files are recognized
- ✅ "Run Cell" code lens appears above chunks
- ✅ Navigate between cells with Cmd/Ctrl+PageUp/Down  
- ✅ Cell highlighting shows active code block
- ✅ All existing code-cells commands work (Run Cell, Run Above, Run Below, etc.)

**Example:**
```qmd
---
title: "My Analysis"
---

```{r}
x <- 1:10
plot(x, x^2)
```

```{python}
import numpy as np
print(np.mean([1, 2, 3]))
```
```

Both chunks above will now be recognized and have "Run Cell" code lenses.

## Key Findings

### Why Posit Team Hasn't Implemented This Yet

After exploring the codebase, I identified these challenges:

1. **Technical Complexity**
   - Requires integrating 3 major subsystems: parser (✅ done), runtime execution, and editor widgets
   - VS Code's text editor is fundamentally different from notebook editor
   
2. **State Management**
   - Outputs must persist in memory but NOT modify the plain text file
   - Must track output positions as file is edited
   - Needs decision on persistence strategy (memory only vs workspace cache)

3. **Security Concerns**
   - HTML/JavaScript outputs need sandboxing
   - Iframe restrictions and content security policies required
   
4. **Environment Sharing Question**
   - Should code chunks share environment with console? (RStudio behavior)
   - Or should they be isolated? (Jupyter behavior)
   - This debate is mentioned multiple times in the issue comments

5. **Paradigm Mismatch**
   - VS Code designed notebooks and text editors as separate paradigms
   - Inline output in text editor is not a standard VS Code pattern
   - Requires creative use of ZoneWidget API

### Good News: It's Technically Feasible! ✅

**I found the solution: ZoneWidget API**

Located in `src/vs/editor/contrib/zoneWidget/browser/zoneWidget.ts`, this is the mechanism VS Code uses for "Peek Definition" and similar inline views.

**How it works:**
- ZoneWidget can insert custom DOM content between lines in the text editor
- Perfect for displaying output after code chunks
- Example usage: PeekViewWidget (for "Peek Definition")

**This means inline output IS possible without converting to notebook format.**

## Implementation Plan

### Phase 2: Inline Output Display (Next Steps)

The remaining work is well-understood and follows established patterns:

**Components Needed:**

1. **OutputZoneWidget** (new class)
   - Extend ZoneWidget to create output container
   - Position after code chunk end
   - Handle resize, collapse/expand
   
2. **Output Renderer** (new module)
   - Render different MIME types:
     - text/plain → formatted text with colors
     - image/png → base64 images
     - text/html → sandboxed iframe
     - application/json → pretty JSON
     - plotly/vega → interactive charts
   - Security: sanitize HTML, restrict iframe

3. **State Manager** (new module)
   - Store outputs in memory by file+cell
   - Handle file edits (update positions)
   - Optional: persist to workspace cache (like RStudio)

4. **Runtime Integration** (new module)
   - Execute code via Positron runtime services
   - Capture stdout, stderr, display data
   - Handle execution state (running, error, success)

5. **UI Enhancements**
   - Clear output button on each chunk
   - Run All / Clear All commands
   - Execution indicators (spinner, checkmark, error)
   - Collapse/expand controls

### Estimated Effort

- Phase 2 (Output Display): 1-2 weeks
- Phase 3 (UI/UX Polish): 1 week  
- Testing & Bug Fixes: 1 week
- **Total: 3-4 weeks** for complete implementation

## Two Approaches Clarified

Based on the issue comments, there were two options discussed:

### Option 1: RStudio-Style (What Users Want) ✅
- Plain text editing
- Output displayed inline after chunks
- File remains plain text
- **This is what I'm implementing**

### Option 2: Jupyter-Style (Easier but NOT requested)
- Treat .qmd as notebook file
- Markdown in cells, rendered as HTML
- Similar to .ipynb experience
- **Users explicitly rejected this**

The issue comments make it clear: users want Option 1 (RStudio-style).

## Architecture

```
User Action Flow:
1. User opens .qmd file
2. Parser identifies code chunks (✅ Phase 1 complete)
3. Code lens "Run Cell" appears above chunk
4. User clicks "Run Cell"
5. Runtime executes code in R/Python kernel
6. Output captured (text, plots, errors, etc.)
7. OutputZoneWidget created and positioned after chunk
8. Output rendered based on MIME type
9. Output stored in memory/cache
10. User can clear, collapse, or rerun

File remains plain text throughout.
```

## Documentation Created

I've created comprehensive documentation:

1. **`QUARTO_RMARKDOWN_SUPPORT.md`**
   - User-facing guide
   - What's implemented and what's next
   - How to test current features
   - Example usage

2. **`INLINE_OUTPUT_PLAN.md`**
   - Technical implementation details
   - Component architecture
   - Challenges and solutions
   - Testing plan
   - File structure

Both documents are in `extensions/positron-code-cells/`

## Testing Phase 1

To test the current implementation:

1. Create a `.qmd` file:
```qmd
---
title: "Test"
---

```{r}
print("Hello from R")
```

```{python}
import numpy as np
print("Hello from Python")
```
```

2. Open in Positron
3. You should see:
   - Code lens above each chunk
   - Cell highlighting when cursor in chunk
   - Cmd/Ctrl+PageUp/Down navigation works

## Recommendation

**This feature should be implemented.** Here's why:

✅ **Feasible**: ZoneWidget API provides the mechanism
✅ **Wanted**: 77+ upvotes on the issue, many passionate comments
✅ **Differentiating**: Makes Positron stand out from VS Code
✅ **Educational**: Critical for teaching/learning workflows
✅ **Version Control**: Keeps plain text files (vs .ipynb problems)

**Phase 1 is complete** - the parsing foundation is in place.
**Phase 2 is well-understood** - clear technical path forward.
**Estimated timeline**: 3-4 weeks for full implementation.

## Difficulties Identified

As requested in your comment, here are the main difficulties:

### Technical Challenges:
1. ⚠️ **ZoneWidget Complexity** - Custom widget implementation is non-trivial
2. ⚠️ **MIME Type Handling** - Need robust renderer for many output types
3. ⚠️ **Security** - HTML/JS output must be sandboxed properly
4. ⚠️ **Performance** - Large outputs could slow editor
5. ⚠️ **Position Tracking** - Outputs must follow code chunks as file edited

### Design Decisions:
1. ❓ **Environment Sharing** - Share with console or isolate? (make configurable)
2. ❓ **Persistence** - Memory only or workspace cache? (make configurable)
3. ❓ **Clear Strategy** - Auto-clear on rerun or keep history? (make configurable)

### None Are Blockers:
All challenges have clear solutions:
- ZoneWidget: Follow PeekViewWidget pattern
- MIME types: Start with essentials (text, images), add others incrementally  
- Security: Use DOMPurify + sandboxed iframe
- Performance: Virtualization + lazy loading
- Tracking: Hash-based cell identification
- Decisions: Make configurable

## Next Steps

If you want to continue this work:

1. Review the implementation plan documents
2. Start with OutputZoneWidget class
3. Implement basic text output first
4. Add image support
5. Integrate with runtime services
6. Add UI controls
7. Test thoroughly

The foundation is solid and the path forward is clear.

## Closing Thoughts

This exploration reveals that **inline output for qmd/rmd is absolutely doable** in Positron. The main reason it hasn't been done yet is the complexity and engineering time required, not technical impossibility.

The ZoneWidget API discovery is the key insight - it makes this feature achievable without major architectural changes to VS Code/Positron.

Users clearly want this feature (77+ upvotes, passionate comments), and it would be a significant differentiator for Positron, especially for educators and R users migrating from RStudio.

---

**Repository:** kv9898/positron (fork of posit-dev/positron)  
**Branch:** copilot/add-inline-output-support  
**Issue:** posit-dev/positron#5640  
**Comment Reference:** https://github.com/posit-dev/positron/issues/5640#issuecomment-3478034000
