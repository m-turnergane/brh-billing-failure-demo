// Original, deliberately tiny application projections. No BRH implementation lives here.
export const fixtures = {
  'entitlement-mismatch': {
    version: 1, purchase: 'PRO_ANNUAL', initialKeys: ['obsolete-feature'],
    expectedKeys: ['feature-1', 'feature-2'], brokenKeys: ['free-feature'],
    catalog: { PRO: ['feature-1', 'feature-2'], FREE: ['free-feature', 'obsolete-feature'] },
  },
  'ack-before-persistence': {
    version: 1, purchase: 'PRO_ANNUAL', initialKeys: ['obsolete-feature'],
    expectedKeys: ['retry-feature'], injectedFailure: 'Injected demo persistence failure',
    catalog: { PRO: ['retry-feature'], FREE: ['obsolete-feature'] },
  },
  'duplicate-delivery': { version: 1, purchase: '7 credits', initialCredits: 0, grant: 7 },
  'out-of-order-events': {
    version: 1, purchase: 'PRO_ANNUAL', initialKeys: ['obsolete-feature'],
    expectedKeys: ['current-feature'], staleKeys: ['stale-feature'],
    catalog: { PRO: ['current-feature'], FREE: ['stale-feature', 'obsolete-feature'] },
  },
};

export function projectBroken(id, fixture, observations) {
  if (id === 'duplicate-delivery') {
    const accepted = observations.filter(step => step.kind === 'payment-write');
    return { fulfillmentCount: accepted.length, credits: fixture.initialCredits + accepted.length * fixture.grant };
  }
  if (id === 'entitlement-mismatch') return { keys: [...fixture.brokenKeys] };
  if (id === 'ack-before-persistence') return { keys: [...fixture.initialKeys] };
  if (id === 'out-of-order-events') return { keys: [...fixture.staleKeys] };
  throw new Error(`Unknown scenario: ${id}`);
}

export function planForKeys(id, keys) {
  const catalog = fixtures[id]?.catalog;
  return catalog && catalog.PRO.every(key => keys.includes(key)) ? 'PRO' : 'FREE';
}
