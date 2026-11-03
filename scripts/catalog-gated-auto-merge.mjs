// Pure eligibility and exact-head check helpers for the event-driven merge gate.
// No network access, polling, or GitHub mutation runs from this module.
export function eligibleForAutoMerge(item) {
  return item && item.plan === 'ongoing' &&
    ['local', 'self-hosted'].includes(item.deployment_model) &&
    item.credit_card === 'no' && item.commercial_use === 'yes' &&
    /^https:\/\/github\.com\/[a-z\d_.-]+\/[a-z\d_.-]+\/?$/i.test(item.pricing_url || '');
}

export function successfulChecks(runs, head) {
  const required = ['Validate free tier catalog', 'Build and deploy GitHub Pages'];
  return required.every(name => runs.some(run =>
    run.name === name && run.head_sha === head &&
    run.event === 'pull_request' && run.status === 'completed' &&
    run.conclusion === 'success'));
}

export function changedOnlyCandidate(files, item) {
  return files.length === 1 &&
    files[0].status === 'added' &&
    files[0].filename === 'data/services/' + item.category + '/' + item.id + '.json';
}
