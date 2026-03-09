import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../shared/theme';

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard.title'),
          tabBarLabel: t('dashboard.title'),
          tabBarIcon: () => <TabBarEmoji emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="cleaning"
        options={{
          title: t('cleaning.title'),
          tabBarLabel: t('cleaning.title'),
          tabBarIcon: () => <TabBarEmoji emoji="✨" />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: t('shopping.title'),
          tabBarLabel: t('shopping.title'),
          tabBarIcon: () => <TabBarEmoji emoji="🛒" />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: t('finance.title'),
          tabBarLabel: t('finance.title'),
          tabBarIcon: () => <TabBarEmoji emoji="💰" />,
        }}
      />
    </Tabs>
  );
}

function TabBarEmoji({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}
