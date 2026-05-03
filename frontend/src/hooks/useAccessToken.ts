import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useState, useEffect } from 'react';

export function useAccessToken() {
  const { getIdTokenClaims, isAuthenticated } = useAuth0();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchToken() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const claims = await getIdTokenClaims();
        setToken(claims?.__raw ?? null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get token'));
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [getIdTokenClaims, isAuthenticated]);

  const getToken = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    const claims = await getIdTokenClaims();
    if (!claims?.__raw) throw new Error('No ID token available');
    return claims.__raw;
  }, [getIdTokenClaims, isAuthenticated]);

  return { token, loading, error, getToken };
}
