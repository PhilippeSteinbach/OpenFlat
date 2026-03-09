import { Stack } from 'expo-router';

export default function CleaningLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Cleaning Board' }} />
      <Stack.Screen name="[taskId]" options={{ title: 'Task Detail', presentation: 'modal' }} />
    </Stack>
  );
}
