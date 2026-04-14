"""Regression tests for public map API."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok() -> None:
    """Health endpoint returns ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_places_has_list() -> None:
    """Places payload includes places array with at least one sample."""
    response = client.get("/api/places")
    assert response.status_code == 200
    body = response.json()
    assert "places" in body
    assert isinstance(body["places"], list)
    assert len(body["places"]) >= 1
    first = body["places"][0]
    assert "id" in first
    assert "lat" in first
    assert "lng" in first
    assert "performances" in first


def test_index_page_renders() -> None:
    """Root returns landing page."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "民俗芸能デジタルアーカイブプロジェクト" in response.text


def test_map_page_renders() -> None:
    """/map returns full-screen map page."""
    response = client.get("/map")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "民俗芸能地図" in response.text


def test_get_place_by_id() -> None:
    """Single-place endpoint returns the correct place object."""
    response = client.get("/api/places/iwate-morioka-tsushida")
    assert response.status_code == 200
    place = response.json()
    assert place["id"] == "iwate-morioka-tsushida"
    assert place["municipality"] == "盛岡市"


def test_get_place_not_found() -> None:
    """Single-place endpoint returns 404 for unknown id."""
    response = client.get("/api/places/nonexistent-place-id")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_data_places_json_served() -> None:
    """/data/places.json returns the raw JSON file from disk."""
    response = client.get("/data/places.json")
    assert response.status_code == 200
    body = response.json()
    assert "places" in body
    assert isinstance(body["places"], list)
    assert len(body["places"]) >= 1


def test_performance_detail_page() -> None:
    """/performances/<slug>/ returns detail page HTML."""
    response = client.get("/performances/iwate-morioka-tsushida/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "来歴" in response.text


def test_contribute_geo_page() -> None:
    """/contribute/geo returns the GeoJSON draw tool page."""
    response = client.get("/contribute/geo")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "GeoJSON" in response.text
