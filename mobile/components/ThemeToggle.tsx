import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../shared/theme';
import { ThemedText } from './ThemedText';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.button]}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <ThemedText size="lg">{isDark ? '☀️' : '🌙'}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 8,
  },
});
