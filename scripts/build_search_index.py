"""Build search_index.json from places.json for client-side search (F-SEARCH)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLACES_PATH = ROOT / "data" / "places.json"
OUTPUT_PATH = ROOT / "data" / "search_index.json"

# Fields that must NOT appear in the index (F-SEARCH-03)
FORBIDDEN_FIELDS = {"contact", "email", "phone", "admin_note", "consent_data"}


def build_search_index() -> dict:
    if not PLACES_PATH.is_file():
        return {"entries": []}

    with PLACES_PATH.open(encoding="utf-8") as f:
        raw = json.load(f)

    entries = []
    for place in raw.get("places", []):
        entry = {
            "slug": place.get("slug", ""),
            "label": place.get("label", ""),
            "summary": place.get("summary", ""),
            "prefecture": place.get("prefecture", ""),
            "municipality": place.get("municipality", ""),
            "map_category": place.get("map_category", ""),
            "performance_names": [p.get("name", "") for p in place.get("performances", [])],
            "performance_kinds": [p.get("kind", "") for p in place.get("performances", [])],
        }
        # Safety check: no forbidden fields
        for key in FORBIDDEN_FIELDS:
            entry.pop(key, None)
        entries.append(entry)

    return {"entries": entries}


def main() -> None:
    index = build_search_index()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"Generated {OUTPUT_PATH} with {len(index['entries'])} entries")


if __name__ == "__main__":
    main()
