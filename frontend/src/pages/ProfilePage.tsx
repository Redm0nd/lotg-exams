import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAccessToken } from '../hooks/useAccessToken';
import { getMyStats } from '../api/client';
import type { UserStats } from '../types';

function scoreColour(pct: number): string {
  if (pct >= 90) return 'bg-green-500';
  if (pct >= 70) return 'bg-blue-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextColour(pct: number): string {
  if (pct >= 90) return 'text-green-600';
  if (pct >= 70) return 'text-blue-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, user } = useAuth0();
  const { token, loading: tokenLoading } = useAccessToken();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function loadStats() {
      try {
        const data = await getMyStats(token!);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [token]);

  if (authLoading || tokenLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="mt-4 text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your profile</h2>
          <p className="text-gray-600 mb-4">Track your progress and see how you're improving.</p>
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

  const lawEntries = stats
    ? (Object.entries(stats.byLaw) as [string, NonNullable<UserStats['byLaw'][keyof UserStats['byLaw']]>][]).sort(
        (a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })
      )
    : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {user?.picture && (
          <img src={user.picture} alt={user.name || 'User'} className="h-16 w-16 rounded-full" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name || user?.email}</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Summary stats */}
      {stats && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="card text-center">
              <div className="text-3xl font-bold text-gray-900">{stats.totalAttempts}</div>
              <div className="text-sm text-gray-500 mt-1">Quizzes taken</div>
            </div>
            <div className="card text-center">
              <div className={`text-3xl font-bold ${scoreTextColour(stats.averageScore)}`}>
                {stats.averageScore.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Average score</div>
            </div>
            <div className="card text-center">
              <div className={`text-3xl font-bold ${scoreTextColour(stats.bestScore)}`}>
                {stats.bestScore.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Best score</div>
            </div>
          </div>

          {/* Per-law breakdown */}
          {lawEntries.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance by Law</h2>
              <div className="space-y-3">
                {lawEntries.map(([law, lawStats]) => (
                  <div key={law}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{law}</span>
                      <span className={`font-semibold ${scoreTextColour(lawStats.avgScore)}`}>
                        {lawStats.avgScore.toFixed(0)}%
                        <span className="text-gray-400 font-normal ml-2">
                          ({lawStats.attempts} attempt{lawStats.attempts !== 1 ? 's' : ''})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${scoreColour(lawStats.avgScore)}`}
                        style={{ width: `${Math.min(100, lawStats.avgScore)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.totalAttempts === 0 && (
            <div className="card text-center text-gray-500 mb-6">
              <p className="mb-4">You haven't taken any quizzes yet.</p>
              <Link to="/" className="btn btn-primary">
                Browse Quizzes
              </Link>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Link to="/history" className="btn btn-secondary">
          View Full History
        </Link>
        <Link to="/" className="btn btn-primary">
          Take a Quiz
        </Link>
      </div>
    </div>
  );
}
