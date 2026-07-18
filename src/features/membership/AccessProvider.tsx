import type { SupabaseClient } from '@supabase/supabase-js';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  getLockedFeatureState,
  isAccessContextStale,
  resolveActiveWorkspaceId,
  type AccessContext,
  type LockedFeatureState,
} from './accessContext';
import { fetchMyAccessContext } from './service';

type AccessState = {
  context: AccessContext | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  activeWorkspaceId: string | null;
  refresh(): Promise<void>;
  selectWorkspace(workspaceId: string): void;
  featureState(entitlementKey: string): LockedFeatureState;
};

const AccessStateContext = createContext<AccessState | null>(null);

export function AccessProvider({
  client,
  enabled,
  children,
}: PropsWithChildren<{ client: SupabaseClient; enabled: boolean }>) {
  const [context, setContext] = useState<AccessContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedWorkspaceId, setRequestedWorkspaceId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setContext(null);
      setRequestedWorkspaceId(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchMyAccessContext(client);
      setContext(next);
      setRequestedWorkspaceId((current) => resolveActiveWorkspaceId(next, current));
    } catch {
      setError('Akses membership belum dapat dimuat. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  }, [client, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AccessState>(() => {
    const activeWorkspaceId = context ? resolveActiveWorkspaceId(context, requestedWorkspaceId) : null;
    return {
      context,
      loading,
      error,
      stale: context ? isAccessContextStale(context) : false,
      activeWorkspaceId,
      refresh,
      selectWorkspace(workspaceId) {
        if (!context) return;
        setRequestedWorkspaceId(resolveActiveWorkspaceId(context, workspaceId));
      },
      featureState(entitlementKey) {
        return context ? getLockedFeatureState(context, entitlementKey) : { locked: true, reason: 'access_context_unavailable' };
      },
    };
  }, [context, error, loading, refresh, requestedWorkspaceId]);

  return <AccessStateContext.Provider value={value}>{children}</AccessStateContext.Provider>;
}

export function useAccessContext(): AccessState {
  const value = useContext(AccessStateContext);
  if (!value) throw new Error('useAccessContext must be used inside AccessProvider.');
  return value;
}
