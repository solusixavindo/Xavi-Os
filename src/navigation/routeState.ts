export type RootRoute = 'loading' | 'auth' | 'verification' | 'onboarding' | 'main' | 'passwordRecovery';

export type RootRouteInput = {
  initializing: boolean;
  passwordRecovery: boolean;
  hasSession: boolean;
  emailVerified: boolean;
  pendingVerification: boolean;
  profileLoading: boolean;
  profileComplete: boolean;
};

export function resolveRootRoute(input: RootRouteInput): RootRoute {
  if (input.initializing) return 'loading';
  if (input.passwordRecovery) return 'passwordRecovery';
  if (!input.hasSession) return input.pendingVerification ? 'verification' : 'auth';
  if (!input.emailVerified) return 'verification';
  if (input.profileLoading) return 'loading';
  if (!input.profileComplete) return 'onboarding';
  return 'main';
}
