import { View, type ViewProps } from 'react-native';
import { useTheme } from '../shared/theme';

interface ThemedViewProps extends ViewProps {
  variant?: 'background' | 'card' | 'muted';
}

export function ThemedView({ variant = 'background', style, ...props }: ThemedViewProps) {
  const { colors } = useTheme();

  const bgColor =
    variant === 'card'
      ? colors.card
      : variant === 'muted'
        ? colors.muted
        : colors.background;

  return <View style={[{ backgroundColor: bgColor }, style]} {...props} />;
}
