import { Stack } from 'expo-router';
import { useTheme } from '../../../shared/theme';

export default function ShoppingLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[itemId]" options={{ title: 'Item Detail', presentation: 'modal' }} />
    </Stack>
  );
}
