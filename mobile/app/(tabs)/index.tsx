import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../shared/hooks/useCurrentUser';

const MODULE_TILES = [
  { key: 'cleaning', route: '/(tabs)/cleaning' as const, icon: '🧹' },
  { key: 'shopping', route: '/(tabs)/shopping' as const, icon: '🛒' },
  { key: 'finance', route: '/(tabs)/finance' as const, icon: '💰' },
] as const;

const PREDEFINED_USERS = [
  { id: 1, name: 'Alex', role: 'Coordinator' },
  { id: 2, name: 'Jordan', role: 'Coordinator' },
  { id: 3, name: 'Sam', role: 'Resident' },
  { id: 4, name: 'Taylor', role: 'Resident' },
  { id: 5, name: 'Casey', role: 'Resident' },
] as const;

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const clearCurrentUser = useCurrentUserStore((s) => s.clearCurrentUser);

  // TODO: Replace with real points from Cleaning API leaderboard endpoint
  const leaderboardData = PREDEFINED_USERS.map((user) => ({
    ...user,
    points: 0,
  })).sort((a, b) => b.points - a.points || a.id - b.id);

  const currentUserPoints =
    leaderboardData.find((u) => u.id === currentUser?.id)?.points ?? 0;

  const handleSwitchUser = () => {
    clearCurrentUser();
    router.replace('/user-selection');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {t('dashboard.greeting', { name: currentUser?.name })}
          </Text>
          <Text style={styles.pointsText}>
            {currentUserPoints} {t('common.points')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSwitchUser}
          style={styles.switchButton}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.switchUser')}
        >
          <Text style={styles.switchButtonText}>
            {t('dashboard.switchUser')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Module Tiles */}
        <View style={styles.tilesRow}>
          {MODULE_TILES.map((mod) => (
            <TouchableOpacity
              key={mod.key}
              style={styles.tile}
              onPress={() => router.push(mod.route)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t(`dashboard.modules.${mod.key}`)}
            >
              <Text style={styles.tileIcon}>{mod.icon}</Text>
              <Text style={styles.tileLabel}>
                {t(`dashboard.modules.${mod.key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.leaderboardTitle}>
            {t('dashboard.leaderboard.title')}
          </Text>
          <View style={styles.leaderboardCard}>
            {leaderboardData.map((user, index) => {
              const isCurrentUser = user.id === currentUser?.id;
              return (
                <View
                  key={user.id}
                  style={[
                    styles.leaderboardRow,
                    isCurrentUser && styles.leaderboardRowHighlight,
                    index < leaderboardData.length - 1 && styles.leaderboardRowBorder,
                  ]}
                >
                  <Text style={styles.rankText}>{index + 1}</Text>
                  <View
                    style={[
                      styles.smallAvatar,
                      { backgroundColor: AVATAR_COLORS[(user.id - 1) % AVATAR_COLORS.length] },
                    ]}
                  >
                    <Text style={styles.smallAvatarText}>
                      {user.name.charAt(0)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.leaderboardName,
                      isCurrentUser && styles.leaderboardNameHighlight,
                    ]}
                    numberOfLines={1}
                  >
                    {user.name}
                    {isCurrentUser ? ` (${t('common.you', 'you')})` : ''}
                  </Text>
                  <Text style={styles.leaderboardPoints}>
                    {user.points} {t('common.points')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  pointsText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  switchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tileIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  leaderboardSection: {
    gap: 12,
  },
  leaderboardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  leaderboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  leaderboardRowHighlight: {
    backgroundColor: '#EFF6FF',
  },
  leaderboardRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    width: 20,
    textAlign: 'center',
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  leaderboardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  leaderboardNameHighlight: {
    color: '#2563EB',
  },
  leaderboardPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
});
