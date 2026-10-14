"""Tests for search index build script (F-SEARCH-01-03)."""

from __future__ import annotations

import json
from pathlib import Path

from scripts.build_search_index import FORBIDDEN_FIELDS, build_search_index

ROOT = Path(__file__).resolve().parent.parent


def test_build_produces_entries() -> None:
    index = build_search_index()
    assert "entries" in index
    assert len(index["entries"]) >= 9


def test_entry_structure() -> None:
    index = build_search_index()
    first = index["entries"][0]
    assert "slug" in first
    assert "label" in first
    assert "summary" in first
    assert "prefecture" in first
    assert "municipality" in first
    assert "map_category" in first
    assert "performance_names" in first
    assert "performance_kinds" in first


def test_no_forbidden_fields() -> None:
    index = build_search_index()
    for entry in index["entries"]:
        for field in FORBIDDEN_FIELDS:
            assert field not in entry, f"Forbidden field '{field}' found in entry"


def test_output_file_written() -> None:
    build_search_index()
    output = ROOT / "data" / "search_index.json"
    assert output.is_file()
    data = json.loads(output.read_text(encoding="utf-8"))
    assert "entries" in data
