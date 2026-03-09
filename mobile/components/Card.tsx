import { View, type ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../shared/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ elevated = true, style, ...props }: CardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...(elevated && !isDark
            ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }
            : {}),
          ...(elevated && isDark
            ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }
            : {}),
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
});
