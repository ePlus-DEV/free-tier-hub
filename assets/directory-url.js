/* Query state shared by the directory and its Node tests. */
(function (root) {
  "use strict";
  root.FreeTierDirectoryURL = {
    read: function (href, categories, sorts) {
      var params = new URL(href).searchParams;
      var category = params.get("category") || "";
      var sort = params.get("sort") || "default";
      return {
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
