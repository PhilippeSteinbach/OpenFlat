import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCurrentUserStore } from '../../shared/hooks/useCurrentUser';
import { cleaningApi } from '../../shared/api/client';
import { useTheme, avatarColors } from '../../shared/theme';
import { ThemeToggle } from '../../components';

interface LeaderboardEntry {
  userId: number;
  userName: string;
  role: string;
  totalPoints: number;
}

const MODULE_TILES = [
  { key: 'cleaning', route: '/(tabs)/cleaning' as const, icon: '✨' },
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

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const clearCurrentUser = useCurrentUserStore((s) => s.clearCurrentUser);

  const [leaderboardApi, setLeaderboardApi] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    const headers = { 'X-User-Id': String(currentUser?.id ?? 1) };
    cleaningApi.get<LeaderboardEntry[]>('/leaderboard', headers)
      .then(setLeaderboardApi)
      .catch(() => setLeaderboardApi(null));
  }, [currentUser?.id]);

  const leaderboardData = (leaderboardApi
    ? leaderboardApi.map((entry) => ({
        id: entry.userId,
        name: entry.userName,
        role: entry.role,
        points: entry.totalPoints,
      }))
    : PREDEFINED_USERS.map((user) => ({ ...user, points: 0 }))
  ).sort((a, b) => b.points - a.points || a.id - b.id);

  const currentUserPoints =
    leaderboardData.find((u) => u.id === currentUser?.id)?.points ?? 0;

  const handleSwitchUser = () => {
    clearCurrentUser();
    router.replace('/user-selection');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>
            {t('dashboard.greeting', { name: currentUser?.name })}
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
            {currentUserPoints} {t('common.points')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <TouchableOpacity
            onPress={handleSwitchUser}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: colors.muted,
            }}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.switchUser')}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.mutedForeground }}>
              {t('dashboard.switchUser')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 24 }}>
        {/* Module Tiles */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {MODULE_TILES.map((mod) => (
            <TouchableOpacity
              key={mod.key}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 16,
                paddingVertical: 24,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={() => router.push(mod.route)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t(`dashboard.modules.${mod.key}`)}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>{mod.icon}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, textAlign: 'center' }}>
                {t(`dashboard.modules.${mod.key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.foreground }}>
            {t('dashboard.leaderboard.title')}
          </Text>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            {leaderboardData.map((user, index) => {
              const isCurrentUser = user.id === currentUser?.id;
              return (
                <View
                  key={user.id}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      gap: 10,
                    },
                    isCurrentUser && { backgroundColor: `${colors.primary}15` },
                    index < leaderboardData.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.mutedForeground, width: 20, textAlign: 'center' }}>
                    {index + 1}
                  </Text>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: avatarColors[(user.id - 1) % avatarColors.length],
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>
                      {user.name.charAt(0)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: '500',
                      color: isCurrentUser ? colors.primary : colors.foreground,
                    }}
                    numberOfLines={1}
                  >
                    {user.name}
                    {isCurrentUser ? ` (${t('common.you', 'you')})` : ''}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
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
