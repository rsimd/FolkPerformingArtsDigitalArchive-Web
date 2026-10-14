"""Build by_region JSON files grouped by prefecture + municipality."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLACES_PATH = ROOT / "data" / "places.json"
OUTPUT_DIR = ROOT / "data" / "by_region"


def _sanitize_filename(text: str) -> str:
    return re.sub(r"[^\w]", "_", text)


def build_by_region() -> dict[str, list[dict]]:
    if not PLACES_PATH.is_file():
        return {}

    with PLACES_PATH.open(encoding="utf-8") as f:
        raw = json.load(f)

    groups: dict[str, list[dict]] = {}
    for place in raw.get("places", []):
        pref = place.get("prefecture", "")
        muni = place.get("municipality", "")
        key = f"{pref}_{muni}"
        groups.setdefault(key, []).append({
            "slug": place.get("slug", ""),
            "label": place.get("label", ""),
            "lat": place.get("lat"),
            "lng": place.get("lng"),
            "map_category": place.get("map_category", ""),
            "content_flags": place.get("content_flags", {}),
            "summary": place.get("summary", ""),
            "performances": place.get("performances", []),
        })

    return groups


def main() -> None:
    groups = build_by_region()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for key, places in groups.items():
        parts = key.split("_", 1)
        filename = _sanitize_filename(key) + ".json"
        output = OUTPUT_DIR / filename
        data = {
            "prefecture": parts[0] if len(parts) > 0 else "",
            "municipality": parts[1] if len(parts) > 1 else "",
            "places": places,
        }
        with output.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(groups)} region files in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
