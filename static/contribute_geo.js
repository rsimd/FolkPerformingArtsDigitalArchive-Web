/* contribute_geo.js — GeoJSON tool for folk performing arts contributions */

(function () {
  "use strict";

  var categorySelect = document.getElementById("category-select");
  var geojsonArea = document.getElementById("geojson-area");
  var mapEl = document.getElementById("map");

  // Only initialize map when the details element is opened
  var mapInitialized = false;
  var details = document.querySelector(".geojson-tool");
  var draw, map;

  if (details) {
    details.addEventListener("toggle", function () {
      if (details.open && !mapInitialized) {
        initMap();
        mapInitialized = true;
      }
    });
  }

  function initMap() {
    map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [141.1, 39.5],
      zoom: 7,
    });

    draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(draw);
    map.addControl(new maplibregl.NavigationControl());

    // Load categories
    fetch("/data/map_categories.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data.categories.forEach(function (cat) {
          var opt = document.createElement("option");
          opt.value = cat.id;
          opt.textContent = cat.label_ja;
          categorySelect.appendChild(opt);
        });
      })
      .catch(function () {});

    map.on("draw.create", updateOutput);
    map.on("draw.update", updateOutput);
    map.on("draw.delete", updateOutput);
  }

  function getDrawnGeoJSON() {
    if (!draw) return null;
    var features = draw.getAll();
    if (!features || !features.features || features.features.length === 0) return null;
    return features;
  }

  function updateOutput() {
    var data = getDrawnGeoJSON();
    geojsonArea.value = data ? JSON.stringify(data, null, 2) : "";
  }

  // Copy button
  document.getElementById("btn-copy").addEventListener("click", function () {
    var data = getDrawnGeoJSON();
    if (!data) { alert("ポリゴンを描画してください。"); return; }
    var category = categorySelect.value;
    var payload = { geojson: data, map_category: category || undefined };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(function () {
      alert("クリップボードにコピーしました。Google Form の地域情報欄に貼り付けてください。");
    });
  });

  // Download button
  document.getElementById("btn-download").addEventListener("click", function () {
    var data = getDrawnGeoJSON();
    if (!data) { alert("ポリゴンを描画してください。"); return; }
    var category = categorySelect.value;
    var payload = { geojson: data, map_category: category || undefined };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "contribution_geojson.json";
    a.click();
    URL.revokeObjectURL(url);
  });
})();
