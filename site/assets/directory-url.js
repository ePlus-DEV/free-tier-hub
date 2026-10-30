/* Query state shared by the directory and its Node tests. */
(function (root) {
  "use strict";
  root.FreeTierDirectoryURL = {
    matchesOffer: function (plan, offer) {
      return !offer || (["ongoing", "monthly-credit"].includes(offer) && plan === offer);
    },
    read: function (href, categories, sorts) {
      var params = new URL(href).searchParams;
      var category = params.get("category") || "";
      var sort = params.get("sort") || "default";
      return {
        hosting: ["cloud", "self-hosted", "hybrid", "local", "unclassified"].includes(params.get("hosting")) ? params.get("hosting") : "",
        offer: ["ongoing", "monthly-credit"].includes(params.get("offer")) ? params.get("offer") : "",
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
        offer: ["ongoing", "monthly-credit"].includes(state.offer) ? state.offer : "",
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
