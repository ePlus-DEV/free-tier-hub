/* Expired PR preview recovery: serve the matching production route, never Home by default. */
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
  var count = document.getElementById("preview-countdown");
  var destination = document.getElementById("preview-target-path");
  var link = document.getElementById("preview-go-now");
  if (!fallback || !panel || !number || !count || !destination || !link) return;

  number.textContent = "#" + match[1];
  destination.textContent = target.pathname + target.search + target.hash;
  link.href = target.href;
  fallback.hidden = true;
  panel.hidden = false;

  var remaining = 5;
  count.textContent = String(remaining);
  var timer = window.setInterval(function () {
    remaining -= 1;
    count.textContent = String(Math.max(0, remaining));
    if (remaining <= 0) {
      window.clearInterval(timer);
      window.location.replace(target.href);
    }
  }, 1000);
})();
