/* contribute_geo.js — GeoJSON drawing tool for folk performing arts contributions */

(function () {
  "use strict";

  var map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [141.1, 39.5],
    zoom: 7,
  });

  var draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: { polygon: true, trash: true },
  });
  map.addControl(draw);
  map.addControl(new maplibregl.NavigationControl());

  // Load categories
  var categorySelect = document.getElementById("category-select");
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
    .catch(function () { /* categories will remain empty */ });

  var geojsonArea = document.getElementById("geojson-area");

  function getDrawnGeoJSON() {
    var features = draw.getAll();
    if (!features || !features.features || features.features.length === 0) {
      return null;
    }
    return features;
  }

  function updateOutput() {
    var data = getDrawnGeoJSON();
    if (data) {
      geojsonArea.value = JSON.stringify(data, null, 2);
    } else {
      geojsonArea.value = "";
    }
  }

  map.on("draw.create", updateOutput);
  map.on("draw.update", updateOutput);
  map.on("draw.delete", updateOutput);

  // Copy button
  document.getElementById("btn-copy").addEventListener("click", function () {
    var data = getDrawnGeoJSON();
    if (!data) {
      alert("ポリゴンを描画してください。");
      return;
    }
    var category = categorySelect.value;
    var payload = { geojson: data, map_category: category || undefined };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(function () {
      alert("クリップボードにコピーしました。");
    });
  });

  // Download button
  document.getElementById("btn-download").addEventListener("click", function () {
    var data = getDrawnGeoJSON();
    if (!data) {
      alert("ポリゴンを描画してください。");
      return;
    }
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
