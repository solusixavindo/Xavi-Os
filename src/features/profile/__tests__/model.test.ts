import { buildProfileUpdateParams, mapProfile } from '../model';

describe('profile mapping and client update allowlist', () => {
  test('maps database fields without changing privileged values', () => {
    const profile = mapProfile({
      id: 'user-id', email: 'user@example.com', full_name: 'User Name', phone: '+6281234567890',
      avatar_url: null, referral_code: 'X12345678901', referred_by: null, membership: 'basic',
      xavi_points: 0, role: 'member', kyc_status: 'unverified', onboarding_completed: false, upgrade_intent: null,
    });
    expect(profile.fullName).toBe('User Name');
    expect(profile.membership).toBe('basic');
  });

  test('strips sensitive fields from RPC parameters', () => {
    const payload = buildProfileUpdateParams({
      fullName: 'User Name', phone: '+6281234567890', avatarUrl: null, onboardingCompleted: true,
      upgradeIntent: 'pro', membership: 'platinum', xaviPoints: 999999, role: 'admin', referredBy: 'attacker',
    });
    expect(payload).toEqual({
      p_full_name: 'User Name', p_phone: '+6281234567890', p_avatar_url: null,
      p_onboarding_completed: true, p_upgrade_intent: 'pro',
    });
    expect(payload).not.toHaveProperty('membership');
  });
});
