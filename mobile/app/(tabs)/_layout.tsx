import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopColor: '#E5E7EB',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('dashboard.title'),
          tabBarLabel: t('dashboard.title'),
          tabBarIcon: ({ color }) => (
            <TabBarEmoji emoji="🏠" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cleaning"
        options={{
          title: t('cleaning.title'),
          tabBarLabel: t('cleaning.title'),
          tabBarIcon: ({ color }) => (
            <TabBarEmoji emoji="🧹" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: t('shopping.title'),
          tabBarLabel: t('shopping.title'),
          tabBarIcon: ({ color }) => (
            <TabBarEmoji emoji="🛒" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: t('finance.title'),
          tabBarLabel: t('finance.title'),
          tabBarIcon: ({ color }) => (
            <TabBarEmoji emoji="💰" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabBarEmoji({ emoji }: { emoji: string; color: string }) {
  return (
    <Text style={{ fontSize: 20 }}>{emoji}</Text>
  );
}
