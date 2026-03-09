import { TouchableOpacity, Text, StyleSheet, type ViewStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../shared/theme';

type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'default' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Button({
  variant = 'default',
  size = 'default',
  onPress,
  disabled = false,
  loading = false,
  children,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();

  const variantStyles: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    default: { bg: colors.primary, fg: colors.primaryForeground },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, border: colors.border },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground },
    ghost: { bg: 'transparent', fg: colors.foreground },
    outline: { bg: 'transparent', fg: colors.foreground, border: colors.border },
  };

  const sizeStyles: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number }> = {
    sm: { paddingH: 12, paddingV: 6, fontSize: 13 },
    default: { paddingH: 16, paddingV: 10, fontSize: 15 },
    lg: { paddingH: 24, paddingV: 14, fontSize: 17 },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          backgroundColor: v.bg,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : typeof children === 'string' ? (
        <Text style={[styles.text, { color: v.fg, fontSize: s.fontSize }]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  text: {
    fontWeight: '600',
  },
});
