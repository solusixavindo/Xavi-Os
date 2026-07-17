import { resolveRootRoute, type RootRouteInput } from '../routeState';

const ready: RootRouteInput = {
  initializing: false,
  passwordRecovery: false,
  hasSession: true,
  emailVerified: true,
  pendingVerification: false,
  profileLoading: false,
  profileComplete: true,
};

describe('auth state routing', () => {
  test('shows splash while restoring a session', () => expect(resolveRootRoute({ ...ready, initializing: true })).toBe('loading'));
  test('routes signed-out users to auth', () => expect(resolveRootRoute({ ...ready, hasSession: false })).toBe('auth'));
  test('routes newly registered users to verification', () => expect(resolveRootRoute({ ...ready, hasSession: false, pendingVerification: true })).toBe('verification'));
  test('guards unverified sessions', () => expect(resolveRootRoute({ ...ready, emailVerified: false })).toBe('verification'));
  test('guards incomplete profiles', () => expect(resolveRootRoute({ ...ready, profileComplete: false })).toBe('onboarding'));
  test('allows only complete verified sessions into main', () => expect(resolveRootRoute(ready)).toBe('main'));
  test('prioritizes password recovery after initialization', () => expect(resolveRootRoute({ ...ready, passwordRecovery: true })).toBe('passwordRecovery'));
});
