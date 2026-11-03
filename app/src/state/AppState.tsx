import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type Session } from '../lib/api';
import type { Profile } from '../lib/types';

interface AppState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await api.getMyProfile());
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api.getSession().then(async (s) => {
      if (!alive) return;
      setSession(s);
      if (s) await refreshProfile();
      setReady(true);
    });
    const off = api.onAuthChange(async (s) => {
      setSession(s);
      if (s) await refreshProfile();
      else setProfile(null);
    });
    return () => {
      alive = false;
      off();
    };
  }, [refreshProfile]);

  const value = useMemo(() => ({ ready, session, profile, refreshProfile, setProfile }), [ready, session, profile, refreshProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStateProvider');
  return v;
}
