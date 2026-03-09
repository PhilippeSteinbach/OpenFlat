import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { Card, Button } from '@/shared/components';

const MODULE_TILES = [
  { key: 'cleaning', path: '/cleaning', icon: '🧹' },
  { key: 'shopping', path: '/shopping', icon: '🛒' },
  { key: 'finance', path: '/finance', icon: '💰' },
] as const;

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const clearCurrentUser = useCurrentUserStore((s) => s.clearCurrentUser);

  const handleSwitchUser = () => {
    clearCurrentUser();
    navigate('/');
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t('dashboard.greeting', { name: currentUser?.name })}
            </h1>
            <p className="text-sm text-gray-500">
              0 {t('common.points')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSwitchUser}>
            {t('dashboard.switchUser')}
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Module Tiles */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODULE_TILES.map((mod) => (
              <Card
                key={mod.key}
                onClick={() => navigate(mod.path)}
                className="text-center py-8"
              >
                <span className="text-4xl mb-2 block" aria-hidden="true">
                  {mod.icon}
                </span>
                <span className="font-medium text-gray-900">
                  {t(`dashboard.modules.${mod.key}`)}
                </span>
              </Card>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {t('dashboard.leaderboard.title')}
          </h2>
          <Card>
            <p className="text-sm text-gray-500 text-center py-4">
              {t('dashboard.leaderboard.empty')}
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
