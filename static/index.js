/**
 * Landing page JavaScript — Folk Performing Arts Digital Archive
 *
 * F-TOP-02: MapLibre GL JS overview map
 * F-TOP-03: Marker color coding based on content_flags
 * F-TOP-04: Side panel on marker click
 * F-TOP-05: Respects prefers-reduced-motion
 */
(function bootstrapLanding() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof maplibregl === "undefined") {
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [140.3, 39.2],
    zoom: 6,
    maxZoom: 15,
    attributionControl: true,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");

  /* --- Panel DOM references --- */
  const panel = document.getElementById("panel");
  const panelTitle = document.getElementById("panel-title");
  const panelMeta = document.getElementById("panel-meta");
  const panelNote = document.getElementById("panel-note");
  const panelFlags = document.getElementById("panel-flags");
  const panelList = document.getElementById("panel-list");
  const panelClose = document.getElementById("panel-close");

  /* --- Helper: determine marker color class based on content_flags --- */
  function markerColorClass(flags) {
    if (!flags || typeof flags !== "object") {
      return "marker--gray";
    }
    if (flags.has_3d_motion === true) return "marker--green";
    if (flags.has_video === true) return "marker--blue";
    if (flags.has_detail_page === true) return "marker--amber";
    return "marker--gray";
  }

  /* --- Helper: build flag badges for side panel --- */
  function renderFlags(flags) {
    if (!panelFlags) return;
    panelFlags.innerHTML = "";
    if (!flags || typeof flags !== "object") return;
    if (flags.has_3d_motion) {
      panelFlags.appendChild(makeBadge("3Dモーション", "flag-badge--3d"));
    }
    if (flags.has_video) {
      panelFlags.appendChild(makeBadge("動画", "flag-badge--video"));
    }
    if (flags.has_detail_page) {
      panelFlags.appendChild(makeBadge("詳細ページ", "flag-badge--detail"));
    }
  }

  function makeBadge(text, cls) {
    const span = document.createElement("span");
    span.className = "flag-badge " + cls;
    span.textContent = text;
    return span;
  }

  /* --- F-TOP-04: Open side panel --- */
  function openPanel(place) {
    if (!panel || !panelTitle || !panelMeta || !panelList) return;

    panel.hidden = false;
    panelTitle.textContent = place.label || "";

    const parts = [place.prefecture, place.municipality].filter(Boolean);
    panelMeta.textContent = parts.join(" \u00B7 ") || "";

    if (panelNote) {
      panelNote.textContent = place.note || "";
      panelNote.hidden = !place.note;
    }

    renderFlags(place.content_flags);

    panelList.innerHTML = "";
    const perfs = Array.isArray(place.performances) ? place.performances : [];
    if (perfs.length === 0) {
      const li = document.createElement("li");
      li.textContent = "\uFF08\u672A\u767B\u9332\uFF09";
      panelList.appendChild(li);
    } else {
      perfs.forEach(function (p) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "/performances/" + encodeURIComponent(p.id) + "/";
        var kind = p.kind ? "\uFF08" + p.kind + "\uFF09" : "";
        a.textContent = p.name || "";
        li.appendChild(a);
        if (kind) {
          var span = document.createElement("span");
          span.className = "perf-kind";
          span.textContent = " " + kind;
          li.appendChild(span);
        }
        panelList.appendChild(li);
      });
    }
  }

  if (panelClose && panel) {
    panelClose.addEventListener("click", function () {
      panel.hidden = true;
    });
  }

  /* --- Close panel on Escape --- */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel && !panel.hidden) {
      panel.hidden = true;
    }
  });

  /* --- Helper: polygon from boundary or lat/lng point --- */
  function polygonForPlace(place) {
    if (!place || typeof place !== "object") return null;
    var b = place.boundary;
    if (b && typeof b === "object" && b.type === "Polygon") {
      return b;
    }
    return null;
  }

  /* --- On map load, fetch and render --- */
  map.on("load", function () {
    fetch("/api/places")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var places = Array.isArray(data.places) ? data.places : [];
        var geojsonFeatures = [];
        var bounds = new maplibregl.LngLatBounds();

        places.forEach(function (place) {
          var lat = Number(place.lat);
          var lng = Number(place.lng);
          if (isNaN(lat) || isNaN(lng)) return;

          bounds.extend([lng, lat]);

          /* F-TOP-03: Create colored DOM marker */
          var el = document.createElement("div");
          el.className = "marker " + markerColorClass(place.content_flags);

          var marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);

          /* F-TOP-04: Click opens side panel */
          el.addEventListener("click", function () {
            openPanel(place);
            if (!reducedMotion) {
              map.flyTo({
                center: [lng, lat],
                zoom: Math.max(map.getZoom(), 9),
                duration: 800,
              });
            } else {
              map.jumpTo({
                center: [lng, lat],
                zoom: Math.max(map.getZoom(), 9),
              });
            }
          });

          /* Boundary polygon (if present) */
          var poly = polygonForPlace(place);
          if (poly) {
            geojsonFeatures.push({
              type: "Feature",
              id: place.id,
              geometry: poly,
              properties: {},
            });
          }
        });

        /* Render boundary polygons as red-bordered fills */
        if (geojsonFeatures.length > 0) {
          var SOURCE_ID = "folk-boundaries";
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: geojsonFeatures,
            },
          });

          map.addLayer({
            id: "folk-boundary-fill",
            type: "fill",
            source: SOURCE_ID,
            paint: {
              "fill-color": "#d50000",
              "fill-opacity": 0.08,
            },
          });

          map.addLayer({
            id: "folk-boundary-outline",
            type: "line",
            source: SOURCE_ID,
            paint: {
              "line-color": "#b71c1c",
              "line-width": 2,
            },
          });
        }

        /* Fit to Tohoku region (Aomori to Fukushima) */
        if (!bounds.isEmpty()) {
          map.fitBounds([[138.5, 36.8], [142.5, 41.5]], { padding: 40 });
        }
      })
      .catch(function () {
        console.error("Failed to load /api/places");
      });
  });
})();
