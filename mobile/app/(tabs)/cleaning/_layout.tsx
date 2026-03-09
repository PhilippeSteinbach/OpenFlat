import { Stack } from 'expo-router';
import { useTheme } from '../../../shared/theme';

export default function CleaningLayout() {
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
      <Stack.Screen name="[taskId]" options={{ title: 'Task Detail', presentation: 'modal' }} />
    </Stack>
  );
}
