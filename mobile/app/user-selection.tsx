import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../shared/hooks/useCurrentUser';

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex', role: 'Coordinator' },
  { id: 2, name: 'Jordan', role: 'Coordinator' },
  { id: 3, name: 'Sam', role: 'Resident' },
  { id: 4, name: 'Taylor', role: 'Resident' },
  { id: 5, name: 'Casey', role: 'Resident' },
] as const;

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];

type User = (typeof PREDEFINED_USERS)[number];

export default function UserSelectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const handleSelectUser = (user: User) => {
    setCurrentUser({ id: user.id, name: user.name, role: user.role });
    router.replace('/(tabs)');
  };

  const renderUser = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleSelectUser(user)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${user.name}, ${t(`userSelection.roles.${user.role.toLowerCase()}`)}`}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: AVATAR_COLORS[(user.id - 1) % AVATAR_COLORS.length] },
        ]}
      >
        <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userRole}>
          {t(`userSelection.roles.${user.role.toLowerCase()}`)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('userSelection.title')}</Text>
        <Text style={styles.subtitle}>{t('userSelection.subtitle')}</Text>
      </View>
      <FlatList
        data={PREDEFINED_USERS}
        renderItem={renderUser}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
