"""Tests for by_region build script."""

from __future__ import annotations

import json
from pathlib import Path

from scripts.build_by_region import build_by_region

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "data" / "by_region"


def test_build_produces_regions() -> None:
    groups = build_by_region()
    assert len(groups) >= 5


def test_region_file_structure() -> None:
    groups = build_by_region()
    for key, places in groups.items():
        assert len(places) >= 1
        first = places[0]
        assert "slug" in first
        assert "slug" in first
        break  # one sample is enough


def test_output_files_exist() -> None:
    build_by_region()
    files = list(OUTPUT_DIR.glob("*.json"))
    assert len(files) >= 5
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        assert "prefecture" in data
        assert "municipality" in data
        assert "places" in data
        assert isinstance(data["places"], list)
