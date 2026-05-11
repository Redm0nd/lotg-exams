import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAccessToken } from '../hooks/useAccessToken';
import { getMyStats } from '../api/client';
import type { UserStats } from '../types';

interface StatsContextValue {
  stats: UserStats | null;
  refresh: () => void;
}

const StatsContext = createContext<StatsContextValue>({ stats: null, refresh: () => {} });

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth0();
  const { token } = useAccessToken();
  const [stats, setStats] = useState<UserStats | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getMyStats(token);
      setStats(data);
    } catch {
      // stats are non-critical — fail silently
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) refresh();
  }, [isAuthenticated, token, refresh]);

  return <StatsContext.Provider value={{ stats, refresh }}>{children}</StatsContext.Provider>;
}

export const useStats = () => useContext(StatsContext);
