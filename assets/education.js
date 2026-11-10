// Progressive enhancement: all offers and official links render without JavaScript.
(() => {
  const grid = document.querySelector('#education-service-grid');
  const cards = [...document.querySelectorAll('[data-education-id]')];
  const search = document.querySelector('#education-search');
  const audience = document.querySelector('#education-audience');
  const benefit = document.querySelector('#education-benefit');
  const sort = document.querySelector('#education-sort');
  const count = document.querySelector('#education-results');
  const tools = document.querySelector('#education-tools');
  const activeCount = document.querySelector('#education-filter-active');
  const categoryIndex = document.querySelector('#education-category-index');
  const categoryButtons = [...document.querySelectorAll('[data-education-category]')];
  const featured = document.querySelector('#education-featured');
  const clear = document.querySelector('#education-clear');
  const empty = document.querySelector('#education-empty');
  if (!grid || !search || !audience || !benefit || !sort || !count || !tools) return;
  tools.hidden = false;
  if (categoryIndex && categoryButtons.length) categoryIndex.hidden = false;
  const allowedAudiences = new Set(['all', 'student', 'teacher', 'school', 'nonprofit', 'opensource']);
  const allowedBenefits = new Set(['all', 'free', 'credit', 'discount']);
  const allowedSorts = new Set(['name', 'recent']);
  const allowedCategories = new Set(['all', ...categoryButtons.map(button => button.dataset.educationCategory)]);
  const query = new URLSearchParams(location.search);
  let selectedCategory = allowedCategories.has(query.get('category')) ? query.get('category') : 'all';
  const initialAudience = query.get('audience') || 'all';
  const initialBenefit = query.get('benefit') || 'all';
  const initialSort = query.get('sort') || 'name';
  audience.value = allowedAudiences.has(initialAudience) ? initialAudience : 'all';
  benefit.value = allowedBenefits.has(initialBenefit) ? initialBenefit : 'all';
  sort.value = allowedSorts.has(initialSort) ? initialSort : 'name';
  search.value = (query.get('q') || '').slice(0, 160);
  const normalize = value => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const searchable = new Map(cards.map(card => [card, normalize(card.textContent)]));
  const update = () => {
    const searchQuery = normalize(search.value);
    const sorted = [...cards].sort((a, b) => sort.value === 'recent'
      ? b.dataset.date.localeCompare(a.dataset.date) || a.dataset.name.localeCompare(b.dataset.name)
      : a.dataset.name.localeCompare(b.dataset.name));
    let shown = 0;
    for (const card of sorted) {
      const matchAudience = audience.value === 'all' ||
        card.dataset.audiences.split(' ').includes(audience.value);
      const matchBenefit = benefit.value === 'all' || card.dataset.benefitType === benefit.value;
      const matchSearch = !searchQuery || searchable.get(card).includes(searchQuery);
      const matchCategory = selectedCategory === 'all' || card.dataset.educationGroup === selectedCategory;
      card.hidden = !(matchAudience && matchBenefit && matchSearch && matchCategory);
      if (!card.hidden) shown++;
    }
    grid.append(...sorted);
    count.textContent = 'Showing ' + shown + ' of ' + cards.length + ' education benefits';
    const filterTotal = Number(audience.value !== 'all') + Number(benefit.value !== 'all') +
      Number(selectedCategory !== 'all');
    for (const button of categoryButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.educationCategory === selectedCategory));
    }
    if (activeCount) { activeCount.textContent = filterTotal; activeCount.hidden = filterTotal === 0; }
    const active = Boolean(search.value.trim()) || audience.value !== 'all' ||
      benefit.value !== 'all' || sort.value !== 'name' || selectedCategory !== 'all';
    if (featured) featured.hidden = active;
    if (clear) clear.hidden = !active;
    if (empty) empty.hidden = shown > 0;
    const url = new URL(location.href);
    for (const [key, value, defaultValue] of [
      ['q', search.value.trim(), ''], ['audience', audience.value, 'all'],
      ['benefit', benefit.value, 'all'], ['sort', sort.value, 'name'],
      ['category', selectedCategory, 'all']
    ]) {
      if (value === defaultValue) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  };
  search.addEventListener('input', update);
  audience.addEventListener('change', update);
  benefit.addEventListener('change', update);
  sort.addEventListener('change', update);
  for (const button of categoryButtons) {
    button.addEventListener('click', () => {
      selectedCategory = selectedCategory === button.dataset.educationCategory
        ? 'all' : button.dataset.educationCategory;
      update();
      tools.scrollIntoView({block:'start', behavior:'auto'});
    });
  }
  if (clear) clear.addEventListener('click', () => {
    search.value = '';
    audience.value = 'all';
    benefit.value = 'all';
    sort.value = 'name';
    selectedCategory = 'all';
    update();
    search.focus();
  });
  update();
})();
