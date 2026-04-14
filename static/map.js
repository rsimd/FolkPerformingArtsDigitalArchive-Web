/**
 * MapLibre GL JS: show each place as a red-outlined polygon from /api/places.
 */
(function bootstrapFolkMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof maplibregl === "undefined") {
    return;
  }

  const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [141.15, 39.7],
    zoom: 7.6,
    attributionControl: true,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");

  const panel = document.getElementById("panel");
  const panelTitle = document.getElementById("panel-title");
  const panelMeta = document.getElementById("panel-meta");
  const panelNote = document.getElementById("panel-note");
  const panelList = document.getElementById("panel-list");
  const panelClose = document.getElementById("panel-close");

  const unitTypeLabel = {
    district: "地区",
    village: "村落",
    hamlet: "集落",
    ward: "大字・町丁",
  };

  const FILL_LAYER_ID = "folk-area-fill";
  const OUTLINE_LAYER_ID = "folk-area-outline";
  const SOURCE_ID = "folk-areas";

  function openPanel(place) {
    if (!panel || !panelTitle || !panelMeta || !panelNote || !panelList) {
      return;
    }
    panel.hidden = false;
    panelTitle.textContent = place.label || "";
    const ut = place.unit_type || "";
    const utJa = unitTypeLabel[ut] || ut;
    panelMeta.textContent = [
      place.prefecture,
      place.municipality,
      utJa ? `単位: ${utJa}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    panelNote.textContent = place.note || "";
    panelList.innerHTML = "";
    const perfs = Array.isArray(place.performances) ? place.performances : [];
    if (perfs.length === 0) {
      const li = document.createElement("li");
      li.textContent = "（未登録）";
      panelList.appendChild(li);
    } else {
      perfs.forEach((p) => {
        const li = document.createElement("li");
        const kind = p.kind ? `（${p.kind}）` : "";
        li.textContent = `${p.name || ""}${kind}`;
        panelList.appendChild(li);
      });
    }
  }

  if (panelClose && panel) {
    panelClose.addEventListener("click", () => {
      panel.hidden = true;
    });
  }

  /** @param {unknown} place */
  function polygonForPlace(place) {
    if (!place || typeof place !== "object") {
      return null;
    }
    const p = /** @type {Record<string, unknown>} */ (place);
    const b = p.boundary;
    if (b && typeof b === "object" && /** @type {Record<string, unknown>} */ (b).type === "Polygon") {
      return /** @type {{ type: "Polygon"; coordinates: number[][][] }} */ (b);
    }
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }
    const dLat = 0.011;
    const dLng = 0.014;
    const ring = [
      [lng - dLng, lat - dLat],
      [lng + dLng, lat - dLat],
      [lng + dLng, lat + dLat],
      [lng - dLng, lat + dLat],
      [lng - dLng, lat - dLat],
    ];
    return { type: "Polygon", coordinates: [ring] };
  }

  /** @param {maplibregl.LngLatBounds} bounds */
  function extendBoundsWithPolygon(bounds, poly) {
    const ring = poly.coordinates[0];
    if (!Array.isArray(ring)) {
      return;
    }
    ring.forEach((pt) => {
      if (!Array.isArray(pt) || pt.length < 2) {
        return;
      }
      const lng = Number(pt[0]);
      const lat = Number(pt[1]);
      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        bounds.extend([lng, lat]);
      }
    });
  }

  map.on("load", () => {
    fetch("/api/places")
      .then((r) => r.json())
      .then((data) => {
        const places = Array.isArray(data.places) ? data.places : [];
        /** @type {object[]} */
        const features = [];
        const bounds = new maplibregl.LngLatBounds();

        places.forEach((place) => {
          const poly = polygonForPlace(place);
          if (!poly) {
            return;
          }
          extendBoundsWithPolygon(bounds, poly);
          features.push({
            type: "Feature",
            id:
              typeof place.id === "string" || typeof place.id === "number"
                ? place.id
                : undefined,
            geometry: poly,
            properties: { placeData: JSON.stringify(place) },
          });
        });

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });

        map.addLayer({
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": "#d50000",
            "fill-opacity": 0.1,
          },
        });

        map.addLayer({
          id: OUTLINE_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": "#b71c1c",
            "line-width": 2,
          },
        });

        const interactiveLayers = [FILL_LAYER_ID, OUTLINE_LAYER_ID];

        map.on("click", (e) => {
          const feats = map.queryRenderedFeatures(e.point, {
            layers: interactiveLayers,
          });
          const feat = feats[0];
          if (!feat || typeof feat.properties?.placeData !== "string") {
            return;
          }
          try {
            const place = JSON.parse(feat.properties.placeData);
            openPanel(place);
            map.easeTo({
              center: e.lngLat,
              zoom: Math.max(map.getZoom(), 9),
            });
          } catch {
            /* ignore malformed payloads */
          }
        });

        map.on("mousemove", (e) => {
          const feats = map.queryRenderedFeatures(e.point, {
            layers: interactiveLayers,
          });
          map.getCanvas().style.cursor = feats.length ? "pointer" : "";
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 56, maxZoom: 10.5 });
        }
      })
      .catch(() => {
        console.error("Failed to load /api/places");
      });
  });
})();
