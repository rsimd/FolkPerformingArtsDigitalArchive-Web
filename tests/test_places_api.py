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


def test_map_page_renders() -> None:
    """Root returns HTML map shell."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "民俗芸能地図" in response.text
