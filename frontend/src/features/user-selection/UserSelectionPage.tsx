import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useCurrentUserStore } from '@/shared/hooks/useCurrentUser';
import { Card } from '@/shared/components';

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

export function UserSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const handleSelectUser = (user: (typeof PREDEFINED_USERS)[number]) => {
    setCurrentUser({ id: user.id, name: user.name, role: user.role });
    navigate('/dashboard');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t('userSelection.title')}
      </h1>
      <p className="text-gray-500 mb-8">{t('userSelection.subtitle')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl w-full">
        {PREDEFINED_USERS.map((user) => (
          <Card
            key={user.id}
            onClick={() => handleSelectUser(user)}
            className="flex items-center gap-3 hover:border-primary-300"
          >
            <div
              className={`w-10 h-10 rounded-full ${getAvatarColor(user.id)} flex items-center justify-center text-white font-semibold text-sm`}
              aria-hidden="true"
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-sm text-gray-500">
                {t(`userSelection.roles.${user.role.toLowerCase()}`)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
