import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Sparkles, ShoppingCart, Wallet } from 'lucide-react';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { Card, Badge } from '@/shared/ui';
import { useLeaderboardQuery } from '@/features/cleaning/api';
import { cn } from '@/shared/lib/utils';
import type { LucideIcon } from 'lucide-react';

const MODULE_TILES: { key: string; path: string; icon: LucideIcon }[] = [
  { key: 'cleaning', path: '/cleaning', icon: Sparkles },
  { key: 'shopping', path: '/shopping', icon: ShoppingCart },
  { key: 'finance', path: '/finance', icon: Wallet },
];

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex', role: 'Coordinator' },
  { id: 2, name: 'Jordan', role: 'Coordinator' },
  { id: 3, name: 'Sam', role: 'Resident' },
  { id: 4, name: 'Taylor', role: 'Resident' },
  { id: 5, name: 'Casey', role: 'Resident' },
] as const;

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
];

function getAvatarColor(userId: number): string {
  return AVATAR_COLORS[(userId - 1) % AVATAR_COLORS.length];
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

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
        <h1 className="text-xl font-bold text-foreground">
          {t('dashboard.greeting', { name: currentUser?.name })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {currentUserPoints} {t('common.points')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Module Tiles */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODULE_TILES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Card
                  key={mod.key}
                  className="text-center py-8 cursor-pointer hover:shadow-elevation-3 hover:border-primary/50 transition-all duration-200"
                  onClick={() => navigate(mod.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(mod.path)}
                  aria-label={t(`dashboard.modules.${mod.key}`)}
                >
                  <Icon className="h-10 w-10 mx-auto mb-3 text-primary" aria-hidden="true" />
                  <span className="font-medium text-card-foreground">
                    {t(`dashboard.modules.${mod.key}`)}
                  </span>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {t('dashboard.leaderboard.title')}
          </h2>
          {leaderboardLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : leaderboardError ? (
            <div className="text-center py-6">
              <p className="text-destructive">{t('common.error')}</p>
              <button
                onClick={() => refetchLeaderboard()}
                className="mt-2 text-sm text-primary hover:text-primary/80 underline"
              >
                {t('common.retry', 'Retry')}
              </button>
            </div>
          ) : (
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-border">
              {leaderboardData
                .sort((a, b) => b.points - a.points || a.id - b.id)
                .map((user, index) => (
                  <li
                    key={user.id}
                    className={cn(
                      'flex items-center gap-3 py-2.5 px-4 transition-colors',
                      user.id === currentUser?.id && 'bg-primary/10',
                    )}
                  >
                    <span className="text-sm font-medium text-muted-foreground w-5 text-center">
                      {index + 1}
                    </span>
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs',
                        getAvatarColor(user.id),
                      )}
                      aria-hidden="true"
                    >
                      {user.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-card-foreground">
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-primary ml-1">
                          ({t('common.you', 'you')})
                        </span>
                      )}
                    </span>
                    <Badge variant="warning" className="text-xs">
                      {user.points} {t('common.points')}
                    </Badge>
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
