/* Free Tier Hub — accessible progressive enhancement; no runtime dependencies. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var siteHeader = document.querySelector(".site-header");
  function syncHeaderHeight() {
    if (siteHeader) doc.style.setProperty("--site-header-height", siteHeader.getBoundingClientRect().height + "px");
  }
  syncHeaderHeight();
  if (siteHeader && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(syncHeaderHeight).observe(siteHeader);
  } else {
    window.addEventListener("resize", syncHeaderHeight);
  }
  var menuToggle = document.getElementById("menu-toggle");
  if (menuToggle) {
    doc.classList.add("nav-ready");
    doc.setAttribute("data-menu-open", "false");
    function setMenu(open) {
      doc.setAttribute("data-menu-open", String(open));
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    }
    menuToggle.addEventListener("click", function () {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenu(false); menuToggle.focus();
      }
    });
    document.querySelectorAll(".primary-nav a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
  }
  var themeToggle = document.getElementById("theme-toggle");
  var storedTheme = null;
  try { storedTheme = window.localStorage.getItem("fth-theme"); } catch (_error) {}
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  var theme = storedTheme === "dark" || storedTheme === "light"
    ? storedTheme : (prefersDark ? "dark" : "light");
  function applyTheme(next) {
    theme = next;
    doc.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.querySelectorAll("[data-fa-icon]").forEach(function (drawing) {
        drawing.toggleAttribute("hidden", drawing.getAttribute("data-fa-icon") !== (theme === "dark" ? "sun" : "moon"));
      });
      themeToggle.setAttribute("aria-label",
        theme === "dark" ? "Switch to light appearance" : "Switch to dark appearance");
      themeToggle.setAttribute("title",
        theme === "dark" ? "Light mode" : "Dark mode");
      themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    }
  }
  applyTheme(theme);
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try { window.localStorage.setItem("fth-theme", next); } catch (_error) {}
    });
  }

  // Works on every page, including detail and 404 pages without a search grid.
  var backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    var updateBackToTop = function () {
      backToTop.hidden = window.scrollY < 360;
    };
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener("click", function () {
      var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
    });
  }

  var headerToggle = document.getElementById("header-search-toggle");
  var headerPanel = document.getElementById("header-search-panel");
  var headerSearch = document.getElementById("header-search");
  var headerSearchForm = document.getElementById("header-search-form");
  function closeHeaderSearch() {
    if (!headerPanel || !headerToggle) return;
    headerPanel.hidden = true;
    headerToggle.setAttribute("aria-expanded", "false");
  }
  if (headerToggle && headerPanel && headerSearch) {
    headerToggle.addEventListener("click", function () {
      var opening = headerPanel.hidden;
      headerPanel.hidden = !opening;
      headerToggle.setAttribute("aria-expanded", String(opening));
      if (opening) { headerSearch.focus(); headerSearch.select(); }
      else headerToggle.focus();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !headerPanel.hidden) {
        event.preventDefault(); closeHeaderSearch(); headerToggle.focus();
      }
    });
    document.addEventListener("click", function (event) {
      if (!headerPanel.hidden && !headerPanel.contains(event.target) &&
          !headerToggle.contains(event.target)) closeHeaderSearch();
    });
  }
  // Register global search before the directory-only early return below.
  if (headerSearchForm) headerSearchForm.addEventListener("submit", function (event) {
    var directorySearch = document.getElementById("search");
    var directoryForm = document.getElementById("directory-search-form");
    // Other pages use the form's GET action, including isolated PR previews.
    if (!directorySearch || !directoryForm) return;
    event.preventDefault();
    directorySearch.value = headerSearch.value;
    directoryForm.requestSubmit();
    closeHeaderSearch();
  });
  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var editing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if ((event.key === "/" && !editing) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
      if (!headerToggle || !headerPanel || !headerSearch) return;
      event.preventDefault();
      headerPanel.hidden = false;
      headerToggle.setAttribute("aria-expanded", "true");
      headerSearch.focus(); headerSearch.select();
    }
  });
  var search = document.getElementById("search");
  var heroSearch = document.getElementById("hero-search");
  var filterToggle = document.getElementById("advanced-filter-toggle");
  var advancedFilters = document.getElementById("advanced-filters");
  var filterCount = document.getElementById("active-filter-count");
  function updateFilterCount() {
    if (!filterCount) return;
    var count = Number(!!hostingModel) + Number(!!(noCard && noCard.checked)) + Number(!!(commercial && commercial.checked)) + Number(!!(mobileCategory && mobileCategory.value)) + Number(!!(sort && sort.value !== "default"));
    filterCount.textContent = String(count);
    filterCount.hidden = count === 0;
  }
  var mobileCategory = document.getElementById("category-filter");
  var sort = document.getElementById("sort");
  var noCard = document.getElementById("filter-no-card");
  var commercial = document.getElementById("filter-commercial");
  var grid = document.getElementById("service-grid");
  var count = document.getElementById("results-count");
  var empty = document.getElementById("no-results");
  var more = document.getElementById("load-more");
  var moreWrap = document.getElementById("load-more-wrap");
  var clear = document.getElementById("clear-filters");
  var categoryButtons = Array.prototype.slice.call(
    document.querySelectorAll("[data-filter-category]")
  );
  if (!search || !grid || !count || !empty) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".service-card"));
  var category = "";
  var hostingModel = "";
  var hostingSelect = document.getElementById("hosting-filter");
  var pageSize = 12;
  var visible = pageSize;

  var urlState = window.FreeTierDirectoryURL;
  function restoreURL() {
    var state = urlState.read(window.location.href,
      Array.from(mobileCategory.options, function (option) { return option.value; }),
      Array.from(sort.options, function (option) { return option.value; }));
    hostingModel = state.hosting;
    if (hostingSelect) hostingSelect.value = hostingModel;
    category = state.category;
    search.value = state.q;
    if (headerSearch) headerSearch.value = state.q;
    if (heroSearch) heroSearch.value = state.q;
    sort.value = state.sort;
    noCard.checked = state.noCard;
    commercial.checked = state.commercial;
    visible = pageSize;
    updateFilterCount();
  }
  function syncURL() {
    var next = urlState.write(window.location.href, {
      q: search.value, category: category, sort: sort.value, hosting: hostingModel,
      noCard: noCard.checked, commercial: commercial.checked
    });
    if (next !== window.location.href) window.history.replaceState(window.history.state, "", next);
  }
  window.addEventListener("popstate", function () { restoreURL(); render(); });
  function labelText(n) { return n === 1 ? "service" : "services"; }
  function normalize(text) {
    return (text || "").toLocaleLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").trim();
  }
  function sortCards(matched) {
    var mode = sort ? sort.value : "default";
    if (mode === "name") {
      matched.sort(function (a, b) {
        return a.querySelector("h3").textContent.localeCompare(
          b.querySelector("h3").textContent, "en");
      });
    } else if (mode === "newest" || mode === "oldest") {
      matched.sort(function (a, b) {
        var ad = a.getAttribute("data-added-at") || "";
        var bd = b.getAttribute("data-added-at") || "";
        // Multiple services can be published on the same UTC day. Preserve
        // the source insertion sequence for ties; newest additions go first.
        return (mode === "newest" ? bd.localeCompare(ad) : ad.localeCompare(bd)) ||
          (mode === "newest" ? cards.indexOf(b) - cards.indexOf(a) :
            cards.indexOf(a) - cards.indexOf(b));
      });
    } else if (mode === "verified") {
      matched.sort(function (a, b) {
        return b.getAttribute("data-last-checked").localeCompare(a.getAttribute("data-last-checked")) ||
          cards.indexOf(a) - cards.indexOf(b);
      });
    } else if (mode === "name-desc") {
      matched.sort(function (a, b) {
        return b.querySelector("h3").textContent.localeCompare(a.querySelector("h3").textContent, "en");
      });
    } else if (mode === "category") {
      matched.sort(function (a, b) {
        return a.getAttribute("data-category").localeCompare(
          b.getAttribute("data-category")) ||
          a.querySelector("h3").textContent.localeCompare(
            b.querySelector("h3").textContent, "en");
      });
    } else {
      matched.sort(function (a, b) { return cards.indexOf(a) - cards.indexOf(b); });
    }
    matched.forEach(function (card) { grid.appendChild(card); });
  }
  var activeFilters = document.getElementById("active-filters");
  var activeChips = document.getElementById("active-filter-chips");
  var showResults = document.getElementById("filter-show-results");
  function renderActiveFilters() {
    if (!activeChips) return;
    activeChips.replaceChildren();
    var selected = [];
    if (search.value.trim()) selected.push(["q", 'Search: ' + search.value.trim()]);
    if (category) selected.push(["category", mobileCategory.options[mobileCategory.selectedIndex].text]);
    if (hostingModel) selected.push(["hosting", hostingSelect.options[hostingSelect.selectedIndex].text]);
    if (noCard.checked) selected.push(["no-card", "No credit card"]);
    if (commercial.checked) selected.push(["commercial", "Commercial use"]);
    if (sort.value !== "default") selected.push(["sort", sort.options[sort.selectedIndex].text]);
    selected.forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "active-filter-chip";
      button.dataset.removeFilter = item[0];
      button.setAttribute("aria-label", "Remove filter: " + item[1]);
      var label = document.createElement("span");
      label.textContent = item[1];
      var icon = advancedFilters.querySelector(".filter-sheet-close svg").cloneNode(true);
      icon.setAttribute("aria-hidden", "true");
      button.append(label, icon);
      activeChips.appendChild(button);
    });
    activeFilters.hidden = selected.length === 0;
  }
  if (activeChips) activeChips.addEventListener("click", function (event) {
    var button = event.target.closest("[data-remove-filter]");
    if (!button) return;
    var key = button.dataset.removeFilter;
    if (key === "q") {
      search.value = "";
      if (headerSearch) headerSearch.value = "";
    } else if (key === "category") category = "";
    else if (key === "hosting") { hostingModel = ""; hostingSelect.value = ""; }
    else if (key === "sort") sort.value = "default";
    else if (key === "no-card") noCard.checked = false;
    else if (key === "commercial") commercial.checked = false;
    visible = pageSize;
    render();
    var next = activeChips.querySelector("button");
    (next || search).focus();
  });
  if (hostingSelect) hostingSelect.addEventListener("change", function () {
    hostingModel = hostingSelect.value;
    visible = pageSize;
    render();
  });
  function render() {
    syncURL();
    document.querySelectorAll("[data-quick-filter]").forEach(function (button) {
      var mode = button.getAttribute("data-quick-filter");
      var active = mode === "all" ? !noCard.checked && !commercial.checked
        : mode === "no-card" ? noCard.checked : commercial.checked;
      button.setAttribute("aria-pressed", String(active));
    });
    var term = normalize(search.value);
    var matched = cards.filter(function (card) {
      var words = normalize(card.getAttribute("data-search"));
      return (!term || words.indexOf(term) !== -1) &&
        (!category || card.getAttribute("data-category") === category) &&
        (!hostingModel || card.getAttribute("data-hosting-model") === hostingModel) &&
        (!noCard || !noCard.checked || card.getAttribute("data-credit-card") === "no") &&
        (!commercial || !commercial.checked || card.getAttribute("data-commercial-use") === "yes");
    });
    cards.forEach(function (card) {
      card.hidden = matched.indexOf(card) === -1;
      card.removeAttribute("data-paged-hidden");
    });
    sortCards(matched);
    matched.forEach(function (card, index) {
      if (index >= visible) card.setAttribute("data-paged-hidden", "true");
    });
    var shown = Math.min(matched.length, visible);
    count.textContent = "Showing " + shown + " of " + matched.length + " " + labelText(matched.length);
    empty.hidden = matched.length !== 0;
    if (moreWrap) moreWrap.hidden = matched.length <= visible;
    if (more) more.textContent = "Show more (" + (matched.length - shown) + " remaining)";
    if (clear) clear.hidden = !hostingModel && !term && !category && (!sort || sort.value === "default") &&
      (!noCard || !noCard.checked) && (!commercial || !commercial.checked);

    categoryButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-filter-category") === category;
      button.setAttribute("aria-pressed", String(isActive));
    });
    if (mobileCategory && mobileCategory.value !== category) {
      mobileCategory.value = category;
    }
    updateFilterCount();
    renderActiveFilters();
    if (showResults) showResults.textContent = "Show results (" + matched.length + ")";
  }
  function changeCategory(next) {
    category = next;
    visible = pageSize;
    render();
  }
  if (headerSearch) headerSearch.addEventListener("input", function () {
    search.value = headerSearch.value;
    if (heroSearch) heroSearch.value = headerSearch.value;
    visible = pageSize; render();
  });
  search.addEventListener("input", function () {
    if (headerSearch && headerSearch.value !== search.value) headerSearch.value = search.value;
    if (heroSearch && heroSearch.value !== search.value) heroSearch.value = search.value;
    visible = pageSize; render();
  });
  if (heroSearch) heroSearch.addEventListener("input", function () {
    search.value = heroSearch.value;
    if (headerSearch) headerSearch.value = heroSearch.value;
    visible = pageSize; render();
  });
  var searchForm = document.getElementById("directory-search-form");
  if (searchForm) searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    visible = pageSize; render();
    document.getElementById("explore").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  // One inline panel at every width: controls never move or overlay results.
  if (filterToggle && advancedFilters) {
    var closePanel = advancedFilters.querySelector(".filter-sheet-close");
    function closeFilters(restoreFocus) {
      advancedFilters.hidden = true;
      filterToggle.setAttribute("aria-expanded", "false");
      if (restoreFocus) filterToggle.focus();
    }
    filterToggle.addEventListener("click", function () {
      var opening = advancedFilters.hidden;
      advancedFilters.hidden = !opening;
      filterToggle.setAttribute("aria-expanded", String(opening));
    });
    if (closePanel) closePanel.addEventListener("click", function () { closeFilters(true); });
    if (showResults) showResults.addEventListener("click", function () {
      closeFilters(true);
      count.scrollIntoView({block: "nearest", behavior: "auto"});
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !advancedFilters.hidden) {
        event.preventDefault(); closeFilters(true);
      }
    });
  }
  if (mobileCategory) {
    mobileCategory.addEventListener("change", function () {
      changeCategory(mobileCategory.value);
    });
  }
  categoryButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      changeCategory(button.getAttribute("data-filter-category"));
    });
  });
  if (sort) sort.addEventListener("change", function () { visible = pageSize; render(); });
  [noCard, commercial].forEach(function (filter) {
    if (filter) filter.addEventListener("change", function () { visible = pageSize; updateFilterCount(); render(); });
  });
  document.querySelectorAll("[data-quick-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      var mode = button.getAttribute("data-quick-filter");
      if (mode === "all") { noCard.checked = false; commercial.checked = false; }
      else if (mode === "no-card") noCard.checked = !noCard.checked;
      else commercial.checked = !commercial.checked;
      visible = pageSize; updateFilterCount(); render();
    });
  });
  if (more) more.addEventListener("click", function () { visible += pageSize; render(); });
  if (clear) clear.addEventListener("click", function () {
    hostingModel = "";
    if (hostingSelect) hostingSelect.value = "";
    search.value = "";
    if (headerSearch) headerSearch.value = "";
    if (heroSearch) heroSearch.value = "";
    if (sort) sort.value = "default";
    if (noCard) noCard.checked = false;
    if (commercial) commercial.checked = false;
    updateFilterCount();
    changeCategory("");
    search.focus();
  });
  var searchLinks = document.querySelectorAll("[data-focus-search]");
  Array.prototype.forEach.call(searchLinks, function (el) {
    el.addEventListener("click", function () {
      window.setTimeout(function () { search.focus(); }, 0);
    });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      visible = pageSize;
      render();
      search.blur();
    }
  });
  restoreURL();
  doc.classList.add("js-enabled");
  render();
})();
