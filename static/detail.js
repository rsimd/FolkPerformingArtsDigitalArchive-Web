/* detail.js — Individual performance detail page */

(function () {
  "use strict";

  var slug = window.location.pathname.split("/").filter(Boolean)[1];
  if (!slug) return;

  fetch("/api/places/" + slug)
    .then(function (r) {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    })
    .then(function (place) {
      renderPlace(place);
    })
    .catch(function () {
      document.getElementById("detail-title").textContent = "エントリが見つかりません";
    });

  function renderPlace(place) {
    var perfName = (place.performances && place.performances[0])
      ? place.performances[0].name
      : place.label;

    document.getElementById("page-title").textContent = perfName + " | 民俗芸能デジタルアーカイブ";
    document.getElementById("detail-title").textContent = perfName;
    document.getElementById("detail-location").textContent = place.prefecture + " " + place.municipality;
    document.getElementById("breadcrumb-muni").textContent = place.municipality;
    document.getElementById("breadcrumb-name").textContent = perfName;

    // Flags
    var flagsEl = document.getElementById("detail-flags");
    var flags = place.content_flags || {};
    if (flags.has_detail_page) flagsEl.innerHTML += '<span class="flag-badge">詳細あり</span>';
    if (flags.has_video) flagsEl.innerHTML += '<span class="flag-badge">動画あり</span>';
    if (flags.has_3d_motion) flagsEl.innerHTML += '<span class="flag-badge">3Dあり</span>';

    // History section — use summary as placeholder
    var historyEl = document.getElementById("history-text");
    if (place.summary) {
      historyEl.textContent = place.summary;
    } else {
      historyEl.textContent = "準備中";
      historyEl.classList.add("empty");
    }

    // Placeholder sections
    ["group", "meaning", "scripts", "refs"].forEach(function (id) {
      var el = document.getElementById(id + "-text");
      el.textContent = "準備中";
      el.classList.add("empty");
    });

    // Tabs
    var tabs = document.querySelectorAll(".tab");
    var panels = document.querySelectorAll(".tab-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        panels.forEach(function (p) { p.classList.remove("active"); });
        tab.classList.add("active");
        document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
      });
    });

    // Provenance placeholder
    var provEl = document.getElementById("provenance-list");
    provEl.innerHTML = '<div class="provenance-item">情報提供者の記録は準備中です</div>';
  }
})();
