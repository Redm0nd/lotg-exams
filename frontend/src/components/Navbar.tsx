import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

export default function Navbar() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
          >
            LOTG Exams
          </Link>

          <nav className="flex items-center gap-4">
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/admin"
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Admin
                </Link>
                <div className="flex items-center gap-3">
                  {user?.picture && (
                    <img
                      src={user.picture}
                      alt={user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-700 hidden sm:block">
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
