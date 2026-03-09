import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { Card } from '@/shared/ui';
import { ThemeToggle } from '@/shared/ui/theme-toggle';
import { cn } from '@/shared/lib/utils';

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

export function UserSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const handleSelectUser = (user: (typeof PREDEFINED_USERS)[number]) => {
    setCurrentUser({ id: user.id, name: user.name, role: user.role });
    navigate('/dashboard');
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('userSelection.title')}
        </h1>
        <p className="text-muted-foreground">{t('userSelection.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl w-full">
        {PREDEFINED_USERS.map((user) => (
          <Card
            key={user.id}
            className="flex items-center gap-3 p-4 cursor-pointer hover:shadow-elevation-3 hover:border-primary/50 transition-all duration-200"
            onClick={() => handleSelectUser(user)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSelectUser(user)}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0',
                getAvatarColor(user.id),
              )}
              aria-hidden="true"
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-card-foreground">{user.name}</div>
              <div className="text-sm text-muted-foreground">
                {t(`userSelection.roles.${user.role.toLowerCase()}`)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
