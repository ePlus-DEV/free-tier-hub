// An enhancement only: cards remain visible and provider links work without JS.
(() => {
  const cards = [...document.querySelectorAll('[data-education-id]')];
  const audience = document.querySelector('#education-audience');
  const benefit = document.querySelector('#education-benefit');
  const count = document.querySelector('#education-results');
  if (!cards.length || !audience || !benefit || !count) return;
  const allowedAudiences = new Set(['all', 'student', 'teacher', 'school', 'nonprofit', 'opensource']);
  const allowedBenefits = new Set(['all', 'free', 'credit', 'discount']);
  const query = new URLSearchParams(location.search);
  const a = query.get('audience') || 'all';
  const b = query.get('benefit') || 'all';
  audience.value = allowedAudiences.has(a) ? a : 'all';
  benefit.value = allowedBenefits.has(b) ? b : 'all';
  const update = () => {
    let shown = 0;
    for (const card of cards) {
      const matchAudience = audience.value === 'all' ||
        card.dataset.audiences.split(' ').includes(audience.value);
      const matchBenefit = benefit.value === 'all' || card.dataset.benefitType === benefit.value;
      card.hidden = !(matchAudience && matchBenefit);
      if (!card.hidden) shown++;
    }
    count.textContent = shown + ' of ' + cards.length + ' verified education benefits';
    const url = new URL(location.href);
    for (const [name, value] of [['audience', audience.value], ['benefit', benefit.value]]) {
      if (value === 'all') url.searchParams.delete(name);
      else url.searchParams.set(name, value);
    }
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    const empty = document.querySelector('#education-empty');
    if (empty) empty.hidden = shown > 0;
  };
  audience.addEventListener('change', update);
  benefit.addEventListener('change', update);
  update();
})();
