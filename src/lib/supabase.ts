import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';

import type { PublicEnvironment } from '../config/env';
import { AUTH_STORAGE_KEY, secureSessionStorage } from './secureStorage';

let singleton: SupabaseClient | null = null;

export function getSupabaseClient(environment: PublicEnvironment): SupabaseClient {
  if (singleton) return singleton;

  singleton = createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
    auth: {
      storage: secureSessionStorage,
      storageKey: AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      lock: processLock,
    },
  });

  return singleton;
}
