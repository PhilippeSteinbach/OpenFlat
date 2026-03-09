import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../shared/theme';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  const { colors } = useTheme();

  const variantStyles: Record<BadgeVariant, { bg: string; fg: string }> = {
    default: { bg: colors.primary, fg: colors.primaryForeground },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground },
    success: { bg: `${colors.success}20`, fg: colors.success },
    warning: { bg: `${colors.warning}20`, fg: colors.warning },
    danger: { bg: `${colors.danger}20`, fg: colors.danger },
    info: { bg: `${colors.info}20`, fg: colors.info },
    muted: { bg: colors.muted, fg: colors.mutedForeground },
  };

  const { bg, fg } = variantStyles[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
