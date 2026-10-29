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
  var consent = null;
  try { consent = window.localStorage.getItem('fth-consent-v1'); } catch (_error) {}
  var analyticsLoaded = false;
  function loadAnalytics() {
    var config = document.querySelector('meta[name="fth-analytics"]');
    if (consent !== 'accepted' || analyticsLoaded || !config) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', config.content);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.content);
    document.head.appendChild(script);
  }
  var notice = document.createElement('section');
  notice.className = 'cookie-notice';
  notice.setAttribute('role', 'region');
  notice.setAttribute('aria-label', 'Cookies and saved preferences');
  var noticeCopy = document.createElement('p');
  noticeCopy.textContent = 'Allow cookies & saved preferences? We use browser storage to remember your filters and up to 5 recent searches, and Google Analytics cookies to understand site usage. Your filter history stays in this browser. You can decline and still browse normally.';
  var noticeActions = document.createElement('div');
  noticeActions.className = 'cookie-actions';
  var acceptCookies = document.createElement('button');
  acceptCookies.type = 'button'; acceptCookies.textContent = 'Allow';
  var rejectCookies = document.createElement('button');
  rejectCookies.type = 'button'; rejectCookies.textContent = 'Decline';
  noticeActions.append(rejectCookies, acceptCookies);
  notice.append(noticeCopy, noticeActions);
  notice.hidden = consent === 'accepted' || consent === 'rejected';
  document.body.appendChild(notice);
  var cookieSettings = document.createElement('button');
  cookieSettings.type = 'button'; cookieSettings.className = 'cookie-settings';
  cookieSettings.textContent = 'Cookie settings';
  cookieSettings.addEventListener('click', function () { notice.hidden = false; acceptCookies.focus(); });
  (document.querySelector('footer') || document.body).appendChild(cookieSettings);
  function chooseConsent(choice) {
    consent = choice;
    try {
      window.localStorage.setItem('fth-consent-v1', choice);
      if (choice === 'rejected') {
        ['fth-directory-last', 'fth-directory-history', 'fth-sort'].forEach(function (key) { window.localStorage.removeItem(key); });
      }
    } catch (_error) {}
    notice.hidden = true;
    cookieSettings.focus({preventScroll:true});
    window.dispatchEvent(new Event('fth-consent-change'));
    if (choice === 'rejected') {
      // Revoke a previously loaded analytics session and remove its first-party cookies.
      var config = document.querySelector('meta[name="fth-analytics"]');
      if (config) window['ga-disable-' + config.content] = true;
      document.cookie.split(';').forEach(function (cookie) {
        var name = cookie.split('=')[0].trim();
        if (!/^_ga(?:_|$)/.test(name)) return;
        var domains = window.location.hostname.split('.');
        document.cookie = name + '=; Max-Age=0; path=/';
        while (domains.length > 1) {
          document.cookie = name + '=; Max-Age=0; path=/; domain=.' + domains.join('.');
          domains.shift();
        }
      });
      if (analyticsLoaded) window.location.reload();
    } else loadAnalytics();
  }
  acceptCookies.addEventListener('click', function () { chooseConsent('accepted'); });
  rejectCookies.addEventListener('click', function () { chooseConsent('rejected'); });
  loadAnalytics();

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
    var count = Number(!!hostingModel) + Number(!!(mobileCategory && mobileCategory.value));
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

  // Enhance native selects while keeping their existing change/URL state owners.
  var selectWidgets = [];
  function enhanceSelect(select) {
    if (!select) return;
    var label = select.closest('label');
    var labelText = label.querySelector('span').textContent;
    var searchable = select.id === 'category-filter';
    var wrap = document.createElement('div');
    wrap.className = 'custom-select';
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = select.id + '-trigger';
    trigger.className = 'select-trigger';
    trigger.setAttribute('aria-label', labelText);
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    var value = document.createElement('span');
    var arrow = document.createElement('span');
    arrow.className = 'select-chevron';
    arrow.setAttribute('aria-hidden', 'true');
    trigger.append(value, arrow);
    var menu = document.createElement('div');
    menu.className = 'select-menu';
    menu.hidden = true;
    var list = document.createElement('div');
    list.className = 'select-options';
    list.id = select.id + '-options';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', labelText);
    trigger.setAttribute('aria-controls', list.id);
    var input = null;
    if (searchable) {
      input = document.createElement('input');
      input.type = 'search';
      input.className = 'select-search';
      input.placeholder = 'Search categories…';
      input.setAttribute('aria-label', 'Search categories');
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-controls', list.id);
      input.setAttribute('aria-expanded', 'false');
      input.autocomplete = 'off';
      menu.appendChild(input);
    } else trigger.setAttribute('role', 'combobox');
    var owner = input || trigger;
    var options = Array.from(select.options).map(function (option, index) {
      var row = document.createElement('div');
      row.id = select.id + '-option-' + index;
      row.className = 'select-option';
      row.setAttribute('role', 'option');
      row.textContent = option.text;
      row.dataset.value = option.value;
      list.appendChild(row);
      return row;
    });
    var empty = document.createElement('div');
    empty.className = 'select-empty';
    empty.setAttribute('role', 'status');
    empty.textContent = 'No categories found';
    empty.hidden = true;
    menu.append(list, empty);
    wrap.append(trigger, menu);
    select.after(wrap);
    select.hidden = true;
    label.htmlFor = trigger.id;
    var active = null;
    function highlight(row) {
      options.forEach(function (item) { item.classList.toggle('is-highlighted', item === row); });
      active = row;
      if (row) {
        owner.setAttribute('aria-activedescendant', row.id);
        row.scrollIntoView({block:'nearest'});
      } else owner.removeAttribute('aria-activedescendant');
    }
    function sync() {
      value.textContent = select.options[select.selectedIndex].text;
      options.forEach(function (row) { row.setAttribute('aria-selected', String(row.dataset.value === select.value)); });
    }
    function close(focus) {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (input) input.setAttribute('aria-expanded', 'false');
      owner.removeAttribute('aria-activedescendant');
      if (focus) trigger.focus();
    }
    function position() {
      if (menu.hidden) return;
      if (!trigger.getClientRects().length) { close(false); return; }
      var rect = trigger.getBoundingClientRect();
      var width = Math.min(Math.max(rect.width, searchable ? 270 : 210), window.innerWidth - 24);
      var below = window.innerHeight - rect.bottom - 12;
      var above = rect.top - 12;
      var upward = below < 220 && above > below;
      var height = Math.min(320, Math.max(100, upward ? above - 8 : below - 8));
      menu.style.width = width + 'px';
      menu.style.maxHeight = height + 'px';
      menu.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) + 'px';
      menu.style.top = upward ? 'auto' : rect.bottom + 6 + 'px';
      menu.style.bottom = upward ? window.innerHeight - rect.top + 6 + 'px' : 'auto';
    }
    function open() {
      selectWidgets.forEach(function (widget) { widget.close(false); });
      options.forEach(function (row) { row.hidden = false; });
      empty.hidden = true;
      if (input) input.value = '';
      sync();
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      if (input) { input.setAttribute('aria-expanded', 'true'); input.focus(); }
      position();
      highlight(options.find(function (row) { return row.dataset.value === select.value; }) || options[0]);
    }
    function choose(row) {
      select.value = row.dataset.value;
      select.dispatchEvent(new Event('change', {bubbles:true}));
      sync(); close(true);
    }
    trigger.addEventListener('click', function (event) { event.preventDefault(); if (menu.hidden) open(); else close(false); });
    list.addEventListener('mousedown', function (event) { event.preventDefault(); });
    list.addEventListener('click', function (event) {
      var row = event.target.closest('[role="option"]');
      if (row) { event.preventDefault(); choose(row); }
    });
    list.addEventListener('pointermove', function (event) {
      var row = event.target.closest('[role="option"]');
      if (row && row !== active) highlight(row);
    });
    if (input) input.addEventListener('input', function () {
      var term = normalize(input.value);
      options.forEach(function (row) { row.hidden = !normalize(row.textContent).includes(term); });
      var visibleOptions = options.filter(function (row) { return !row.hidden; });
      empty.hidden = visibleOptions.length > 0;
      highlight(visibleOptions[0] || null);
    });
    wrap.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault(); event.stopPropagation(); close(true); return;
      }
      if (event.key === 'Tab') { close(false); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); event.stopPropagation();
        if (menu.hidden) { open(); return; }
        var rows = options.filter(function (row) { return !row.hidden; });
        var index = rows.indexOf(active);
        highlight(rows[(index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length] || null);
      } else if (!menu.hidden && (event.key === 'Home' || event.key === 'End') && !input) {
        event.preventDefault(); highlight(options[event.key === 'Home' ? 0 : options.length - 1]);
      } else if (event.key === 'Enter' && !menu.hidden) {
        event.preventDefault(); event.stopPropagation(); if (active) choose(active);
      } else if (!input && event.key === ' ' && !menu.hidden) {
        event.preventDefault(); if (active) choose(active);
      } else if (!input && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        if (menu.hidden) open();
        var match = options.find(function (row) { return normalize(row.textContent).startsWith(normalize(event.key)); });
        if (match) { event.preventDefault(); highlight(match); }
      }
    });
    document.addEventListener('pointerdown', function (event) { if (!wrap.contains(event.target)) close(false); });
    wrap.addEventListener('focusout', function (event) { if (!wrap.contains(event.relatedTarget)) close(false); });
    window.addEventListener('resize', function () { close(false); });
    window.addEventListener('scroll', position, true);
    selectWidgets.push({sync:sync, close:close});
    sync();
  }

  var urlState = window.FreeTierDirectoryURL;
  function restoreURL() {
    var state = urlState.read(window.location.href,
      Array.from(mobileCategory.options, function (option) { return option.value; }),
      Array.from(sort.options, function (option) { return option.value; }));
    applyFilterState(state);
  }
  function applyFilterState(state) {
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
    rememberFilters();
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
  var recentFilters = [];
  var historyTimer;
  try {
    if (consent === 'accepted') {
      var savedHistory = JSON.parse(window.localStorage.getItem('fth-directory-history') || '[]');
      if (Array.isArray(savedHistory)) recentFilters = savedHistory.filter(function (item) { return typeof item === 'string' && item.startsWith('?') && item.length < 3000; }).slice(0, 5);
    }
  } catch (_error) {}
  var historyPanel = document.createElement('section');
  historyPanel.className = 'filter-history';
  historyPanel.setAttribute('aria-label', 'Recent filters');
  var historyTitle = document.createElement('strong');
  historyTitle.textContent = 'Recent filters';
  var historyList = document.createElement('div');
  var clearHistory = document.createElement('button');
  clearHistory.type = 'button'; clearHistory.className = 'history-clear';
  clearHistory.textContent = 'Clear history';
  historyPanel.append(historyTitle, historyList, clearHistory);
  advancedFilters.insertBefore(historyPanel, showResults);
  function readFilterState(query) {
    return urlState.read(new URL(query, window.location.origin + '/').href,
      Array.from(mobileCategory.options, function (option) { return option.value; }),
      Array.from(sort.options, function (option) { return option.value; }));
  }
  function renderHistory() {
    historyPanel.hidden = consent !== 'accepted' || recentFilters.length === 0;
    historyList.replaceChildren();
    recentFilters.forEach(function (query) {
      var state = readFilterState(query);
      var parts = [];
      if (state.q) parts.push('Search: ' + state.q.slice(0, 40));
      if (state.category) parts.push(Array.from(mobileCategory.options).find(function (option) { return option.value === state.category; }).text);
      if (state.hosting) parts.push(Array.from(hostingSelect.options).find(function (option) { return option.value === state.hosting; }).text);
      if (state.noCard) parts.push('No credit card');
      if (state.commercial) parts.push('Commercial use');
      if (state.sort !== 'default') parts.push(Array.from(sort.options).find(function (option) { return option.value === state.sort; }).text);
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'history-item';
      button.textContent = parts.join(' · ') || 'All services';
      button.addEventListener('click', function () {
        applyFilterState(state); visible = pageSize; render();
        showResults.focus();
      });
      historyList.appendChild(button);
    });
  }
  function rememberFilters() {
    window.clearTimeout(historyTimer);
    if (consent !== 'accepted') return;
    historyTimer = window.setTimeout(function () {
      if (consent !== 'accepted') return;
      var state = {q:search.value, category:category, hosting:hostingModel, sort:sort.value, noCard:noCard.checked, commercial:commercial.checked};
      var query = new URL(urlState.write(window.location.origin + '/', state)).search;
      if (query) recentFilters = [query].concat(recentFilters.filter(function (item) { return item !== query; })).slice(0, 5);
      try {
        window.localStorage.setItem('fth-directory-last', query);
        window.localStorage.setItem('fth-directory-history', JSON.stringify(recentFilters));
      } catch (_error) {}
      renderHistory();
    }, 700);
  }
  clearHistory.addEventListener('click', function () {
    window.clearTimeout(historyTimer);
    recentFilters = [];
    try {
      window.localStorage.removeItem('fth-directory-history');
      window.localStorage.removeItem('fth-directory-last');
    } catch (_error) {}
    renderHistory(); showResults.focus();
  });
  window.addEventListener('fth-consent-change', function () {
    if (consent !== 'accepted') recentFilters = [];
    renderHistory(); rememberFilters();
  });
  renderHistory();

  function renderActiveFilters() {
    if (!activeChips) return;
    activeChips.replaceChildren();
    var selected = [];
    if (search.value.trim()) selected.push(["q", 'Search: ' + search.value.trim()]);
    if (category) selected.push(["category", mobileCategory.options[mobileCategory.selectedIndex].text]);
    if (hostingModel) selected.push(["hosting", hostingSelect.options[hostingSelect.selectedIndex].text]);
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
    var totalBadge = document.createElement("strong");
    totalBadge.className = "result-total";
    totalBadge.textContent = matched.length + " " + (matched.length !== cards.length ? "matching " : "") + labelText(matched.length);
    var shownLabel = document.createElement("span");
    shownLabel.className = "result-shown";
    shownLabel.textContent = shown + " shown";
    count.replaceChildren(totalBadge, shownLabel);
    empty.hidden = matched.length !== 0;
    if (moreWrap) moreWrap.hidden = matched.length <= visible;
    if (more) more.textContent = "Show more (" + (matched.length - shown) + " remaining)";
    if (clear) clear.hidden = !hostingModel && !term && !category &&
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
    selectWidgets.forEach(function (widget) { widget.sync(); });
    if (showResults) showResults.textContent = "Show results (" + matched.length + ")";
  }
  grid.addEventListener("click", function (event) {
    var link = event.target.closest("[data-card-category], [data-card-hosting]");
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (link.hasAttribute("data-card-category")) {
      category = link.dataset.cardCategory;
    } else {
      hostingModel = link.dataset.cardHosting;
      hostingSelect.value = hostingModel;
    }
    visible = pageSize;
    render();
    // Rendering resets pagination, so move keyboard focus to a stable control.
    // The advanced controls live in a closed dialog; focus the visible Filters button.
    (filterToggle || search).focus({preventScroll:true});
  });
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
  // Anchor the desktop dialog to Filters; use a modal sheet on phones.
  if (filterToggle && advancedFilters) {
    var closePanel = advancedFilters.querySelector(".filter-sheet-close");
    var panelHome = document.createComment("filter dialog home");
    advancedFilters.parentNode.insertBefore(panelHome, advancedFilters);
    var backdrop = document.createElement("div");
    backdrop.className = "filter-sheet-backdrop";
    backdrop.hidden = true;
    document.body.appendChild(backdrop);
    var sheetMedia = window.matchMedia("(max-width: 680px)");
    var inerted = [];
    function positionFilters() {
      if (advancedFilters.hidden || sheetMedia.matches) return;
      var anchor = filterToggle.getBoundingClientRect();
      var width = Math.min(360, window.innerWidth - 32);
      var top = anchor.bottom + 8;
      if (window.innerHeight - top < 240) top = 16;
      advancedFilters.style.left = Math.max(16, Math.min(anchor.right - width, window.innerWidth - width - 16)) + "px";
      advancedFilters.style.top = top + "px";
      advancedFilters.style.maxHeight = Math.max(120, window.innerHeight - top - 16) + "px";
    }
    function closeFilters(restoreFocus) {
      if (advancedFilters.hidden) return;
      selectWidgets.forEach(function (widget) { widget.close(false); });
      advancedFilters.hidden = true;
      advancedFilters.removeAttribute("aria-modal");
      advancedFilters.removeAttribute("style");
      filterToggle.setAttribute("aria-expanded", "false");
      backdrop.hidden = true;
      document.body.classList.remove("filter-sheet-open");
      inerted.forEach(function (node) { node.inert = false; });
      inerted = [];
      panelHome.parentNode.insertBefore(advancedFilters, panelHome.nextSibling);
      if (restoreFocus) filterToggle.focus();
    }
    function openFilters() {
      document.body.appendChild(advancedFilters);
      advancedFilters.hidden = false;
      filterToggle.setAttribute("aria-expanded", "true");
      if (sheetMedia.matches) {
        advancedFilters.setAttribute("aria-modal", "true");
        backdrop.hidden = false;
        document.body.classList.add("filter-sheet-open");
        Array.prototype.forEach.call(document.body.children, function (node) {
          if (node !== advancedFilters && node !== backdrop && !node.inert) {
            node.inert = true; inerted.push(node);
          }
        });
      }
      positionFilters();
      closePanel.focus();
    }
    filterToggle.addEventListener("click", function () {
      if (advancedFilters.hidden) openFilters(); else closeFilters(true);
    });
    closePanel.addEventListener("click", function () { closeFilters(true); });
    backdrop.addEventListener("click", function () { closeFilters(true); });
    if (showResults) showResults.addEventListener("click", function () { closeFilters(true); });
    document.addEventListener("click", function (event) {
      if (!advancedFilters.hidden && !sheetMedia.matches &&
          !advancedFilters.contains(event.target) && !filterToggle.contains(event.target)) closeFilters(false);
    });
    document.addEventListener("keydown", function (event) {
      if (advancedFilters.hidden) return;
      if (event.key === "Escape") { event.preventDefault(); closeFilters(true); return; }
      if (event.key !== "Tab") return;
      var focusable = Array.prototype.slice.call(advancedFilters.querySelectorAll("button, select, input")).filter(function (node) {
        return !node.disabled && node.getClientRects().length;
      });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        if (sheetMedia.matches) last.focus(); else closeFilters(true);
      } else if (!event.shiftKey && document.activeElement === last) {
        if (sheetMedia.matches) { event.preventDefault(); first.focus(); } else closeFilters(false);
      }
    });
    window.addEventListener("resize", positionFilters);
    window.addEventListener("scroll", positionFilters, true);
    var closeOnBreakpoint = function () { closeFilters(true); };
    if (sheetMedia.addEventListener) sheetMedia.addEventListener("change", closeOnBreakpoint);
    else sheetMedia.addListener(closeOnBreakpoint);
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
  if (sort) sort.addEventListener("change", function () {
    visible = pageSize; render();
  });
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
  // A URL carrying any directory state wins over saved local preferences.
  if (consent === 'accepted' && !['q','category','hosting','sort','no_card','commercial'].some(function (key) { return new URL(window.location.href).searchParams.has(key); })) {
    try {
      var lastFilters = window.localStorage.getItem('fth-directory-last');
      if (lastFilters && lastFilters.startsWith('?') && lastFilters.length < 3000) applyFilterState(readFilterState(lastFilters));
    } catch (_error) {}
  }
  [sort, mobileCategory, hostingSelect].forEach(enhanceSelect);
  doc.classList.add("js-enabled");
  render();
})();
