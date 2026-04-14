"""FastAPI entry: folk map API and map UI."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DATA_PATH = DATA_DIR / "places.json"
TEMPLATES_DIR = ROOT_DIR / "templates"
STATIC_DIR = ROOT_DIR / "static"

app = FastAPI(
    title="Folk Performing Arts Map",
    description="民俗芸能地図 API と閲覧 UI",
    version="0.1.0",
)

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")


def _load_places_raw() -> dict[str, object]:
    if not DATA_PATH.is_file():
        return {"places": []}
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/places")
def get_places() -> JSONResponse:
    """Return all map pins (district / village units) and linked performances."""
    return JSONResponse(_load_places_raw())


@app.get("/api/places/{place_id}")
def get_place(place_id: str) -> JSONResponse:
    """Return a single place by id, or 404 if not found."""
    data = _load_places_raw()
    for place in data.get("places", []):
        if place.get("id") == place_id:
            return JSONResponse(place)
    return JSONResponse({"detail": "Place not found"}, status_code=404)


@app.get("/", response_class=HTMLResponse)
def index_page(request: Request) -> HTMLResponse:
    """ランディングページ（ヒーロー＋俯瞰地図）."""
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/map", response_class=HTMLResponse)
def map_page(request: Request) -> HTMLResponse:
    """民俗芸能地図 全画面表示（OpenFreeMap + MapLibre GL JS）."""
    return templates.TemplateResponse(request=request, name="map.html")


@app.get("/performances/{slug}/", response_class=HTMLResponse)
def performance_detail(request: Request, slug: str) -> HTMLResponse:
    """個別芸能ページ（F-DET）."""
    return templates.TemplateResponse(request=request, name="detail.html")


@app.get("/contribute/geo", response_class=HTMLResponse)
def contribute_geo(request: Request) -> HTMLResponse:
    """GeoJSON 寄稿ツール（F-GEO）."""
    return templates.TemplateResponse(request=request, name="contribute_geo.html")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
