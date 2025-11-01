#
# Copyright (C) 2025 Posit Software, PBC. All rights reserved.
# Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
#

import pytest

from positron._vendor.lsprotocol.types import (
    FoldingRange,
    FoldingRangeKind,
    FoldingRangeParams,
    TextDocumentIdentifier,
)
from positron._vendor.pygls.workspace.text_document import TextDocument
from positron.positron_jedilsp import (
    PositronJediLanguageServer,
    _compute_folding_ranges,
    _is_cell_marker,
    _parse_comment_as_section,
    _parse_region_type,
    positron_folding_range,
    create_server as create_positron_server,
)

from .test_positron_jedilsp import create_server


def test_parse_comment_as_section():
    """Test parsing comment lines as section headers."""
    # Valid sections
    assert _parse_comment_as_section("# Section ----") == (1, "Section")
    assert _parse_comment_as_section("## Subsection ====") == (2, "Subsection")
    assert _parse_comment_as_section("### Level 3 ####") == (3, "Level 3")
    assert _parse_comment_as_section("  # Indented ----  ") == (1, "Indented")
    
    # Not sections (too few trailing chars)
    assert _parse_comment_as_section("# Not a section ---") is None
    assert _parse_comment_as_section("# Not a section --") is None
    
    # Not sections (no trailing chars)
    assert _parse_comment_as_section("# Just a comment") is None
    assert _parse_comment_as_section("## Another comment") is None


def test_parse_region_type():
    """Test parsing region markers."""
    # Valid regions
    assert _parse_region_type("#region") == "start"
    assert _parse_region_type("# region") == "start"
    assert _parse_region_type("#region my special area") == "start"
    assert _parse_region_type("  #region  ") == "start"
    
    assert _parse_region_type("#endregion") == "end"
    assert _parse_region_type("# endregion") == "end"
    assert _parse_region_type("#endregion end of area") == "end"
    
    # Not regions
    assert _parse_region_type("# # region") is None
    assert _parse_region_type("#regionsomething") is None
    assert _parse_region_type("# Just a comment") is None


def test_is_cell_marker():
    """Test cell marker detection."""
    # Valid cell markers
    assert _is_cell_marker("# %%") is True
    assert _is_cell_marker("# %% Cell title") is True
    assert _is_cell_marker("#+ ") is True
    assert _is_cell_marker("#+ Cell") is True
    
    # Not cell markers
    assert _is_cell_marker("# + This is not a cell") is False
    assert _is_cell_marker("# Just a comment") is False
    assert _is_cell_marker("## %%") is False


def test_folding_section_comments_basic():
    """Test basic comment section folding."""
    code = """
# First section ----
a = 1
b = 2

# Second section ----
c = 3
d = 4
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Should have 2 sections
    assert len(ranges) == 2
    assert ranges[0].start_line == 1  # "# First section ----"
    assert ranges[0].end_line == 4    # Line before "# Second section ----"
    assert ranges[1].start_line == 5  # "# Second section ----"
    assert ranges[1].end_line == 7    # Last line


def test_folding_nested_section_comments():
    """Test nested comment sections."""
    code = """
# Level 1 ----
a = 1

## Level 2 ----
b = 2

### Level 3 ----
c = 3

## Another Level 2 ----
d = 4

# Back to Level 1 ----
e = 5
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Should have multiple nested ranges
    assert len(ranges) > 0
    
    # Check that we have the main Level 1 sections
    level_1_ranges = [r for r in ranges if r.start_line in [1, 13]]
    assert len(level_1_ranges) == 2


def test_folding_regions():
    """Test VS Code region markers."""
    code = """
#region Important code
a = 1
b = 2
c = 3
#endregion

#region Another section
d = 4
#endregion
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Should have 2 regions
    assert len(ranges) == 2
    assert ranges[0].start_line == 1  # "#region Important code"
    assert ranges[0].end_line == 5    # "#endregion"
    assert ranges[1].start_line == 7  # "#region Another section"
    assert ranges[1].end_line == 9    # "#endregion"


def test_folding_cells():
    """Test cell folding (Jupyter-style)."""
    code = """
# %% First cell
a = 1
b = 2

# %% Second cell
c = 3

# %% Third cell
d = 4
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Should have 3 cells
    assert len(ranges) == 3
    assert ranges[0].start_line == 1  # "# %% First cell"
    assert ranges[0].end_line == 4    # Line before "# %% Second cell"
    assert ranges[1].start_line == 5  # "# %% Second cell"
    assert ranges[1].end_line == 7    # Line before "# %% Third cell"
    assert ranges[2].start_line == 8  # "# %% Third cell"
    assert ranges[2].end_line == 9    # Last line


def test_folding_mixed():
    """Test mixed folding strategies."""
    code = """
# First section ----
a = 1

## Subsection ----
#region nested region
b = 2
#endregion

# %% Cell in subsection
c = 3

# Another section ----
d = 4
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Should have multiple types of ranges
    assert len(ranges) > 0
    
    # Check we have both sections, regions, and cells
    section_ranges = [r for r in ranges if r.start_line in [1, 4, 12]]
    region_ranges = [r for r in ranges if r.start_line == 5]
    cell_ranges = [r for r in ranges if r.start_line == 9]
    
    assert len(section_ranges) >= 2  # At least main sections
    assert len(region_ranges) == 1   # The region
    assert len(cell_ranges) == 1     # The cell


def test_folding_empty_sections():
    """Test folding with empty sections."""
    code = """
# Empty section ----

# Another empty section ----

# Section with content ----
a = 1
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Should still create folding ranges even for empty sections
    assert len(ranges) == 3


def test_folding_range_feature(monkeypatch):
    """Test the folding range feature integration."""
    server = create_server()
    
    code = """
# Section ----
a = 1
b = 2
"""
    
    # Create a mock document
    document = TextDocument(uri="file:///test.py", source=code)
    
    # Mock the workspace to return our document
    class MockWorkspace:
        def get_text_document(self, uri):
            return document
    
    monkeypatch.setattr(server, "workspace", MockWorkspace())
    
    # Test the feature
    params = FoldingRangeParams(text_document=TextDocumentIdentifier(uri="file:///test.py"))
    ranges = positron_folding_range(server, params)
    
    assert ranges is not None
    assert len(ranges) > 0
    assert isinstance(ranges[0], FoldingRange)
    assert ranges[0].kind == FoldingRangeKind.Region


def test_folding_cells_interrupted_by_section():
    """Test that cells are closed when a section starts."""
    code = """
#+ Cell
a = 1

# Section ----
b = 2

#+ Other cell
c = 3
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Cell should close before section
    # Section should span appropriately
    # New cell should start after
    assert len(ranges) >= 3
    
    # Find the first cell range
    first_cell = [r for r in ranges if r.start_line == 1]
    assert len(first_cell) == 1
    assert first_cell[0].end_line < 4  # Should end before section


def test_folding_knitr_style_cells():
    """Test knitr-style cell markers (#+ )."""
    code = """
#+ Cell 1
a = 1

# + This is not a cell marker
b = 2

#+ Cell 2
c = 3
"""
    document = TextDocument(uri="file:///test.py", source=code)
    ranges = _compute_folding_ranges(document)
    
    # Should have 2 cells (not 3, since "# +" is not a marker)
    cell_ranges = [r for r in ranges if r.start_line in [1, 7]]
    assert len(cell_ranges) == 2
