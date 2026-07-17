import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { type PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { registerSchema, type LoginInput, type RegisterInput } from '../features/auth/validation';
import { logoutAndClearSession, safeAuthError } from '../features/auth/service';
import {
  buildProfileUpdateParams,
  mapProfile,
  type MembershipLevel,
  type Profile,
  type ProfileRow,
} from '../features/profile/model';
import { AUTH_CALLBACK_URL, handleAuthDeepLink, PASSWORD_RESET_URL } from '../lib/authLinks';
import { clearPersistedSession } from '../lib/secureStorage';

export type AuthActionResult = { ok: true; message?: string } | { ok: false; message: string };

type OnboardingInput = {
  fullName: string;
  phone: string;
  upgradeIntent: MembershipLevel | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initializing: boolean;
  profileLoading: boolean;
  profileError: string | null;
  pendingVerificationEmail: string | null;
  passwordRecovery: boolean;
  authNotice: string | null;
  signUp(input: RegisterInput): Promise<AuthActionResult>;
  signIn(input: LoginInput): Promise<AuthActionResult>;
  requestPasswordReset(email: string): Promise<AuthActionResult>;
  resendVerification(): Promise<AuthActionResult>;
  checkVerification(): Promise<AuthActionResult>;
  updatePassword(password: string): Promise<AuthActionResult>;
  completeOnboarding(input: OnboardingInput): Promise<AuthActionResult>;
  refreshProfile(): Promise<void>;
  logout(): Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_COLUMNS =
  'id,email,full_name,phone,avatar_url,referral_code,referred_by,membership,xavi_points,role,kyc_status,onboarding_completed,upgrade_intent';
const LEGAL_DOCUMENT_VERSION = '2026-07-17';

export function AuthProvider({ client, children }: PropsWithChildren<{ client: SupabaseClient }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (userId: string) => {
      setProfileLoading(true);
      setProfileError(null);
      const { data, error } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
      if (error) {
        setProfile(null);
        setProfileError('Profil belum dapat dimuat. Coba kembali.');
      } else {
        setProfile(data ? mapProfile(data as unknown as ProfileRow) : null);
      }
      setProfileLoading(false);
    },
    [client],
  );

  const processAuthUrl = useCallback(
    async (url: string | null) => {
      if (!url) return;
      try {
        const result = await handleAuthDeepLink(client, url);
        if (result.passwordRecovery) setPasswordRecovery(true);
      } catch {
        setAuthNotice('Tautan autentikasi tidak valid atau sudah kedaluwarsa.');
      }
    },
    [client],
  );

  useEffect(() => {
    let mounted = true;

    const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setPasswordRecovery(false);
      } else if (nextSession?.user) {
        setTimeout(() => void loadProfile(nextSession.user.id), 0);
      }
    });

    async function restoreSession() {
      const { data, error } = await client.auth.getSession();
      if (!mounted) return;

      if (error || !data.session) {
        if (error) await clearPersistedSession();
        setSession(null);
        setUser(null);
        setInitializing(false);
        return;
      }

      const verifiedUser = await client.auth.getUser();
      if (!mounted) return;
      if (verifiedUser.error || !verifiedUser.data.user) {
        await client.auth.signOut({ scope: 'local' });
        await clearPersistedSession();
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        setUser(verifiedUser.data.user);
        await loadProfile(verifiedUser.data.user.id);
      }
      if (mounted) setInitializing(false);
    }

    void restoreSession();
    void Linking.getInitialURL().then(processAuthUrl);
    const linkListener = Linking.addEventListener('url', ({ url }) => void processAuthUrl(url));

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      linkListener.remove();
    };
  }, [client, loadProfile, processAuthUrl]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const updateRefreshState = (state: string) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    updateRefreshState(AppState.currentState);
    const listener = AppState.addEventListener('change', updateRefreshState);
    return () => {
      listener.remove();
      client.auth.stopAutoRefresh();
    };
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      initializing,
      profileLoading,
      profileError,
      pendingVerificationEmail,
      passwordRecovery,
      authNotice,

      async signUp(input) {
        setAuthNotice(null);
        const parsed = registerSchema.safeParse(input);
        if (!parsed.success) return { ok: false, message: 'Periksa kembali data registrasi Anda.' };
        const value = parsed.data;
        const { data, error } = await client.auth.signUp({
          email: value.email,
          password: value.password,
          options: {
            emailRedirectTo: AUTH_CALLBACK_URL,
            data: {
              full_name: value.fullName,
              phone: value.phone,
              referral_code_input: value.referralCode || null,
              terms_accepted: true,
              terms_version: LEGAL_DOCUMENT_VERSION,
              privacy_version: LEGAL_DOCUMENT_VERSION,
            },
          },
        });
        if (error) return { ok: false, message: safeAuthError(error) };
        setPendingVerificationEmail(value.email);
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
        }
        return { ok: true, message: 'Akun dibuat. Periksa email untuk verifikasi.' };
      },

      async signIn(input) {
        setAuthNotice(null);
        const { data, error } = await client.auth.signInWithPassword(input);
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) setPendingVerificationEmail(input.email);
          return { ok: false, message: safeAuthError(error) };
        }
        setPendingVerificationEmail(null);
        setSession(data.session);
        setUser(data.user);
        return { ok: true };
      },

      async requestPasswordReset(email) {
        const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: PASSWORD_RESET_URL,
        });
        return error
          ? { ok: false, message: safeAuthError(error) }
          : { ok: true, message: 'Tautan reset telah dikirim jika email terdaftar.' };
      },

      async resendVerification() {
        const verificationEmail = pendingVerificationEmail ?? user?.email ?? null;
        if (!verificationEmail) return { ok: false, message: 'Masukkan kembali email melalui halaman masuk.' };
        const { error } = await client.auth.resend({
          type: 'signup',
          email: verificationEmail,
          options: { emailRedirectTo: AUTH_CALLBACK_URL },
        });
        return error
          ? { ok: false, message: safeAuthError(error) }
          : { ok: true, message: 'Email verifikasi telah dikirim ulang.' };
      },

      async checkVerification() {
        const current = await client.auth.getSession();
        if (!current.data.session) {
          return { ok: false, message: 'Buka tautan verifikasi dari email, lalu kembali ke aplikasi.' };
        }
        const refreshed = await client.auth.refreshSession();
        if (refreshed.error || !refreshed.data.user?.email_confirmed_at) {
          return { ok: false, message: 'Email belum terverifikasi.' };
        }
        setSession(refreshed.data.session);
        setUser(refreshed.data.user);
        setPendingVerificationEmail(null);
        return { ok: true, message: 'Email berhasil diverifikasi.' };
      },

      async updatePassword(password) {
        const { error } = await client.auth.updateUser({ password });
        if (error) return { ok: false, message: safeAuthError(error) };
        setPasswordRecovery(false);
        return { ok: true, message: 'Password berhasil diperbarui.' };
      },

      async completeOnboarding(input) {
        if (!user) return { ok: false, message: 'Sesi tidak valid. Silakan masuk kembali.' };
        try {
          const parameters = buildProfileUpdateParams({
            ...input,
            avatarUrl: profile?.avatarUrl ?? null,
            onboardingCompleted: true,
          });
          const { error } = await client.rpc('update_my_profile', parameters);
          if (error) return { ok: false, message: safeAuthError(error) };
          await loadProfile(user.id);
          return { ok: true };
        } catch {
          return { ok: false, message: 'Nama dan nomor WhatsApp wajib diisi dengan benar.' };
        }
      },

      refreshProfile: async () => {
        if (user) await loadProfile(user.id);
      },

      async logout() {
        let result: AuthActionResult = { ok: true };
        try {
          await logoutAndClearSession(client, clearPersistedSession);
        } catch (error) {
          result = { ok: false, message: safeAuthError(error) };
        } finally {
          setSession(null);
          setUser(null);
          setProfile(null);
          setPendingVerificationEmail(null);
          setPasswordRecovery(false);
          setAuthNotice(null);
        }
        return result;
      },
    }),
    [
      client,
      authNotice,
      initializing,
      loadProfile,
      passwordRecovery,
      pendingVerificationEmail,
      profile,
      profileError,
      profileLoading,
      session,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
