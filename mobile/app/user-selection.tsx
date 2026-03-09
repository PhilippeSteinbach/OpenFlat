import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../shared/hooks/useCurrentUser';
import { useTheme, avatarColors } from '../shared/theme';
import { ThemeToggle } from '../components';

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex', role: 'Coordinator' },
  { id: 2, name: 'Jordan', role: 'Coordinator' },
  { id: 3, name: 'Sam', role: 'Resident' },
  { id: 4, name: 'Taylor', role: 'Resident' },
  { id: 5, name: 'Casey', role: 'Resident' },
] as const;

type User = (typeof PREDEFINED_USERS)[number];

export default function UserSelectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const handleSelectUser = (user: User) => {
    setCurrentUser({ id: user.id, name: user.name, role: user.role });
    router.replace('/(tabs)');
  };

  const renderUser = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
      }}
      onPress={() => handleSelectUser(user)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${user.name}, ${t(`userSelection.roles.${user.role.toLowerCase()}`)}`}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: avatarColors[(user.id - 1) % avatarColors.length],
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
          {user.name.charAt(0)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
          {user.name}
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
          {t(`userSelection.roles.${user.role.toLowerCase()}`)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ position: 'absolute', top: 50, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </View>
      <View style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground, marginBottom: 4 }}>
          {t('userSelection.title')}
        </Text>
        <Text style={{ fontSize: 15, color: colors.mutedForeground }}>
          {t('userSelection.subtitle')}
        </Text>
      </View>
      <FlatList
        data={PREDEFINED_USERS}
        renderItem={renderUser}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      />
    </SafeAreaView>
  );
}
