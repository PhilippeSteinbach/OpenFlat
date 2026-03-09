import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        name="cleaning"
        options={{ title: 'Cleaning', tabBarLabel: 'Cleaning' }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: 'Shopping', tabBarLabel: 'Shopping' }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: 'Finance', tabBarLabel: 'Finance' }}
      />
    </Tabs>
  );
}
