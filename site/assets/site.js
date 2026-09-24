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
      var drawing = themeToggle.querySelector("svg");
      if (drawing) drawing.innerHTML = theme === "dark"
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'
        : '<path d="M20 15a8 8 0 0 1-11-11A8 8 0 1 0 20 15Z"/>';
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
  function closeHeaderSearch() {
    if (!headerPanel || !headerToggle) return;
    headerPanel.hidden = true;
    headerToggle.setAttribute("aria-expanded", "false");
  }
  if (headerToggle && headerPanel && headerSearch) {
    headerToggle.addEventListener("click", function () {
      if (!document.getElementById("search")) {
        window.location.href = headerToggle.getAttribute("data-directory-url");
        return;
      }
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
  var search = document.getElementById("search");
  var heroSearch = document.getElementById("hero-search");
  var filterToggle = document.getElementById("advanced-filter-toggle");
  var advancedFilters = document.getElementById("advanced-filters");
  var filterCount = document.getElementById("active-filter-count");
  function updateFilterCount() {
    if (!filterCount) return;
    var count = Number(!!(noCard && noCard.checked)) + Number(!!(commercial && commercial.checked));
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
    document.querySelectorAll(".sidebar-category[data-filter-category]")
  );
  if (!search || !grid || !count || !empty) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".service-card"));
  var category = "";
  var pageSize = 12;
  var visible = pageSize;

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
        // Unknown historical dates retain catalog insertion order.
        return (mode === "newest" ? bd.localeCompare(ad) : ad.localeCompare(bd)) ||
          (mode === "newest" ? cards.indexOf(b) - cards.indexOf(a) : cards.indexOf(a) - cards.indexOf(b));
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
  function render() {
    var term = normalize(search.value);
    var matched = cards.filter(function (card) {
      var words = normalize(card.getAttribute("data-search"));
      return (!term || words.indexOf(term) !== -1) &&
        (!category || card.getAttribute("data-category") === category) &&
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
    count.innerHTML = "<strong>" + matched.length +
      "</strong> " + labelText(matched.length) +
      " found <span class=\"count-muted\">· Showing " + shown + "</span>";
    empty.hidden = matched.length !== 0;
    if (moreWrap) moreWrap.hidden = matched.length <= visible;
    if (more) more.textContent = "Show more (" + (matched.length - shown) + " remaining)";
    if (clear) clear.hidden = !term && !category && (!sort || sort.value === "default") &&
      (!noCard || !noCard.checked) && (!commercial || !commercial.checked);

    categoryButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-filter-category") === category;
      button.setAttribute("aria-pressed", String(isActive));
    });
    if (mobileCategory && mobileCategory.value !== category) {
      mobileCategory.value = category;
    }
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
  // Move existing controls into the mobile popover; preserve their nodes and listeners.
  // Desktop keeps the original toolbar layout without duplicate category/sort inputs.
  if (advancedFilters && mobileCategory && sort && window.matchMedia) {
    var categoryLabel = mobileCategory.closest("label");
    var sortLabel = sort.closest("label");
    var categoryMarker = document.createComment("category desktop position");
    var sortMarker = document.createComment("sort desktop position");
    categoryLabel.parentNode.insertBefore(categoryMarker, categoryLabel);
    sortLabel.parentNode.insertBefore(sortMarker, sortLabel);
    var mobileLayout = window.matchMedia("(max-width: 680px)");
    function placeMobileControls() {
      if (mobileLayout.matches) {
        var firstCheckbox = advancedFilters.querySelector("label:has(input[type=checkbox])");
        advancedFilters.insertBefore(categoryLabel, firstCheckbox);
        advancedFilters.insertBefore(sortLabel, firstCheckbox);
        filterToggle.setAttribute("aria-label", "Open category, sort and filters");
      } else {
        categoryMarker.parentNode.insertBefore(categoryLabel, categoryMarker.nextSibling);
        sortMarker.parentNode.insertBefore(sortLabel, sortMarker.nextSibling);
        filterToggle.setAttribute("aria-label", "Open additional filters");
      }
    }
    placeMobileControls();
    if (mobileLayout.addEventListener) mobileLayout.addEventListener("change", placeMobileControls);
    else mobileLayout.addListener(placeMobileControls);
  }
  if (filterToggle && advancedFilters) {
    var sheetHeading = advancedFilters.querySelector(".filter-popover-heading");
    var closeSheetButton = document.createElement("button");
    closeSheetButton.type = "button";
    closeSheetButton.className = "filter-sheet-close";
    closeSheetButton.setAttribute("aria-label", "Close filters");
    closeSheetButton.textContent = "×";
    if (sheetHeading) sheetHeading.appendChild(closeSheetButton);
    var sheetBackdrop = document.createElement("div");
    sheetBackdrop.className = "filter-sheet-backdrop";
    sheetBackdrop.hidden = true;
    document.body.appendChild(sheetBackdrop);
    // Portal the sheet to <body> on mobile. A fixed panel inside the sticky
    // toolbar inherits its stacking context and gets clipped/overlaid.
    var sheetHome = document.createComment("filter sheet original position");
    advancedFilters.parentNode.insertBefore(sheetHome, advancedFilters);
    function placeFilterSheet() {
      var isMobile = window.matchMedia("(max-width: 680px)").matches;
      if (isMobile && advancedFilters.parentNode !== document.body) {
        document.body.appendChild(advancedFilters);
        advancedFilters.classList.add("mobile-filter-sheet");
      } else if (!isMobile && advancedFilters.parentNode === document.body) {
        sheetHome.parentNode.insertBefore(advancedFilters, sheetHome.nextSibling);
        advancedFilters.classList.remove("mobile-filter-sheet");
      }
    }
    placeFilterSheet();
    window.addEventListener("resize", placeFilterSheet);

    function closeFilters(restoreFocus) {
      advancedFilters.hidden = true;
      filterToggle.setAttribute("aria-expanded", "false");
      sheetBackdrop.hidden = true;
      document.body.classList.remove("filter-sheet-open");
      if (restoreFocus) filterToggle.focus();
    }
    function openFilters() {
      advancedFilters.hidden = false;
      filterToggle.setAttribute("aria-expanded", "true");
      if (window.matchMedia("(max-width: 680px)").matches) {
        sheetBackdrop.hidden = false;
        document.body.classList.add("filter-sheet-open");
        closeSheetButton.focus();
      }
    }
    closeSheetButton.addEventListener("click", function () { closeFilters(true); });
    sheetBackdrop.addEventListener("click", function () { closeFilters(true); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !advancedFilters.hidden) {
        event.preventDefault(); closeFilters(true);
      }
    });
    document.addEventListener("click", function (event) {
      if (!advancedFilters.hidden && !advancedFilters.contains(event.target) &&
          !filterToggle.contains(event.target) && !sheetBackdrop.contains(event.target)) {
        closeFilters(false);
      }
    });
    filterToggle.addEventListener("click", function () {
      if (advancedFilters.hidden) openFilters();
      else closeFilters(false);
    });
    if (window.matchMedia) {
      var sheetMedia = window.matchMedia("(max-width: 680px)");
      var syncSheet = function () {
        if (!sheetMedia.matches) {
          sheetBackdrop.hidden = true;
          document.body.classList.remove("filter-sheet-open");
        } else if (!advancedFilters.hidden) {
          sheetBackdrop.hidden = false;
          document.body.classList.add("filter-sheet-open");
        }
      };
      if (sheetMedia.addEventListener) sheetMedia.addEventListener("change", syncSheet);
      else sheetMedia.addListener(syncSheet);
    }
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
  if (more) more.addEventListener("click", function () { visible += pageSize; render(); });
  if (clear) clear.addEventListener("click", function () {
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
    var node = event.target && event.target.tagName;
    var editable = event.target && event.target.isContentEditable;
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      visible = pageSize;
      render();
      search.blur();
    } else if ((event.key === "/" && !editable && node !== "INPUT" &&
                node !== "TEXTAREA" && node !== "SELECT") ||
               ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
      event.preventDefault();
      if (headerToggle && headerPanel && headerSearch) {
        headerPanel.hidden = false;
        headerToggle.setAttribute("aria-expanded", "true");
        headerSearch.focus(); headerSearch.select();
      } else {
        window.location.hash = "#explore";
        search.focus(); search.select();
      }
    }
  });
  doc.classList.add("js-enabled");
  render();
})();
