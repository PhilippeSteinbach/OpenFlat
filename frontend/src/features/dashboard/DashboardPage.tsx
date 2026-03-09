import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { Card } from '@/shared/components';
import { useLeaderboardQuery } from '@/features/cleaning/api';

const MODULE_TILES = [
  { key: 'cleaning', path: '/cleaning', icon: '🧹' },
  { key: 'shopping', path: '/shopping', icon: '🛒' },
  { key: 'finance', path: '/finance', icon: '💰' },
] as const;

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex', role: 'Coordinator' },
  { id: 2, name: 'Jordan', role: 'Coordinator' },
  { id: 3, name: 'Sam', role: 'Resident' },
  { id: 4, name: 'Taylor', role: 'Resident' },
  { id: 5, name: 'Casey', role: 'Resident' },
] as const;

function getAvatarColor(userId: number): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
  ];
  return colors[(userId - 1) % colors.length];
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  // Use real leaderboard data from API, fallback to static users with 0 points
  const { data: leaderboardApi, isLoading: leaderboardLoading, isError: leaderboardError, refetch: refetchLeaderboard } = useLeaderboardQuery();
  const leaderboardData = leaderboardApi
    ? leaderboardApi.map((entry) => ({
        id: entry.userId,
        name: entry.userName,
        role: entry.role,
        points: entry.totalPoints,
      }))
    : PREDEFINED_USERS.map((user) => ({ ...user, points: 0 }));

  const currentUserPoints =
    leaderboardData.find((u) => u.id === currentUser?.id)?.points ?? 0;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {t('dashboard.greeting', { name: currentUser?.name })}
        </h1>
        <p className="text-sm text-gray-500">
          {currentUserPoints} {t('common.points')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Module Tiles */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODULE_TILES.map((mod) => (
              <Card
                key={mod.key}
                onClick={() => navigate(mod.path)}
                className="text-center py-8"
                role="button"
                aria-label={t(`dashboard.modules.${mod.key}`)}
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
          {leaderboardLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : leaderboardError ? (
            <div className="text-center py-6">
              <p className="text-center text-red-600">{t('common.error')}</p>
              <button
                onClick={() => refetchLeaderboard()}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {t('common.retry', 'Retry')}
              </button>
            </div>
          ) : (
          <Card>
            <ul className="divide-y divide-gray-100">
              {leaderboardData
                .sort((a, b) => b.points - a.points || a.id - b.id)
                .map((user, index) => (
                  <li
                    key={user.id}
                    className={`flex items-center gap-3 py-2.5 px-1 ${
                      user.id === currentUser?.id
                        ? 'bg-primary-50 rounded-lg -mx-1 px-2'
                        : ''
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-400 w-5 text-center">
                      {index + 1}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full ${getAvatarColor(user.id)} flex items-center justify-center text-white font-semibold text-xs`}
                      aria-hidden="true"
                    >
                      {user.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-primary-600 ml-1">
                          ({t('common.you', 'you')})
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {user.points} {t('common.points')}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
          )}
        </section>
      </div>
    </div>
  );
}
