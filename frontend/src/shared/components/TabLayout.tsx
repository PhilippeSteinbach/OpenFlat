import { Outlet, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { Button } from './Button';

const TAB_ITEMS = [
  { key: 'dashboard', path: '/dashboard', icon: '🏠', labelKey: 'dashboard.title' },
  { key: 'cleaning', path: '/cleaning', icon: '🧹', labelKey: 'cleaning.title' },
  { key: 'shopping', path: '/shopping', icon: '🛒', labelKey: 'shopping.title' },
  { key: 'finance', path: '/finance', icon: '💰', labelKey: 'finance.title' },
] as const;

export function TabLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const clearCurrentUser = useCurrentUserStore((s) => s.clearCurrentUser);

  const handleSwitchUser = () => {
    clearCurrentUser();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Desktop top navigation (hidden on mobile) */}
      <header className="hidden sm:block bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <nav className="flex items-center gap-1" role="tablist">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive(tab.path)}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(tab.path)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{t(tab.labelKey)}</span>
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {currentUser?.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSwitchUser}>
              {t('dashboard.switchUser')}
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar (hidden on desktop) */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50"
        role="tablist"
      >
        <div className="flex items-center justify-around h-16">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive(tab.path)}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive(tab.path)
                  ? 'text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              <span className="text-xl" aria-hidden="true">{tab.icon}</span>
              <span className="text-xs font-medium">{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
