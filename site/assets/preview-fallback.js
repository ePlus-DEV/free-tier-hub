/* Expired PR preview recovery: immediately open the same production route. */
(function () {
  "use strict";
  var current = new URL(window.location.href);
  var match = /^\/pr-preview\/pr-([1-9][0-9]*)(?:\/(.*))?$/.exec(current.pathname);
  if (!match) return;

  var remainingPath = match[2] || "";
  // All destinations are same-origin. Reject ambiguous paths instead of guessing.
  if (remainingPath.startsWith("/") || remainingPath.includes("\\") ||
      /%(?:2f|5c)/i.test(remainingPath)) return;
  var target = new URL("/" + remainingPath, current.origin);
  target.search = current.search;
  target.hash = current.hash;
  if (target.origin !== current.origin || target.pathname.startsWith("/pr-preview/")) return;

  var fallback = document.getElementById("generic-not-found");
  var panel = document.getElementById("preview-expired");
  var number = document.getElementById("preview-pr-number");
  var destination = document.getElementById("preview-target-path");
  var link = document.getElementById("preview-go-now");
  // Keep the destination link as a fallback if browser navigation is blocked.
  // Missing optional page markup must never prevent the redirect.
  if (fallback && panel && number && destination && link) {
    number.textContent = "#" + match[1];
    destination.textContent = target.pathname + target.search + target.hash;
    link.href = target.href;
    fallback.hidden = true;
    panel.hidden = false;
  }

  // GitHub Pages serves 404.html for deleted previews. Navigate immediately,
  // without a countdown or keeping the expired URL in browser history.
  window.location.replace(target.href);
})();
