/* Progressive enhancement: service details and links remain crawlable without JavaScript. */
(function () {
  "use strict";
  var search = document.getElementById("search");
  var filter = document.getElementById("category-filter");
  var grid = document.getElementById("service-grid");
  var counter = document.getElementById("results-count");
  var empty = document.getElementById("no-results");
  if (!search || !filter || !grid || !counter || !empty) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".service-card"));
  function update() {
    var term = search.value.trim().toLocaleLowerCase();
    var category = filter.value;
    var count = 0;
    cards.forEach(function (card) {
      var matchesTerm = !term || card.getAttribute("data-search").indexOf(term) !== -1;
      var matchesCategory = !category || card.getAttribute("data-category") === category;
      card.hidden = !(matchesTerm && matchesCategory);
      if (!card.hidden) count++;
    });
    counter.textContent = "Showing " + count + " of " + cards.length + " services";
    empty.hidden = count !== 0;
  }
  search.addEventListener("input", update);
  filter.addEventListener("change", update);
})();
