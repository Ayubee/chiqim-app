import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { AppState as RNAppState } from 'react-native';
import { AuthSession, Profile, Store } from '@/types';
import {
  signIn as authSignIn,
  signOut as authSignOut,
  getLocalSession,
  fetchProfile,
  fetchStore,
} from '@/services/authService';
import { setSyncContext, clearSyncContext, addSyncListener } from '@/services/syncService';
import { getSyncMeta, setSyncMeta, getPendingCount } from '@/db/expenses';
import { getDatabase } from '@/db/database';
import { generateUUID } from '@/utils/uuid';
import { SECURE_STORE_DEVICE_ID_KEY } from '@/constants';
import * as SecureStore from 'expo-secure-store';

interface AuthContextValue {
  session: AuthSession | null;
  profile: Profile | null;
  store: Store | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize DB and restore session
  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        // Ensure device_id exists
        let deviceId = await SecureStore.getItemAsync(SECURE_STORE_DEVICE_ID_KEY);
        if (!deviceId) {
          deviceId = generateUUID();
          await SecureStore.setItemAsync(SECURE_STORE_DEVICE_ID_KEY, deviceId);
        }
        await setSyncMeta('device_id', deviceId);

        const localSession = await getLocalSession();
        if (localSession) {
          setSession(localSession.session);
          setProfile(localSession.profile);
          setStore(localSession.store);
          setSyncContext(localSession.session.user_id, localSession.session.access_token);
          const count = await getPendingCount(localSession.session.user_id);
          setPendingCount(count);
          const lastSync = await getSyncMeta('last_synced_at');
          setLastSyncTime(lastSync);
        }
      } catch (e) {
        console.error('Session restore error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Update sync context when session changes
  useEffect(() => {
    if (session) {
      setSyncContext(session.user_id, session.access_token);
    } else {
      clearSyncContext();
    }
  }, [session]);

  // Listen to sync events
  useEffect(() => {
    const unsub = addSyncListener(async (event) => {
      if (
        event.type === 'complete' ||
        event.type === 'progress' ||
        event.type === 'partial_failure'
      ) {
        if (session) {
          const count = await getPendingCount(session.user_id);
          setPendingCount(count);
        }
        if (event.type === 'complete') {
          setLastSyncTime(event.lastSyncTime);
        }
      }
      if (event.type === 'auth_error') {
        // Session expired — keep local data
        setSession(null);
        clearSyncContext();
      }
    });
    return unsub;
  }, [session]);

  // Auto-sync on foreground
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active' && session) {
        syncRef.current?.();
      }
    });
    return () => sub.remove();
  }, [session]);

  const triggerSync = useCallback(async () => {
    const { runSync } = await import('@/services/syncService');
    await runSync(async () => {
      // Auth error handler
      setSession(null);
      clearSyncContext();
    });
    if (session) {
      const count = await getPendingCount(session.user_id);
      setPendingCount(count);
      const lastSync = await getSyncMeta('last_synced_at');
      setLastSyncTime(lastSync);
    }
  }, [session]);

  // Store triggerSync in ref for foreground handler
  useEffect(() => {
    syncRef.current = triggerSync;
  }, [triggerSync]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await authSignIn(email, password);
        setSession(result.session);
        setProfile(result.profile);
        setStore(result.store);
        setSyncContext(result.session.user_id, result.session.access_token);
        const count = await getPendingCount(result.session.user_id);
        setPendingCount(count);
        const lastSync = await getSyncMeta('last_synced_at');
        setLastSyncTime(lastSync);
        // Trigger sync after login
        setTimeout(() => triggerSync(), 1000);
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [triggerSync]
  );

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await authSignOut();
    } finally {
      setSession(null);
      setProfile(null);
      setStore(null);
      setPendingCount(0);
      setLastSyncTime(null);
      clearSyncContext();
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    try {
      const newProfile = await fetchProfile(session.user_id);
      setProfile(newProfile);
      if (newProfile.store_id) {
        const newStore = await fetchStore(newProfile.store_id);
        setStore(newStore);
      }
    } catch (e) {
      console.error('Profile refresh error:', e);
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        store,
        isLoading,
        isAuthenticated: !!session,
        pendingCount,
        lastSyncTime,
        error,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshProfile,
        triggerSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
