import { NavLink, Outlet } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/upload', label: 'Upload PDF' },
  { to: '/admin/jobs', label: 'Jobs' },
  { to: '/admin/review', label: 'Review Queue' },
  { to: '/admin/questions', label: 'Question Bank' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth0();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <NavLink to="/" className="text-xl font-bold text-gray-900">
                LOTG Exams
              </NavLink>
              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
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
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
