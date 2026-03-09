import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useCurrentUserStore } from '../shared/hooks/useCurrentUser';
import { ThemeProvider } from '../shared/theme';
import '../shared/i18n';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  useEffect(() => {
    const inTabs = segments[0] === '(tabs)';

    if (!currentUser && inTabs) {
      // No user selected — redirect to user selection
      router.replace('/user-selection');
    }
  }, [currentUser, segments, router]);

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen
          name="user-selection"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
