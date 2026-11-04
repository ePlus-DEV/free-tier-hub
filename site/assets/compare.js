import { compactQuantityText } from './compact-numbers.js';
/* Lightweight client-side service comparison. No tracking or external dependencies. */
(function () {
  "use strict";
  var MAX = 4, KEY = "fth-compare-selection-v1";
  var pageRoot = document.querySelector("main [data-compare-root]");
  var dialog = document.getElementById("compare-dialog");
  var root = pageRoot || (dialog && dialog.querySelector("[data-compare-root]"));
  var tray = document.getElementById("compare-tray");
  var compareURL = (tray && tray.getAttribute("data-compare-url")) ||
    (root && root.getAttribute("data-compare-url")) || "/compare/";
  var selected = [];
  var catalog = [];
  var catalogMap = Object.create(null);
  var status = root && root.querySelector("#compare-status");
  var table = root && root.querySelector("#compare-table");
  var picker = root && root.querySelector("#compare-picker");
  var suggestions = root && root.querySelector("#compare-suggestions");
  var differences = root && root.querySelector("#compare-differences");
  var warning = root && root.querySelector("#compare-category-warning");
  var url = new URL(window.location.href);
  var fromURL = pageRoot && url.searchParams.has("ids");
  var catalogLoading = null;
  var lastFocused = null;

  function valid(id) { return typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id); }
  function clean(ids) {
    var seen = Object.create(null);
    return ids.filter(function (id) {
      if (!valid(id) || seen[id]) return false;
      seen[id] = true;
      return true;
    }).slice(0, MAX);
  }
  function loadStored() {
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(KEY) || "[]");
      return Array.isArray(saved) ? clean(saved) : [];
    } catch (_error) { return []; }
  }
  function persist() {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(selected)); } catch (_error) {}
  }
  function shareURL(ids) {
    return compareURL + (ids.length ? "?ids=" + encodeURIComponent(ids.join(",")) : "");
  }
  function el(tag, cls, value) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function announce(message) {
    var node = document.getElementById("compare-live");
    if (node) node.textContent = message;
  }
  function syncButtons() {
    document.querySelectorAll("[data-compare-add]").forEach(function (button) {
      var id = button.getAttribute("data-compare-add");
      var active = selected.indexOf(id) >= 0;
      button.setAttribute("aria-pressed", String(active));
      button.textContent = active ? "✓ Added" : "+ Compare";
      button.disabled = !active && selected.length >= MAX;
      button.setAttribute("aria-label", (active ? "Remove " : "Compare ") +
        (button.getAttribute("data-compare-name") || id));
    });
  }
  function renderTray() {
    if (!tray) return;
    tray.hidden = selected.length === 0 || !!pageRoot;
    if (tray.hidden) { syncButtons(); return; }
    var list = tray.querySelector(".compare-tray-items");
    var count = tray.querySelector(".compare-tray-count");
    var link = tray.querySelector(".compare-tray-go");
    list.replaceChildren();
    selected.forEach(function (id) {
      var chip = el("span", "compare-chip");
      var card = document.querySelector('[data-service-id="' + id + '"] .card-identity h3 a');
      chip.appendChild(el("span", "", card ? card.textContent : id));
      var remove = el("button", "", "×");
      remove.type = "button";
      remove.setAttribute("data-compare-remove", id);
      remove.setAttribute("aria-label", "Remove " + id);
      chip.appendChild(remove);
      list.appendChild(chip);
    });
    count.textContent = selected.length + " / " + MAX + " selected";
    link.href = shareURL(selected);
    link.classList.toggle("is-disabled", selected.length < 2);
    link.setAttribute("aria-disabled", String(selected.length < 2));
    syncButtons();
  }
  function setSelection(ids, message) {
    selected = clean(ids);
    persist();
    renderTray();
    if (pageRoot) {
      var next = new URL(window.location.href);
      if (selected.length) next.searchParams.set("ids", selected.join(","));
      else next.searchParams.delete("ids");
      window.history.replaceState(null, "", next.pathname + next.search + next.hash);
    }
    if (root && (pageRoot || (dialog && dialog.open))) renderCompare();
    if (message) announce(message);
  }
  function add(id) {
    if (selected.indexOf(id) >= 0) {
      setSelection(selected.filter(function (part) { return part !== id; }), "Removed from comparison.");
    } else if (selected.length >= MAX) {
      announce("Select at most four services.");
    } else {
      setSelection(selected.concat(id), "Added to comparison.");
    }
  }
  function formatValue(value, field) {
    if (field === "credit_card") return {yes:"Required",no:"Not required",check:"Check provider"}[value] || "Check provider";
    if (field === "commercial_use") return {yes:"Allowed",no:"Restricted",check:"Check provider"}[value] || "Check provider";
    if (field === "plan") return {ongoing:"Ongoing free allowance","monthly-credit":"Recurring free credit","limited-duration":"Time-limited","temporary-resource":"Temporary resource"}[value] || value || "Not specified";
    if (field === "deployment_model") return {"self-hosted":"Self-hosted",cloud:"Cloud",local:"Local",hybrid:"Hybrid",unclassified:"Not classified"}[value] || "Not classified";
    if (field === "eligibility") return value === "existing-users-only" ? "Existing accounts only" : "Check provider eligibility";
    if (field === "free_limit" || field === "watch_out") {
      return compactQuantityText(value || "Not specified");
    }
    return value || "Not specified";
  }
  function renderCompare() {
    if (!root || !table) return;
    table.replaceChildren();
    var items = selected.map(function (id) { return catalogMap[id]; }).filter(Boolean);
    var empty = root.querySelector("#compare-empty");
    var results = root.querySelector("#compare-results");
    var share = root.querySelector("#compare-share");
    if (empty) empty.hidden = items.length >= 2;
    if (results) results.hidden = items.length < 2;
    if (share) {
      share.disabled = items.length < 2;
      share.setAttribute("aria-label", "Copy link to compare " + items.length + " services");
    }
    if (items.length < 2) return;
    if (warning) warning.hidden = items.every(function (item) { return item.category === items[0].category; });
    var fields = [
      ["Category","category"],["Offer type","plan"],["Free allowance","free_limit"],
      ["Payment card","credit_card"],["Commercial use","commercial_use"],
      ["Deployment model","deployment_model"],["Eligibility","eligibility"],
      ["Important caveats","watch_out"],["Last reviewed","last_checked"],
      ["Official source","pricing_url"]
    ];
    var head = el("thead"), row = el("tr");
    var label = el("th", "compare-feature-heading", "Feature");
    label.scope = "col"; row.appendChild(label);
    items.forEach(function (item) {
      var th = el("th", "compare-service-heading");
      th.scope = "col";
      var name = el("a", "", item.name);
      name.href = root.getAttribute("data-service-base") + encodeURIComponent(item.id) + "/";
      th.appendChild(name);
      var remove = el("button", "compare-remove", "Remove");
      remove.type = "button";
      remove.setAttribute("data-compare-remove", item.id);
      remove.setAttribute("aria-label", "Remove " + item.name + " from comparison");
      th.appendChild(remove);
      row.appendChild(th);
    });
    head.appendChild(row); table.appendChild(head);
    var body = el("tbody");
    fields.forEach(function (field) {
      var values = items.map(function (item) { return formatValue(item[field[1]], field[1]); });
      // Compare original provider values, not abbreviated display text; two
      // different quotas can render identically at the chosen precision.
      var originals = items.map(function (item) { return String(item[field[1]] ?? ""); });
      var same = originals.every(function (value) { return value === originals[0]; });
      if (differences && differences.checked && same) return;
      var tr = el("tr");
      var th = el("th", "", field[0]); th.scope = "row"; tr.appendChild(th);
      items.forEach(function (item, i) {
        var td = el("td", "", field[1] === "pricing_url" ? "" : values[i]);
        if ((field[1] === "free_limit" || field[1] === "watch_out") &&
            values[i] !== originals[i]) {
          td.title = originals[i];
          td.setAttribute("aria-label", originals[i]);
        }
        if (field[1] === "pricing_url") {
          var link = el("a", "", "Official pricing ↗");
          try {
            var target = new URL(item.pricing_url);
            if (target.protocol === "https:") {
              link.href = target.href;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              td.appendChild(link);
            } else td.textContent = "Check provider";
          } catch (_error) { td.textContent = "Check provider"; }
        }
        if ((field[1] === "credit_card" || field[1] === "commercial_use") && values[i] === "Check provider") {
          td.classList.add("compare-unverified");
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
  }
  function updateSuggestions() {
    if (!picker || !suggestions) return;
    var q = picker.value.trim().toLowerCase();
    suggestions.replaceChildren();
    if (q.length < 2) { suggestions.hidden = true; return; }
    var matches = catalog.filter(function (item) {
      return selected.indexOf(item.id) < 0 &&
        (item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
    }).slice(0, 8);
    matches.forEach(function (item) {
      var button = el("button", "compare-suggestion", item.name + " · " + item.category);
      button.type = "button";
      button.setAttribute("data-compare-add", item.id);
      button.setAttribute("data-compare-name", item.name);
      button.disabled = selected.length >= MAX;
      suggestions.appendChild(button);
    });
    suggestions.hidden = matches.length === 0;
  }
  document.addEventListener("click", function (event) {
    var addButton = event.target.closest("[data-compare-add]");
    if (addButton) {
      event.preventDefault();
      add(addButton.getAttribute("data-compare-add"));
      if (picker) { picker.value = ""; updateSuggestions(); }
      return;
    }
    var removeButton = event.target.closest("[data-compare-remove]");
    if (removeButton) {
      setSelection(selected.filter(function (id) {
        return id !== removeButton.getAttribute("data-compare-remove");
      }), "Removed from comparison.");
      updateSuggestions();
      return;
    }
    if (event.target.closest("[data-compare-clear]")) {
      setSelection([], "Comparison cleared.");
      updateSuggestions();
      return;
    }
    var openButton = event.target.closest(".compare-tray-go");
    if (openButton) {
      event.preventDefault();
      if (selected.length < 2) { announce("Select at least two services."); return; }
      if (dialog && typeof dialog.showModal === "function") {
        lastFocused = openButton;
        dialog.showModal();
        ensureCatalog();
        renderCompare();
        var close = dialog.querySelector("[data-compare-close]");
        if (close) close.focus();
      } else window.location.assign(shareURL(selected));
      return;
    }
    if (event.target.closest("[data-compare-close]")) {
      if (dialog) dialog.close();
      return;
    }
    if (event.target.closest("#compare-share") && selected.length >= 2) {
      var value = new URL(shareURL(selected), window.location.origin).href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { announce("Comparison link copied."); },
          function () { announce("Copy this page URL to share the comparison."); });
      } else announce("Copy this page URL to share the comparison.");
    }
  });
  // Lazy-rendered cards are inserted using replaceChildren(), so every newly
  // drawn card needs its selected/disabled state updated after rendering.
  if (window.MutationObserver) {
    var grid = document.getElementById("service-grid");
    if (grid) new MutationObserver(syncButtons).observe(grid, {childList:true});
  }
  selected = loadStored();
  if (fromURL) {
    var raw = url.searchParams.get("ids") || "";
    selected = raw.length <= 500 ? clean(raw.split(",")) : [];
  }
  renderTray();
  function ensureCatalog() {
    if (!root || catalog.length || catalogLoading) return catalogLoading;
    var source = root.getAttribute("data-catalog-url");
    if (status) status.textContent = "Loading catalog…";
    catalogLoading = window.fetch(source, { credentials:"same-origin" })
      .then(function (response) {
        if (!response.ok) throw Error("Catalog unavailable");
        return response.json();
      }).then(function (items) {
        if (!Array.isArray(items) || !items.length) throw Error("Invalid catalog");
        catalog = items.filter(function (item) { return valid(item.id) && typeof item.name === "string"; });
        catalog.forEach(function (item) { catalogMap[item.id] = item; });
        var missing = selected.filter(function (id) { return !catalogMap[id]; });
        selected = selected.filter(function (id) { return !!catalogMap[id]; });
        persist();
        if (status) status.textContent = missing.length ?
          "Some services in the shared link are no longer available: " + missing.join(", ") : "";
        renderCompare(); updateSuggestions();
      }).catch(function () {
        if (status) status.textContent = "Could not load catalog. Please refresh or try again later.";
        catalogLoading = null;
      });
    return catalogLoading;
  }
  if (root) {
    if (pageRoot) ensureCatalog();
    if (picker) picker.addEventListener("input", updateSuggestions);
    if (differences) differences.addEventListener("change", renderCompare);
  }
  if (dialog) {
    dialog.addEventListener("close", function () {
      if (lastFocused && lastFocused.isConnected) lastFocused.focus();
      lastFocused = null;
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
  }
})();
