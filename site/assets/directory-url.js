/* Query state shared by the directory and its Node tests. */
(function (root) {
  "use strict";
  root.FreeTierDirectoryURL = {
    // The prominent counter describes the current result set. The unfiltered
    // offer scope is context only, never the search result count.
    summarizeResults: function (matchedCount, scopeCount, shownCount, state) {
      var narrowed = !!((state.q || "").trim() || state.category || state.hosting ||
        state.noCard || state.commercial);
      var offer = state.offer || "";
      var scopeName = offer === "limited" ? "limited offers"
        : offer === "monthly-credit" ? "monthly credits"
        : offer === "ongoing" ? "ongoing free tiers" : "free tiers";
      var label = narrowed ? "Matching services"
        : offer === "limited" ? "Limited offers"
        : offer === "monthly-credit" ? "Monthly credits"
        : offer === "ongoing" ? "Ongoing free tiers" : "Total free tiers";
      return {
        label: label,
        total: String(matchedCount),
        shown: "Showing " + Math.min(shownCount, matchedCount) + " of " + matchedCount +
          (narrowed ? " · " + scopeCount + " " + scopeName + " total" : "")
      };
    },
    matchesOffer: function (plan, offer) {
      if (offer === "") return plan === "ongoing" || plan === "monthly-credit";
      if (offer === "limited") return plan === "limited-duration" || plan === "temporary-resource";
      return ["ongoing", "monthly-credit"].includes(offer) && plan === offer;
    },
    read: function (href, categories, sorts) {
      var params = new URL(href).searchParams;
      var category = params.get("category") || "";
      var sort = params.get("sort") || "default";
      return {
        hosting: ["cloud", "self-hosted", "hybrid", "local", "unclassified"].includes(params.get("hosting")) ? params.get("hosting") : "",
        offer: ["ongoing", "monthly-credit", "limited"].includes(params.get("offer")) ? params.get("offer") : "",
        q: params.get("q") || "",
        category: categories.includes(category) ? category : "",
        sort: sorts.includes(sort) ? sort : "default",
        noCard: params.get("no_card") === "1",
        commercial: params.get("commercial") === "1"
      };
    },
    write: function (href, state) {
      var url = new URL(href);
      var values = {
        hosting: state.hosting || "",
        offer: ["ongoing", "monthly-credit", "limited"].includes(state.offer) ? state.offer : "",
        q: state.q || "",
        category: state.category || "",
        sort: state.sort === "default" ? "" : state.sort,
        no_card: state.noCard ? "1" : "",
        commercial: state.commercial ? "1" : ""
      };
      Object.keys(values).forEach(function (key) {
        if (values[key]) url.searchParams.set(key, values[key]);
        else url.searchParams.delete(key);
      });
      return url.href;
    }
  };
})(globalThis);
