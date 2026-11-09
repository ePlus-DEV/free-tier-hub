/* Free Tier Hub — accessible progressive enhancement; no runtime dependencies. */
(function () {
  "use strict";
  var doc = document.documentElement;
  // Mirror the server's truncating compact count policy for dynamically
  // updated result labels. Preserve original counts in accessible labels.
  function compactUiCount(input) {
    var number = Number(input);
    if (!Number.isSafeInteger(number) || number < 1000) return String(input);
    if (number < 100000) return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var units = [[1000000000000, "T", 2], [1000000000, "B", 2],
      [1000000, "M", 2], [1000, "K", 1]];
    for (var i = 0; i < units.length; i++) {
      var unit = units[i];
      if (number < unit[0]) continue;
      var fractionBase = Math.pow(10, unit[2]);
      var fraction = Math.floor((number % unit[0]) * fractionBase / unit[0]);
      var part = String(fraction).padStart(unit[2], "0").replace(/0+$/, "");
      return Math.floor(number / unit[0]) + (part ? "." + part : "") + unit[1];
    }
    return String(input);
  }

  // Evaluate NEW on the visitor's clock, not from a cached build-time HTML flag.
  function refreshNewServiceBadges(scope) {
    var now = Date.now();
    scope.querySelectorAll(".service-card, .detail").forEach(function (card) {
      var badge = card.querySelector(".new-service-badge");
      if (!badge) return;
      var published = Date.parse(card.getAttribute("data-added-at-utc") || "");
      badge.hidden = !(Number.isFinite(published) && published <= now &&
        now - published < 48 * 60 * 60 * 1000);
    });
    scope.querySelectorAll(".recent-count").forEach(function (badge) {
      var timestamps = (badge.getAttribute("data-new-published-times") || "").split(",");
      var count = timestamps.filter(function (value) {
        var published = Date.parse(value);
        return Number.isFinite(published) && published <= now &&
          now - published < 48 * 60 * 60 * 1000;
      }).length;
      badge.textContent = count ? "+" + count + " new" : "";
      badge.hidden = count === 0;
      badge.setAttribute("aria-label", count + " services first published in the last 48 hours (UTC)");
    });
  }
  refreshNewServiceBadges(document);
  // The static HTML may be cached before retirement. Hide expiring notices on
  // the visitor's clock, including an already-open tab at the UTC cutoff.
  function expireProviderNotices() {
    var notices = document.querySelectorAll('.provider-retirement-notice[data-expires-at]');
    var nextExpiry = Infinity;
    var now = Date.now();
    notices.forEach(function (notice) {
      var expiry = Date.parse(notice.getAttribute('data-expires-at') || '');
      if (!Number.isFinite(expiry)) return;
      notice.hidden = now >= expiry;
      if (!notice.hidden) nextExpiry = Math.min(nextExpiry, expiry);
    });
    if (Number.isFinite(nextExpiry)) {
      // Limit the delay to a day to avoid the 32-bit setTimeout ceiling.
      window.setTimeout(expireProviderNotices, Math.max(1, Math.min(nextExpiry - now, 86400000)));
    }
  }
  expireProviderNotices();
  document.addEventListener("visibilitychange", function () {
    refreshNewServiceBadges(document);
  });

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
  // Safari can block or clear localStorage independently of first-party cookies.
  // Keep a strictly scoped preference cookie as a fallback, not as a tracker.
  var consentKey = 'fth-consent-v1';
  function isValidConsent(value) {
    return value === 'accepted' || value === 'rejected';
  }
  function readConsent() {
    var stored = null;
    try { stored = window.localStorage.getItem(consentKey); } catch (_error) {}
    if (isValidConsent(stored)) return stored;
    try {
      var match = document.cookie.match(/(?:^|;\s*)fth-consent-v1=(accepted|rejected)(?:;|$)/);
      if (match) return match[1];
    } catch (_error) {}
    return null;
  }
  function persistConsent(choice) {
    try { window.localStorage.setItem(consentKey, choice); } catch (_error) {}
    try {
      document.cookie = consentKey + '=' + choice +
        '; Max-Age=31536000; Path=/; SameSite=Lax' +
        (window.location.protocol === 'https:' ? '; Secure' : '');
    } catch (_error) {}
  }
  var consent = readConsent();
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
  var consentOpenedFromSettings = false;
  cookieSettings.addEventListener('click', function () {
    consentOpenedFromSettings = true;
    notice.hidden = false;
    acceptCookies.focus();
  });
  (document.querySelector('footer') || document.body).appendChild(cookieSettings);
  function chooseConsent(choice) {
    consent = choice;
    persistConsent(choice);
    if (choice === 'rejected') {
      ['fth-directory-last', 'fth-directory-history', 'fth-sort'].forEach(function (key) {
        try { window.localStorage.removeItem(key); } catch (_error) {}
      });
    }
    notice.hidden = true;
    // The footer settings control can be far off-screen on iPhone. Do not
    // jump down the page after dismissing a first-visit consent banner.
    if (consentOpenedFromSettings) {
      consentOpenedFromSettings = false;
      try { cookieSettings.focus({ preventScroll: true }); } catch (_error) { cookieSettings.focus(); }
    }
    window.dispatchEvent(new Event('fth-consent-change'));
    if (choice === 'rejected') {
      // Revoke a previously loaded analytics session and remove its first-party cookies.
      var config = document.querySelector('meta[name="fth-analytics"]');
      if (config) window['ga-disable-' + config.content] = true;
      try {
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
      } catch (_error) {
        // Cookie access can be denied by Safari privacy settings.
      }
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

  // The native details disclosure also works without JavaScript.
  // When enhanced, clicking outside or pressing Escape closes the support popover.
  var supportWidget = document.getElementById("support-widget");
  if (supportWidget) {
    document.addEventListener("click", function (event) {
      if (supportWidget.open && !supportWidget.contains(event.target)) supportWidget.open = false;
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && supportWidget.open) {
        event.preventDefault();
        supportWidget.open = false;
        supportWidget.querySelector("summary").focus();
      }
    });
  }

  // Progressive category filtering: the static directory remains fully visible without JS.
  var overviewSearch = document.getElementById("category-overview-search");
  var overviewGrid = document.getElementById("category-overview-grid");
  var overviewEmpty = document.getElementById("category-overview-empty");
  if (overviewSearch && overviewGrid && overviewEmpty) {
    var overviewCards = Array.prototype.slice.call(overviewGrid.querySelectorAll(".category-overview-card"));
    overviewSearch.addEventListener("input", function () {
      var query = overviewSearch.value.trim().toLocaleLowerCase();
      var visible = 0;
      overviewCards.forEach(function (card) {
        var matches = !query || card.textContent.toLocaleLowerCase().includes(query);
        card.hidden = !matches;
        if (matches) visible++;
      });
      overviewEmpty.hidden = visible !== 0;
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
  // Show short explanations on mouse hover; keep native tap/click and keyboard controls.
  // Native <details> provides the no-JavaScript fallback for touch and assistive tech.
  var hoverHelpMedia = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)");
  function bindContextHelp(root) {
  root.querySelectorAll("details.eligibility-help, details.classification-help").forEach(function (help) {
    if (help.dataset.fthHelpBound) return;
    help.dataset.fthHelpBound = "true";
    var summary = help.querySelector("summary");
    var content = help.querySelector(".eligibility-help-panel, .classification-help-panel");
    var hoverRegion = help.classList.contains("eligibility-help")
      ? help.closest(".eligibility-note") : help;
    if (!summary || !content || !hoverRegion || !hoverHelpMedia) return;
    var closeTimer = null;
    var mouseOpened = false;
    var pointerType = "";

    function cancelClose() {
      if (closeTimer !== null) window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    function mouseEnter(event) {
      if (!hoverHelpMedia.matches || event.pointerType !== "mouse") return;
      cancelClose();
      if (!help.open) {
        help.open = true;
        mouseOpened = true;
      }
    }
    function mouseLeave(event) {
      if (!hoverHelpMedia.matches || event.pointerType !== "mouse" || !mouseOpened) return;
      cancelClose();
      // The legacy popover has a small visual gap; allow the cursor to cross it.
      closeTimer = window.setTimeout(function () {
        closeTimer = null;
        if (hoverRegion.matches(":hover") || content.matches(":hover")) return;
        // A keyboard user following a link inside the explanation must retain it.
        if (content.contains(document.activeElement)) { mouseOpened = false; return; }
        help.open = false;
        mouseOpened = false;
      }, 180);
    }
    summary.addEventListener("pointerenter", mouseEnter);
    summary.addEventListener("pointerdown", function (event) {
      pointerType = event.pointerType;
    });
    hoverRegion.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") cancelClose();
    });
    hoverRegion.addEventListener("pointerleave", mouseLeave);
    if (content !== hoverRegion) {
      content.addEventListener("pointerenter", function (event) {
        if (event.pointerType === "mouse") cancelClose();
      });
      content.addEventListener("pointerleave", mouseLeave);
    }
    summary.addEventListener("click", function (event) {
      if (hoverHelpMedia.matches && pointerType === "mouse" && event.detail > 0) {
        // Opening on pointerenter must not be undone by the ensuing mouse click.
        event.preventDefault();
        cancelClose();
        help.open = true;
        mouseOpened = true;
      } else {
        // Touch taps and keyboard activation keep their native toggle behavior.
        mouseOpened = false;
        cancelClose();
      }
      pointerType = "";
    });
    help.addEventListener("toggle", function () {
      if (!help.open) { mouseOpened = false; cancelClose(); }
    });
  });
  }
  bindContextHelp(document);

  // Keep contextual explanations local, dismissible and keyboard accessible.
  document.addEventListener("click", function (event) {
    document.querySelectorAll("details.eligibility-help[open], details.classification-help[open]").forEach(function (panel) {
      if (!panel.contains(event.target)) panel.open = false;
    });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var panels = document.querySelectorAll("details.eligibility-help[open], details.classification-help[open]");
    if (!panels.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    var summary = panels[0].querySelector("summary");
    panels.forEach(function (panel) { panel.open = false; });
    if (summary) summary.focus({preventScroll:true});
  });
  // Category pages have their own in-page controls and don't need Home's
  // remote search index. Keep every card server-rendered for SEO/no-JS.
  var categoryGrid = document.getElementById("category-service-grid");
  var categoryPagination = document.getElementById("category-pagination");
  var categoryMore = document.getElementById("category-load-more");
  var categoryMoreWrap = document.getElementById("category-load-more-wrap");
  var categoryStatus = document.getElementById("category-page-status");
  if (categoryGrid && categoryPagination && categoryMore && categoryMoreWrap && categoryStatus) {
    var categoryCards = Array.prototype.slice.call(categoryGrid.querySelectorAll(".service-card"));
    var categoryPageSize = 12;
    var categoryTools = document.getElementById("category-tools");
    var categorySearch = document.getElementById("category-search");
    var categorySort = document.getElementById("category-sort");
    var categoryPlan = document.getElementById("category-plan");
    var categoryHosting = document.getElementById("category-hosting");
    var categoryNoCard = document.getElementById("category-no-card");
    var categoryCommercial = document.getElementById("category-commercial");
    var categoryFilterActive = document.getElementById("category-filter-active");
    var categoryClear = document.getElementById("category-clear-filters");
    var categoryEmpty = document.getElementById("category-no-results");
    var hasCategoryControls = !!(categoryTools && categorySearch && categorySort &&
      categoryPlan && categoryHosting && categoryNoCard && categoryCommercial &&
      categoryFilterActive && categoryClear && categoryEmpty);
    var categoryItems = hasCategoryControls ? categoryCards.map(function (card, index) {
      var title = card.querySelector(".card-identity h3 a");
      return {
        card: card, order: index, name: (title && title.textContent) || "",
        search: (card.getAttribute("data-search") || "").toLowerCase(),
        added: card.getAttribute("data-added-at-utc") || "",
        checked: card.getAttribute("data-last-checked") || "",
        plan: card.getAttribute("data-offer-plan") || "",
        hosting: card.getAttribute("data-hosting-model") || "",
        credit: card.getAttribute("data-credit-card") || "",
        commercial: card.getAttribute("data-commercial-use") || ""
      };
    }) : [];
    var categoryMatched = categoryCards;
    var categoryCurrentPage = 1;
    function categoryPageFromURL() {
      var raw = new URL(window.location.href).searchParams.get("page");
      var lastPage = Math.max(1, Math.ceil(categoryMatched.length / categoryPageSize));
      return raw && /^[1-9][0-9]*$/.test(raw) ? Math.min(lastPage, Number(raw)) : 1;
    }
    function categoryStateFromURL() {
      var params = new URL(window.location.href).searchParams;
      var allowedSort = ["default", "newest", "oldest", "verified", "name", "name-desc"];
      var allowedPlan = ["ongoing", "monthly-credit"];
      var allowedHosting = ["cloud", "self-hosted", "hybrid", "local", "unclassified"];
      categorySearch.value = params.get("q") || "";
      categorySort.value = allowedSort.includes(params.get("sort")) ? params.get("sort") : "default";
      categoryPlan.value = allowedPlan.includes(params.get("offer")) ? params.get("offer") : "";
      categoryHosting.value = allowedHosting.includes(params.get("hosting")) ? params.get("hosting") : "";
      categoryNoCard.checked = params.get("no_card") === "1";
      categoryCommercial.checked = params.get("commercial") === "1";
    }
    function categoryWriteURL(replace) {
      var url = new URL(window.location.href);
      var values = {
        q: categorySearch.value.trim(), sort: categorySort.value === "default" ? "" : categorySort.value,
        offer: categoryPlan.value, hosting: categoryHosting.value,
        no_card: categoryNoCard.checked ? "1" : "",
        commercial: categoryCommercial.checked ? "1" : ""
      };
      Object.keys(values).forEach(function (key) {
        if (values[key]) url.searchParams.set(key, values[key]);
        else url.searchParams.delete(key);
      });
      // Changed filters start a new 12-card page; unrelated referral parameters survive.
      url.searchParams.delete("page");
      var next = url.pathname + url.search + url.hash;
      if (url.href !== window.location.href) {
        window.history[replace ? "replaceState" : "pushState"](null, "", next);
      }
    }
    function categoryApplyFilters() {
      if (!hasCategoryControls) return categoryCards;
      var query = categorySearch.value.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").trim();
      var matched = categoryItems.filter(function (entry) {
        return (!query || entry.search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query)) &&
          (!categoryPlan.value || entry.plan === categoryPlan.value) &&
          (!categoryHosting.value || entry.hosting === categoryHosting.value) &&
          (!categoryNoCard.checked || entry.credit === "no") &&
          (!categoryCommercial.checked || entry.commercial === "yes");
      });
      var mode = categorySort.value;
      matched.sort(function (a, b) {
        if (mode === "name" || mode === "name-desc") {
          var order = a.name.localeCompare(b.name, "en");
          return (mode === "name" ? order : -order) || a.order - b.order;
        }
        if (mode === "newest" || mode === "oldest") {
          var added = (mode === "newest" ? b.added.localeCompare(a.added)
            : a.added.localeCompare(b.added));
          return added || a.order - b.order;
        }
        if (mode === "verified") return b.checked.localeCompare(a.checked) || a.order - b.order;
        return a.order - b.order;
      });
      var active = Number(!!categoryPlan.value) + Number(!!categoryHosting.value) +
        Number(categoryNoCard.checked) + Number(categoryCommercial.checked);
      categoryFilterActive.textContent = String(active);
      categoryFilterActive.hidden = active === 0;
      categoryClear.hidden = !(active || query || mode !== "default");
      categoryEmpty.hidden = matched.length > 0;
      // Move the existing server-rendered DOM nodes, never re-parse HTML.
      // Matched cards retain keyboard handlers, compare buttons, and official links.
      matched.forEach(function (entry) { categoryGrid.appendChild(entry.card); });
      return matched.map(function (entry) { return entry.card; });
    }
    function renderCategoryPage() {
      if (hasCategoryControls) categoryMatched = categoryApplyFilters();
      var shown = Math.min(categoryMatched.length, categoryCurrentPage * categoryPageSize);
      categoryCards.forEach(function (card) { card.hidden = true; });
      categoryMatched.forEach(function (card, index) { card.hidden = index >= shown; });
      categoryStatus.textContent = "Showing " + compactUiCount(shown) + " of " +
        compactUiCount(categoryMatched.length) + (hasCategoryControls &&
          categoryMatched.length !== categoryCards.length ? " matching services" : " services");
      categoryMoreWrap.hidden = shown >= categoryMatched.length;
      if (!categoryMoreWrap.hidden) {
        categoryMore.textContent = "Show " +
          compactUiCount(Math.min(categoryPageSize, categoryMatched.length - shown)) + " more services";
      }
      categoryPagination.hidden = categoryMatched.length === 0;
    }
    function categoryControlsChanged(replace) {
      categoryCurrentPage = 1;
      categoryWriteURL(replace);
      renderCategoryPage();
    }
    categoryMore.addEventListener("click", function () {
      if (categoryCurrentPage * categoryPageSize >= categoryMatched.length) return;
      var previousShown = categoryCurrentPage * categoryPageSize;
      categoryCurrentPage++;
      var url = new URL(window.location.href);
      url.searchParams.set("page", String(categoryCurrentPage));
      window.history.pushState(null, "", url.pathname + url.search + url.hash);
      renderCategoryPage();
      // Focus the first newly revealed matched card, not a hidden or filtered one.
      var firstNewLink = categoryMatched[previousShown] &&
        categoryMatched[previousShown].querySelector(".card-identity h3 a");
      if (firstNewLink) {
        firstNewLink.focus({ preventScroll: true });
        firstNewLink.scrollIntoView({ block: "start" });
      }
    });
    if (hasCategoryControls) {
      categoryStateFromURL();
      categoryMatched = categoryApplyFilters();
      categoryTools.hidden = false;
      categorySearch.addEventListener("input", function () { categoryControlsChanged(true); });
      [categorySort, categoryPlan, categoryHosting, categoryNoCard, categoryCommercial]
        .forEach(function (control) {
          control.addEventListener("change", function () { categoryControlsChanged(false); });
        });
      categoryClear.addEventListener("click", function () {
        categorySearch.value = "";
        categorySort.value = "default";
        categoryPlan.value = "";
        categoryHosting.value = "";
        categoryNoCard.checked = false;
        categoryCommercial.checked = false;
        categoryControlsChanged(false);
        categorySearch.focus();
      });
    }
    window.addEventListener("popstate", function () {
      if (hasCategoryControls) {
        categoryStateFromURL();
        categoryMatched = categoryApplyFilters();
      }
      categoryCurrentPage = categoryPageFromURL();
      renderCategoryPage();
    });
    categoryCurrentPage = categoryPageFromURL();
    renderCategoryPage();
  }

  // On the static limited-offers archive, filter already-rendered cards in place.
  // Canonical SEO and complete no-JavaScript HTML remain unchanged.
  var offersFilters = document.getElementById("offers-program-filters");
  var offersGrid = document.getElementById("offers-service-grid");
  if (offersFilters && offersGrid) {
    var offerCards = Array.prototype.slice.call(offersGrid.querySelectorAll(".service-card"));
    var offerButtons = Array.prototype.slice.call(offersFilters.querySelectorAll("[data-offers-mode]"));
    function renderOffersProgramFilter() {
      var active = new URL(window.location.href).searchParams.get("offer") === "startup";
      offerCards.forEach(function (card) {
        card.hidden = active && card.getAttribute("data-program") !== "startup";
      });
      offerButtons.forEach(function (button) {
        button.setAttribute("aria-pressed",
          String((button.getAttribute("data-offers-mode") === "startup") === active));
      });
    }
    offersButtonsSetup();
    function offersButtonsSetup() {
      offersFilters.hidden = false;
      offerButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          var url = new URL(window.location.href);
          if (button.getAttribute("data-offers-mode") === "startup") {
            url.searchParams.set("offer", "startup");
          } else {
            url.searchParams.delete("offer");
          }
          window.history.pushState(null, "", url.pathname + url.search + url.hash);
          renderOffersProgramFilter();
        });
      });
      window.addEventListener("popstate", renderOffersProgramFilter);
      renderOffersProgramFilter();
    }
  }

  var search = document.getElementById("search");
  var heroSearch = document.getElementById("hero-search");
  var filterToggle = document.getElementById("advanced-filter-toggle");
  var advancedFilters = document.getElementById("advanced-filters");
  var filterCount = document.getElementById("active-filter-count");
  function updateFilterCount() {
    if (!filterCount) return;
    var count = Number(!!hostingModel) + Number(!!offerType) + Number(!!(mobileCategory && mobileCategory.value));
    if (window.matchMedia("(max-width: 680px)").matches) {
      count += Number(!!(noCard && noCard.checked)) + Number(!!(commercial && commercial.checked));
    }
    if (filterToggle) filterToggle.setAttribute("aria-label", count ? "Filters, " + count + " active" : "Filters");
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

  // Keep the same checkbox inputs/state owners when moving them into the phone sheet.
  var quickFilters = document.querySelector(".quick-filters");
  var quickFiltersHome = document.createComment("quick filters home");
  if (quickFilters) quickFilters.before(quickFiltersHome);
  var mobileToolbarMedia = window.matchMedia("(max-width: 680px)");
  function compactToolbar() {
    if (quickFilters) {
      if (mobileToolbarMedia.matches) {
        advancedFilters.insertBefore(quickFilters, document.getElementById("filter-show-results"));
      } else quickFiltersHome.parentNode.insertBefore(quickFilters, quickFiltersHome.nextSibling);
    }
    search.placeholder = mobileToolbarMedia.matches ? "Search services…" : "Search services, categories, or keywords";
    updateFilterCount();
  }
  compactToolbar();
  if (mobileToolbarMedia.addEventListener) mobileToolbarMedia.addEventListener("change", compactToolbar);
  else mobileToolbarMedia.addListener(compactToolbar);

  // The Home ships with only 12 crawlable cards. The rest are discovered from
  // a compact metadata index, with pre-rendered card HTML fetched by category.
  var seedCards = Array.prototype.slice.call(grid.querySelectorAll(".service-card"));
  var seedMarkup = Object.create(null);
  seedCards.forEach(function (card) {
    seedMarkup[card.getAttribute("data-service-id")] = card.outerHTML;
  });
  var cards = [];
  var searchReady = false;
  var searchFailed = false;
  var searchLoading = null;
  var searchRevision = "";
  var cardGroups = Object.create(null);
  var cardInflight = Object.create(null);
  var drawSerial = 0;
  var lastDrawn = seedCards.map(function (card) { return card.getAttribute("data-service-id"); }).join("|");
  var searchStatus = document.getElementById("search-load-status");
  function setSearchStatus(message) {
    if (!searchStatus) return;
    searchStatus.hidden = !message;
    searchStatus.textContent = message || "";
  }
  function loadSearchIndex() {
    if (searchLoading || searchReady || searchFailed) return;
    if (!window.fetch) {
      searchFailed = true;
      setSearchStatus("Search needs a modern browser. Browse all categories for the complete catalog.");
      return;
    }
    setSearchStatus("Loading service search…");
    searchLoading = window.fetch(grid.getAttribute("data-search-index"), { credentials: "same-origin", cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw Error("Could not load search index");
        return response.json();
      }).then(function (payload) {
        if (!payload || payload.version !== 1 || !/^[a-f0-9]{12}$/.test(payload.revision) ||
            !Array.isArray(payload.rows)) throw Error("Unsupported search index version");
        if (!Array.isArray(payload.startup_program_ids) ||
            !payload.startup_program_ids.every(function (id) {
              return typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
            })) throw Error("Invalid startup program index");
        var startupIds = new Set(payload.startup_program_ids);
        if (startupIds.size !== payload.startup_program_ids.length) throw Error("Duplicate startup program IDs");
        var known = Object.create(null);
        var next = payload.rows.map(function (row, order) {
          if (!Array.isArray(row) || row.length !== 10 ||
              row.some(function (value) { return typeof value !== "string"; }) ||
              !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row[0]) || known[row[0]]) {
            throw Error("Invalid or duplicate search entry");
          }
          known[row[0]] = true;
          return { id: row[0], name: row[1], category: row[2], plan: row[3],
            hosting: row[4], credit: row[5], commercial: row[6],
            added: row[7], checked: row[8], search: normalize(row[9]), order: order,
            program: startupIds.has(row[0]) ? "startup" : "" };
        });
        if (!next.length) throw Error("Empty search index");
        if (next.filter(function (entry) { return entry.program === "startup" && entry.plan !== "limited-duration"; }).length ||
            payload.startup_program_ids.some(function (id) { return !known[id]; })) {
          throw Error("Invalid startup program catalog references");
        }
        cards = next;
        searchRevision = payload.revision;
        searchReady = true;
        searchLoading = null;
        setSearchStatus("");
        render();
      }).catch(function () {
        searchFailed = true;
        searchLoading = null;
        grid.removeAttribute("aria-busy");
        setSearchStatus("Search is temporarily unavailable. Browse all categories to view the complete catalog.");
      });
  }
  function loadCardGroup(categoryName) {
    if (cardGroups[categoryName]) return Promise.resolve(cardGroups[categoryName]);
    if (cardInflight[categoryName]) return cardInflight[categoryName];
    // The query revision prevents mixing HTML from different GitHub Pages deploys.
    var url = grid.getAttribute("data-search-cards") +
      encodeURIComponent(categoryName) + ".json?v=" + encodeURIComponent(searchRevision);
    cardInflight[categoryName] = window.fetch(url, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw Error("Could not load category cards");
        return response.json();
      }).then(function (fragmentMap) {
        if (!fragmentMap || Array.isArray(fragmentMap) || typeof fragmentMap !== "object") {
          throw Error("Invalid category card fragment");
        }
        cardGroups[categoryName] = fragmentMap;
        delete cardInflight[categoryName];
        return fragmentMap;
      }).catch(function (error) {
        delete cardInflight[categoryName];
        throw error;
      });
    return cardInflight[categoryName];
  }
  function drawCards(shown) {
    var serial = ++drawSerial;
    var identity = shown.map(function (entry) { return entry.id; }).join("|");
    if (identity === lastDrawn && grid.children.length === shown.length) {
      // The user may return to the original SSR cards while an older fetch
      // is pending; never leave the grid permanently marked as busy.
      grid.removeAttribute("aria-busy");
      setSearchStatus("");
      return;
    }
    var needed = [];
    shown.forEach(function (entry) {
      if (!seedMarkup[entry.id] && !cardGroups[entry.category] &&
          needed.indexOf(entry.category) < 0) needed.push(entry.category);
    });
    if (needed.length) grid.setAttribute("aria-busy", "true");
    Promise.all(needed.map(loadCardGroup)).then(function () {
      if (serial !== drawSerial) return; // a more recent query superseded this one
      var fragment = document.createDocumentFragment();
      shown.forEach(function (entry) {
        var html = seedMarkup[entry.id] ||
          (cardGroups[entry.category] && cardGroups[entry.category][entry.id]);
        if (typeof html !== "string") throw Error("Missing rendered service card " + entry.id);
        var template = document.createElement("template");
        template.innerHTML = html;
        var node = template.content.firstElementChild;
        if (!node || !node.classList.contains("service-card") ||
            node.getAttribute("data-service-id") !== entry.id) {
          throw Error("Invalid rendered service card " + entry.id);
        }
        node.hidden = false;
        node.removeAttribute("data-paged-hidden");
        fragment.appendChild(node);
      });
      grid.replaceChildren(fragment);
      refreshNewServiceBadges(grid);
      bindContextHelp(grid);
      lastDrawn = identity;
      grid.removeAttribute("aria-busy");
      setSearchStatus("");
    }).catch(function () {
      if (serial !== drawSerial) return;
      grid.removeAttribute("aria-busy");
      setSearchStatus("Could not load matching cards. Refresh the page or browse all categories.");
    });
  }
  var category = "";
  var hostingModel = "";
  var hostingSelect = document.getElementById("hosting-filter");
  var offerType = "";
  var offerSelect = document.getElementById("offer-filter");
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
    offerType = state.offer || "";
    if (offerSelect) offerSelect.value = offerType;
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
      q: search.value, category: category, sort: sort.value, hosting: hostingModel, offer: offerType,
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
    if (mode === "name" || mode === "name-desc") {
      matched.sort(function (a, b) {
        return (mode === "name" ? a.name.localeCompare(b.name, "en")
          : b.name.localeCompare(a.name, "en")) || a.order - b.order;
      });
    } else if (mode === "newest" || mode === "oldest") {
      matched.sort(function (a, b) {
        return (mode === "newest" ? b.added.localeCompare(a.added)
          : a.added.localeCompare(b.added)) ||
          (mode === "newest" ? b.order - a.order : a.order - b.order);
      });
    } else if (mode === "verified") {
      matched.sort(function (a, b) {
        return b.checked.localeCompare(a.checked) || a.order - b.order;
      });
    } else if (mode === "category") {
      matched.sort(function (a, b) {
        return a.category.localeCompare(b.category) ||
          a.name.localeCompare(b.name, "en") || a.order - b.order;
      });
    } else {
      matched.sort(function (a, b) { return a.order - b.order; });
    }
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
      if (state.offer) parts.push(Array.from(offerSelect.options).find(function (option) { return option.value === state.offer; }).text);
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
      var state = {q:search.value, category:category, hosting:hostingModel, offer:offerType, sort:sort.value, noCard:noCard.checked, commercial:commercial.checked};
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
    if (offerType) selected.push(["offer", offerSelect.options[offerSelect.selectedIndex].text]);
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
    else if (key === "offer") { offerType = ""; offerSelect.value = ""; }
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
  if (offerSelect) offerSelect.addEventListener("change", function () {
    // Educational benefits have separate eligibility and credit rules.
    // Treat this menu option as navigation, never as a free-tier filter value.
    if (offerSelect.value === "education") {
      window.location.assign(document.getElementById("education-filter-destination").href);
      return;
    }
    offerType = offerSelect.value;
    visible = pageSize;
    render();
  });
  function render() {
    syncURL();
    if (!searchReady) { loadSearchIndex(); return; }
    document.querySelectorAll("[data-quick-filter]").forEach(function (button) {
      var mode = button.getAttribute("data-quick-filter");
      var active = mode === "all" ? !noCard.checked && !commercial.checked
        : mode === "no-card" ? noCard.checked : commercial.checked;
      button.setAttribute("aria-pressed", String(active));
    });
    var term = normalize(search.value);
    var pool = cards.filter(function (entry) {
      return urlState.matchesOffer(entry.plan, offerType, entry.program);
    });
    var matched = pool.filter(function (entry) {
      return (!term || entry.search.indexOf(term) !== -1) &&
        (!category || entry.category === category) &&
        (!hostingModel || entry.hosting === hostingModel) &&
        (!noCard || !noCard.checked || entry.credit === "no") &&
        (!commercial || !commercial.checked || entry.commercial === "yes");
    });
    sortCards(matched);
    drawCards(matched.slice(0, visible));
    var shown = Math.min(matched.length, visible);
    var summary = urlState.summarizeResults(matched.length, pool.length, shown, {
      q: search.value, category: category, hosting: hostingModel, offer: offerType,
      noCard: noCard.checked, commercial: commercial.checked
    });
    // The right-hand counter owns the current result total for both unfiltered
    // and filtered views. Dropdown options disclose each catalog-wide scope.
    var totalBadge = document.createElement("strong");
    totalBadge.className = "result-total";
    totalBadge.textContent = compactUiCount(summary.total);
    totalBadge.title = summary.total;
    totalBadge.setAttribute("aria-label", summary.total + " results");
    var totalLabel = document.createElement("span");
    totalLabel.className = "result-label";
    totalLabel.textContent = summary.label;
    var shownLabel = document.createElement("span");
    shownLabel.className = "result-shown";
    shownLabel.textContent = summary.shown.replace(/\b\d{4,}\b/g, compactUiCount);
    shownLabel.title = summary.shown;
    count.replaceChildren(totalLabel, totalBadge, shownLabel);
    empty.hidden = matched.length !== 0;
    if (moreWrap) moreWrap.hidden = matched.length <= visible;
    if (more) more.textContent = "Show more (" + compactUiCount(matched.length - shown) + " remaining)";
    if (clear) clear.hidden = !hostingModel && !offerType && !term && !category &&
      (!noCard || !noCard.checked) && (!commercial || !commercial.checked);

    categoryButtons.forEach(function (button) {
      var chipCategory = button.getAttribute("data-filter-category");
      var allFiltersClear = !term && !hostingModel && !offerType &&
        !noCard.checked && !commercial.checked;
      var isActive = chipCategory === category && (chipCategory !== "" || allFiltersClear);
      button.setAttribute("aria-pressed", String(isActive));
    });
    if (mobileCategory && mobileCategory.value !== category) {
      mobileCategory.value = category;
    }
    updateFilterCount();
    renderActiveFilters();
    selectWidgets.forEach(function (widget) { widget.sync(); });
    if (showResults) showResults.textContent = "Show results (" + compactUiCount(matched.length) + ")";
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
  function resetDirectoryFilters() {
    // The "All services" chip represents the entire catalog, not just all categories.
    category = "";
    hostingModel = "";
    if (hostingSelect) hostingSelect.value = "";
    offerType = "";
    if (offerSelect) offerSelect.value = "";
    search.value = "";
    if (headerSearch) headerSearch.value = "";
    if (heroSearch) heroSearch.value = "";
    noCard.checked = false;
    commercial.checked = false;
    visible = pageSize;
    updateFilterCount();
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
      var nextCategory = button.getAttribute("data-filter-category");
      if (nextCategory === "") resetDirectoryFilters();
      else changeCategory(nextCategory);
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
    resetDirectoryFilters();
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
  if (consent === 'accepted' && !['q','category','hosting','offer','sort','no_card','commercial'].some(function (key) { return new URL(window.location.href).searchParams.has(key); })) {
    try {
      var lastFilters = window.localStorage.getItem('fth-directory-last');
      if (lastFilters && lastFilters.startsWith('?') && lastFilters.length < 3000) applyFilterState(readFilterState(lastFilters));
    } catch (_error) {}
  }
  [sort, mobileCategory, offerSelect, hostingSelect].forEach(enhanceSelect);
  doc.classList.add("js-enabled");
  render();
})();
