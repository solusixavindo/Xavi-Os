import { membershipPlans } from '../plans';

describe('canonical mobile membership matrix', () => {
  test('contains only canonical plan identifiers in order', () => {
    expect(membershipPlans.map((plan) => plan.id)).toEqual(['basic', 'pro', 'premium', 'platinum']);
  });

  test('keeps the explicit workspace limits and no commercial price field', () => {
    expect(membershipPlans.map((plan) => plan.businessWorkspaceLimit)).toEqual([0, 1, 3, 10]);
    expect(membershipPlans.every((plan) => plan.personalWorkspace)).toBe(true);
    expect(membershipPlans.every((plan) => plan.commercialTerms === 'pending')).toBe(true);
    expect(membershipPlans.some((plan) => 'price' in plan)).toBe(false);
  });
});
