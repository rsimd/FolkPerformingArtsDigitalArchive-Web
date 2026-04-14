"""FastAPI entry: folk map API and map UI."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT_DIR / "data" / "places.json"
TEMPLATES_DIR = ROOT_DIR / "templates"
STATIC_DIR = ROOT_DIR / "static"

app = FastAPI(
    title="Folk Performing Arts Map",
    description="民俗芸能地図 API と閲覧 UI",
    version="0.1.0",
)

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def _load_places_raw() -> dict[str, object]:
    if not DATA_PATH.is_file():
        return {"places": []}
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/places")
def get_places() -> JSONResponse:
    """Return all map pins (district / village units) and linked performances."""
    return JSONResponse(_load_places_raw())


@app.get("/", response_class=HTMLResponse)
def map_page(request: Request) -> HTMLResponse:
    """民俗芸能地図（OpenFreeMap + MapLibre GL JS）."""
    return templates.TemplateResponse(request=request, name="map.html")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
