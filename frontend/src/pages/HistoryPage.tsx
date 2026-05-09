import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAccessToken } from '../hooks/useAccessToken';
import { getMyAttempts } from '../api/client';
import type { UserAttempt } from '../types';

const PAGE_SIZE = 20;

function scoreColour(pct: number): string {
  if (pct >= 90) return 'text-green-600';
  if (pct >= 70) return 'text-blue-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBadgeBg(pct: number): string {
  if (pct >= 90) return 'bg-green-100';
  if (pct >= 70) return 'bg-blue-100';
  if (pct >= 50) return 'bg-amber-100';
  return 'bg-red-100';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { token, loading: tokenLoading } = useAccessToken();
  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (cursor?: string) => {
      if (!token) return;
      const isFirst = !cursor;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await getMyAttempts(token, PAGE_SIZE, cursor);
        setAttempts((prev) => (isFirst ? data.attempts : [...prev, ...data.attempts]));
        setNextCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        if (isFirst) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) loadPage();
  }, [token, loadPage]);

  if (authLoading || tokenLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your history</h2>
          <p className="text-gray-600 mb-4">All your past quiz attempts will appear here.</p>
          <button onClick={() => loginWithRedirect()} className="btn btn-primary">
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quiz History</h1>
        <Link to="/profile" className="btn btn-secondary text-sm">
          Back to Profile
        </Link>
      </div>

      {attempts.length === 0 ? (
        <div className="card text-center text-gray-500">
          <p className="mb-4">No quiz attempts yet.</p>
          <Link to="/" className="btn btn-primary">
            Browse Quizzes
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div key={attempt.attemptId} className="card flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">{formatDate(attempt.createdAt)}</div>
                  <div className="text-sm text-gray-600 mt-0.5">
                    {attempt.score} / {attempt.total} correct
                  </div>
                </div>
                <div
                  className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold ${scoreBadgeBg(attempt.percentage)} ${scoreColour(attempt.percentage)}`}
                >
                  {attempt.percentage.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          {nextCursor && (
            <div className="mt-6 text-center">
              <button
                onClick={() => loadPage(nextCursor)}
                disabled={loadingMore}
                className="btn btn-secondary"
              >
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
