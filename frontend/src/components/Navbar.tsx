import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useRoles } from '../hooks/useRoles';
import { useStats } from '../contexts/StatsContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const { isAdmin } = useRoles();
  const { stats } = useStats();
  const streak = stats?.currentStreak ?? 0;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 dark:bg-gray-900 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors dark:text-gray-100 dark:hover:text-primary-400"
          >
            LOTG Exams
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full dark:bg-gray-700" />
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                >
                  My Progress
                  {streak > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                      🔥{streak}
                    </span>
                  )}
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-3">
                  {user?.picture && (
                    <img
                      src={user.picture}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-700 hidden sm:block dark:text-gray-300">
                    {user?.name || user?.email}
                  </span>
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="btn btn-secondary text-sm"
                  >
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => loginWithRedirect()} className="btn btn-primary text-sm">
                Log In
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
