import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to user selection on app launch
  return <Redirect href="/user-selection" />;
}
