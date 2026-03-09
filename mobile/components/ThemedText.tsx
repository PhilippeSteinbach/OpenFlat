import { Text, type TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../shared/theme';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'muted' | 'primary' | 'destructive' | 'success';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

const SIZES = { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, '2xl': 28 } as const;
const WEIGHTS = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export function ThemedText({
  variant = 'default',
  size = 'base',
  weight = 'normal',
  style,
  ...props
}: ThemedTextProps) {
  const { colors } = useTheme();

  const color =
    variant === 'muted'
      ? colors.mutedForeground
      : variant === 'primary'
        ? colors.primary
        : variant === 'destructive'
          ? colors.destructive
          : variant === 'success'
            ? colors.success
            : colors.foreground;

  return (
    <Text
      style={[
        { color, fontSize: SIZES[size], fontWeight: WEIGHTS[weight] },
        style,
      ]}
      {...props}
    />
  );
}
