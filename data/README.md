# Data directory — Folk Performing Arts Digital Archive

## Schema overview

### places.json

Top-level key: `"places"` — an array of place objects.

Each place object contains:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique identifier (`prefecture-municipality-area`) |
| `slug` | string | yes | URL-friendly identifier (same as `id` for now) |
| `label` | string | yes | Human-readable Japanese label |
| `unit_type` | string | yes | Administrative unit type: `"district"`, `"village"`, or `"hamlet"` |
| `municipality` | string | yes | Municipality name (Japanese) |
| `prefecture` | string | yes | Prefecture name (Japanese) |
| `lat` | number | yes | Representative point latitude (WGS 84) |
| `lng` | number | yes | Representative point longitude (WGS 84) |
| `boundary` | object | no | GeoJSON Polygon defining the area boundary |
| `note` | string | no | Editorial note about data provenance |
| `content_flags` | object | yes | Content availability flags (see below) |
| `map_category` | string | yes | Category ID for map layer filtering |
| `summary` | string | yes | Short Japanese description (1-2 sentences) |
| `performances` | array | yes | List of performance objects at this place |

#### content_flags object

```json
{
  "has_detail_page": false,
  "has_video": false,
  "has_3d_motion": false
}
```

All flags default to `false` for sample entries. Set to `true` when corresponding
content becomes available.

#### map_category values

Derived from `performances[].kind` using these rules:

- `"神楽"` → `"kagura"`
- `"剣舞"` → `"kenbu"`
- `"獅子舞"` or `"鹿踊"` → `"shishi_shika"`
- `"踊り"` or `"舞踊"` → `"dance"`
- everything else → `"other"`

When a place has multiple performances with different `kind` values, the category
of the **first** performance is used.

### map_categories.json

Defines the set of map filter categories.

```json
{
  "categories": [
    { "id": "kenbu", "label_ja": "剣舞" },
    { "id": "kagura", "label_ja": "神楽" },
    { "id": "shishi_shika", "label_ja": "獅子舞・鹿踊" },
    { "id": "dance", "label_ja": "踊り・舞踊" },
    { "id": "other", "label_ja": "その他" }
  ]
}
```

## Boundary fallback logic

Entries that **do not** include a `boundary` field represent locations where only
a representative point (`lat`, `lng`) is known. In such cases, the frontend should
generate a provisional bounding rectangle around the representative point as a
visual placeholder. A suggested default is a rectangle extending approximately
0.005 degrees in each cardinal direction from the point (roughly 500 m radius),
but the exact size may be adjusted per zoom level or context.

Entries that **do** include a `boundary` field use a standard GeoJSON Polygon
(`"type": "Polygon"` with a `coordinates` array). The boundary data in the
current sample dataset is provisional and should be replaced with accurate
administrative boundaries from official survey data when available.
