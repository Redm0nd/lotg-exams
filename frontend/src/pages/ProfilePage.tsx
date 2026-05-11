import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useStats } from '../contexts/StatsContext';
import type { UserStats, Law } from '../types';

// Law weights based on typical LOTG exam question distribution
const LAW_WEIGHTS: Record<Law, number> = {
  'Law 1': 3, 'Law 2': 2, 'Law 3': 5, 'Law 4': 3, 'Law 5': 6,
  'Law 6': 3, 'Law 7': 4, 'Law 8': 4, 'Law 9': 3, 'Law 10': 6,
  'Law 11': 15, 'Law 12': 20, 'Law 13': 6, 'Law 14': 7,
  'Law 15': 4, 'Law 16': 4, 'Law 17': 5,
};
const TOTAL_WEIGHT = Object.values(LAW_WEIGHTS).reduce((a, b) => a + b, 0);

function computeReadiness(stats: UserStats): number {
  let weighted = 0;
  for (const [law, weight] of Object.entries(LAW_WEIGHTS) as [Law, number][]) {
    const lawStats = stats.byLaw[law];
    weighted += (lawStats?.avgScore ?? 0) * weight;
  }
  return Math.round(weighted / TOTAL_WEIGHT);
}

function readinessColour(score: number) {
  if (score >= 75) return { ring: 'text-green-500', text: 'text-green-600', bg: 'bg-green-50', label: 'Exam Ready', labelClass: 'bg-green-100 text-green-800' };
  if (score >= 50) return { ring: 'text-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Getting There', labelClass: 'bg-amber-100 text-amber-800' };
  return { ring: 'text-red-400', text: 'text-red-600', bg: 'bg-red-50', label: 'Needs Work', labelClass: 'bg-red-100 text-red-800' };
}

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

// SVG circular progress ring
function ReadinessRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const colours = readinessColour(score);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        className={`${colours.ring} transition-all duration-700`}
      />
      <text x="70" y="65" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold" style={{ fontSize: 24, fontWeight: 700, fill: 'currentColor' }} fill={score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'}>
        {score}%
      </text>
      <text x="70" y="88" textAnchor="middle" style={{ fontSize: 11, fill: '#6b7280' }}>readiness</text>
    </svg>
  );
}

export default function ProfilePage() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, user } = useAuth0();
  const { stats } = useStats();

  if (authLoading) {
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your profile</h2>
          <p className="text-gray-600 mb-4">Track your progress and see how you're improving.</p>
          <button onClick={() => loginWithRedirect()} className="btn btn-primary">Log In</button>
        </div>
      </div>
    );
  }

  const lawEntries = stats
    ? (Object.entries(stats.byLaw) as [string, NonNullable<UserStats['byLaw'][keyof UserStats['byLaw']]>][])
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    : [];

  const readiness = stats ? computeReadiness(stats) : 0;
  const rColours = readinessColour(readiness);
  const streak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;

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

      {stats ? (
        <>
          {/* Top row: readiness + streak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Exam readiness */}
            <div className={`card flex flex-col items-center text-center ${rColours.bg}`}>
              <ReadinessRing score={readiness} />
              <span className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${rColours.labelClass}`}>
                {rColours.label}
              </span>
              <p className="text-xs text-gray-500 mt-2 max-w-[200px]">
                Weighted across all 17 laws. 75% = exam ready.
              </p>
            </div>

            {/* Streak + stats */}
            <div className="flex flex-col gap-4">
              <div className="card text-center flex-1">
                <div className="text-4xl mb-1">{streak > 0 ? '🔥' : '💤'}</div>
                <div className="text-3xl font-bold text-gray-900">{streak}</div>
                <div className="text-sm text-gray-500">day streak</div>
                {longestStreak > 0 && (
                  <div className="text-xs text-gray-400 mt-1">Best: {longestStreak} days</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</div>
                  <div className="text-xs text-gray-500 mt-1">Quizzes taken</div>
                </div>
                <div className="card text-center">
                  <div className={`text-2xl font-bold ${scoreTextColour(stats.bestScore)}`}>
                    {stats.bestScore.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Best score</div>
                </div>
              </div>
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
              <Link to="/" className="btn btn-primary">Browse Quizzes</Link>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link to="/history" className="btn btn-secondary">View Full History</Link>
        <Link to="/bookmarks" className="btn btn-secondary">My Bookmarks</Link>
        <Link to="/" className="btn btn-primary">Take a Quiz</Link>
      </div>
    </div>
  );
}
