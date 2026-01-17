# Inline Output for Quarto/RMarkdown Files - Implementation Plan

## Overview

This document describes the implementation approach for adding RStudio-style inline output support to Positron for Quarto (.qmd) and RMarkdown (.rmd) files.

## Current State (Completed)

### ✅ Phase 1: Code Cell Parsing

**Changes Made:**
- Extended `extensions/positron-code-cells/src/parser.ts` to support qmd/rmd code fence syntax
- Added regex patterns to detect:
  - Code fence start: ` ```{r} `, ` ```{python} `, etc.
  - Code fence end: ` ``` `
  - Language detection from fence header

**New Parsers Added:**
- `quarto` language ID
- `rmd` language ID  
- `markdown` language ID (fallback for qmd/rmd files)

**What This Enables:**
- Code cells in qmd/rmd files are now recognized by Positron
- Users can navigate between cells using Cmd/Ctrl+PageUp/Down
- "Run Cell" code lens appears above code chunks
- Cell highlighting shows active code block

## Next Steps (Not Yet Implemented)

### Phase 2: Inline Output Display

**Objective:** Display execution output inline after code chunks using ZoneWidget API

**Key Components Needed:**

1. **OutputZoneWidget Class**
   - Location: New file in `extensions/positron-code-cells/src/`
   - Extends: `ZoneWidget` from `src/vs/editor/contrib/zoneWidget/browser/zoneWidget.ts`
   - Responsibilities:
     - Create DOM container for output
     - Position after code chunk end
     - Handle resize/collapse/expand
     - Lifecycle management (show, hide, update, dispose)

2. **Output Renderer**
   - Handle multiple MIME types:
     - `text/plain` → formatted text with ANSI colors
     - `image/png`, `image/jpeg` → base64 encoded images
     - `text/html` → sandboxed iframe or sanitized HTML
     - `application/json` → pretty-printed JSON
     - `application/vnd.plotly.v1+json` → Plotly visualizations
     - `application/vnd.vegalite.v4+json` → Vega-Lite charts
   - Security: Sanitize HTML, restrict iframe capabilities

3. **Output State Manager**
   - Store outputs in memory keyed by:
     - File URI
     - Cell line range
     - Execution sequence number
   - Persistence options:
     - In-memory only (cleared on close)
     - Workspace cache (like RStudio's `.Rproj.user`)
   - Handle file edits (update cell positions)

4. **Runtime Integration**
   - Connect to existing Positron runtime services
   - Execute code chunks via language kernel
   - Capture execution results (stdout, stderr, display data)
   - Handle execution state (running, success, error)
   - Share environment with console vs isolated (configuration option)

### Phase 3: UI/UX Enhancements

**Features to Add:**

1. **Cell Actions**
   - "Run Cell" button/code lens (already exists)
   - "Clear Output" button on each output zone
   - "Run All Cells" command
   - "Clear All Outputs" command
   - "Restart & Run All" command

2. **Execution Indicators**
   - Spinner icon while running
   - Success checkmark (green)
   - Error icon (red) with error message
   - Execution time/timestamp

3. **Output Controls**
   - Collapse/expand output zone
   - Copy output to clipboard
   - Open output in new editor
   - Download plot as PNG/SVG
   - Interactive output (for plots, widgets)

4. **Configuration Settings**
   - `quarto.inlineOutput.enabled` - Enable/disable feature
   - `quarto.inlineOutput.maximumHeight` - Max height for output zones
   - `quarto.inlineOutput.clearOnRerun` - Clear old output when rerunning cell
   - `quarto.inlineOutput.shareEnvironment` - Share environment with console
   - `quarto.inlineOutput.persistence` - Memory only vs workspace cache

## Technical Challenges & Solutions

### Challenge 1: ZoneWidget Integration
**Issue:** ZoneWidget is VS Code core API, not stable extension API
**Solution:** Use it anyway - Positron is a fork, not subject to extension API restrictions

### Challenge 2: Output Rendering Security
**Issue:** HTML/JavaScript output could be malicious
**Solution:** 
- Sanitize HTML using DOMPurify or similar
- Use sandboxed iframe with restricted permissions
- Content Security Policy headers

### Challenge 3: Performance with Large Outputs
**Issue:** Large tables/plots could slow down editor
**Solution:**
- Virtualized scrolling for large data
- Lazy loading of images
- Truncate text output with "Show More" button
- Memory limits and warnings

### Challenge 4: File Edit Synchronization
**Issue:** Adding/removing lines moves cell positions
**Solution:**
- Track cells by content hash, not just line number
- Update output positions on document change events
- Re-parse cells on edit

### Challenge 5: Environment Sharing
**Issue:** Should cells share environment with console?
**Solution:** 
- Make it configurable
- Default: Shared (matches RStudio behavior)
- Alternative: Isolated (matches Jupyter behavior)
- Show environment selector in UI

## Testing Plan

1. **Unit Tests**
   - Parser regex patterns (already working)
   - Output rendering for each MIME type
   - State manager operations
   - Position tracking after edits

2. **Integration Tests**
   - Execute R code chunk, verify output displays
   - Execute Python code chunk, verify output displays
   - Error handling and display
   - Multiple cells in sequence
   - Clearing outputs

3. **Manual Testing**
   - Create qmd file with various chunk types
   - Run chunks, verify outputs
   - Edit file, verify outputs track correctly
   - Large outputs, performance
   - Error cases

## Example Usage

After implementation, users will:

1. Open a `.qmd` or `.rmd` file
2. See "Run Cell" code lens above each code chunk
3. Click "Run Cell" or use keyboard shortcut (Cmd+Shift+Enter)
4. Output appears inline below the code chunk
5. Can clear individual outputs or all outputs
6. Outputs persist in memory until file is closed (or workspace cache if configured)

## Estimated Effort

- **Phase 2 (Output Display):** 1-2 weeks
- **Phase 3 (UI/UX):** 1 week
- **Testing & Polish:** 1 week
- **Total:** 3-4 weeks for full implementation

## Related Issues

- GitHub Issue: posit-dev/positron#5640
- Discussion: posit-dev/positron#3718

## Files Modified

### Already Modified:
- ✅ `extensions/positron-code-cells/src/parser.ts` - Added qmd/rmd parsing

### To Be Created:
- ⏳ `extensions/positron-code-cells/src/outputZoneWidget.ts`
- ⏳ `extensions/positron-code-cells/src/outputRenderer.ts`
- ⏳ `extensions/positron-code-cells/src/outputStateManager.ts`
- ⏳ `extensions/positron-code-cells/src/runtimeIntegration.ts`

### To Be Modified:
- ⏳ `extensions/positron-code-cells/src/commands.ts` - Add output commands
- ⏳ `extensions/positron-code-cells/src/codeLenses.ts` - Add output actions
- ⏳ `extensions/positron-code-cells/package.json` - Add new commands/configs
