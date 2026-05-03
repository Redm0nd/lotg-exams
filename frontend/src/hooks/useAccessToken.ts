import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useState, useEffect } from 'react';

export function useAccessToken() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
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
        const accessToken = await getAccessTokenSilently();
        setToken(accessToken);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get token'));
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [getAccessTokenSilently, isAuthenticated]);

  const getToken = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    return getAccessTokenSilently();
  }, [getAccessTokenSilently, isAuthenticated]);

  return { token, loading, error, getToken };
}
