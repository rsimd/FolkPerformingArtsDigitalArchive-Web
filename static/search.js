/* search.js — Client-side search using search_index.json */

(function () {
  "use strict";

  var entries = [];
  var municipalities = [];
  var categories = [];

  var searchInput = document.getElementById("search-input");
  var filterMuni = document.getElementById("filter-municipality");
  var filterCat = document.getElementById("filter-category");
  var btnReset = document.getElementById("btn-reset");
  var cardList = document.getElementById("card-list");
  var resultCount = document.getElementById("result-count");

  // Load data
  Promise.all([
    fetch("/data/search_index.json").then(function (r) { return r.json(); }),
    fetch("/data/map_categories.json").then(function (r) { return r.json(); }),
  ]).then(function (results) {
    entries = results[0].entries || [];
    categories = (results[1].categories || []).map(function (c) { return c; });

    populateFilters();
    render(entries);
  });

  function populateFilters() {
    var muniSet = {};
    entries.forEach(function (e) {
      if (e.municipality) muniSet[e.municipality] = true;
    });
    municipalities = Object.keys(muniSet).sort();
    municipalities.forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      filterMuni.appendChild(opt);
    });

    categories.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.label_ja;
      filterCat.appendChild(opt);
    });
  }

  function normalize(str) {
    return (str || "").toLowerCase().normalize("NFKC");
  }

  function search(query, muni, cat) {
    var q = normalize(query);
    return entries.filter(function (e) {
      if (muni && e.municipality !== muni) return false;
      if (cat && e.map_category !== cat) return false;
      if (!q) return true;
      var searchable = [
        e.label, e.summary, e.prefecture, e.municipality,
        (e.performance_names || []).join(" "),
        (e.performance_kinds || []).join(" "),
      ].join(" ");
      return normalize(searchable).indexOf(q) !== -1;
    });
  }

  function render(results) {
    // Expand entries: one card per performance
    var cards = [];
    results.forEach(function (e) {
      var names = e.performance_names || [];
      var kinds = e.performance_kinds || [];
      if (names.length === 0) {
        cards.push({ title: e.label, kind: "", slug: e.slug, location: e.prefecture + " " + e.municipality, summary: e.summary || "" });
        return;
      }
      for (var i = 0; i < names.length; i++) {
        cards.push({ title: names[i], kind: kinds[i] || "", slug: e.slug, location: e.prefecture + " " + e.municipality, summary: e.summary || "" });
      }
    });

    resultCount.textContent = cards.length + " 件";
    if (cards.length === 0) {
      cardList.innerHTML = '<p class="no-results">該当するエントリがありません</p>';
      return;
    }
    cardList.innerHTML = cards.map(function (c) {
      var kindTag = c.kind ? '<span class="kind-tag">' + escHtml(c.kind) + '</span>' : "";
      return (
        '<div class="card">' +
          '<div class="card-title"><a href="/performances/' + escHtml(c.slug) + '/">' + escHtml(c.title) + '</a></div>' +
          '<div class="card-location">' + escHtml(c.location) + '</div>' +
          (kindTag ? '<div class="card-kinds">' + kindTag + '</div>' : '') +
          '<div class="card-summary">' + escHtml(c.summary) + '</div>' +
        '</div>'
      );
    }).join("");
  }

  function escHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  var debounceTimer;
  function onFilterChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var results = search(searchInput.value, filterMuni.value, filterCat.value);
      render(results);
    }, 200);
  }

  searchInput.addEventListener("input", onFilterChange);
  filterMuni.addEventListener("change", onFilterChange);
  filterCat.addEventListener("change", onFilterChange);
  btnReset.addEventListener("click", function () {
    searchInput.value = "";
    filterMuni.value = "";
    filterCat.value = "";
    render(entries);
  });
})();
