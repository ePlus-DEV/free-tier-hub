// Resolve deployment mode for a canonical ten-field candidate Issue.
// Metadata lives in a separate, trusted JSON Issue comment, not the Issue payload.
// Legacy eleven-field candidates remain supported until their existing queue drains.
const MODELS = new Set(['cloud', 'self-hosted', 'hybrid', 'local', 'unclassified']);
const TRUSTED = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

export function resolveCandidateDeployment(candidate, comments = []) {
  if (Object.hasOwn(candidate, 'deployment_model')) return candidate;
  for (const comment of [...comments].reverse()) {
    if (!TRUSTED.has(comment?.author_association)) continue;
    let evidence;
    try { evidence = JSON.parse(comment.body); } catch { continue; }
    if (!evidence || Array.isArray(evidence) ||
        Object.keys(evidence).sort().join(',') !== 'deployment_model,source' ||
        !MODELS.has(evidence.deployment_model)) continue;
    try {
      const source = new URL(evidence.source);
      if (source.protocol !== 'https:' || !source.hostname ||
          source.username || source.password) continue;
    } catch { continue; }
    return { ...candidate, deployment_model: evidence.deployment_model };
  }
  return null; // Fail closed: do not publish an inferred or absent deployment mode.
}
