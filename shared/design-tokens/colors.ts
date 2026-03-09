/**
 * OpenFlat Design Tokens — Shared color definitions for Web & Mobile.
 *
 * Amber accent, neutral gray scale, and semantic aliases.
 * All values are plain hex strings so they can be consumed by:
 *  - Tailwind CSS (via `theme.extend.colors`)
 *  - React Native StyleSheet (direct import)
 *  - CSS custom-properties (converted by helper below)
 */

// ─── Accent: Amber / Orange ───────────────────────────────────────────
export const amber = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
} as const;

// ─── Neutral: Slate (works great for dark UIs) ───────────────────────
export const neutral = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const;

// ─── Semantic Status Colors ───────────────────────────────────────────
export const status = {
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',
} as const;

// ─── Avatar palette (distinguishable in both themes) ──────────────────
export const avatars = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#f43f5e', // rose
] as const;

// ─── Theme-specific semantic tokens ──────────────────────────────────
export interface SemanticTheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export const darkTheme: SemanticTheme = {
  background: neutral[950],
  foreground: neutral[50],
  card: neutral[900],
  cardForeground: neutral[50],
  popover: neutral[900],
  popoverForeground: neutral[50],
  primary: amber[500],
  primaryForeground: neutral[950],
  secondary: neutral[800],
  secondaryForeground: neutral[100],
  muted: neutral[800],
  mutedForeground: neutral[400],
  accent: neutral[800],
  accentForeground: neutral[50],
  destructive: '#7f1d1d',
  destructiveForeground: '#fca5a5',
  border: neutral[700],
  input: neutral[700],
  ring: amber[500],
};

export const lightTheme: SemanticTheme = {
  background: neutral[50],
  foreground: neutral[950],
  card: '#ffffff',
  cardForeground: neutral[950],
  popover: '#ffffff',
  popoverForeground: neutral[950],
  primary: amber[600],
  primaryForeground: '#ffffff',
  secondary: neutral[100],
  secondaryForeground: neutral[900],
  muted: neutral[100],
  mutedForeground: neutral[500],
  accent: neutral[100],
  accentForeground: neutral[900],
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: neutral[200],
  input: neutral[200],
  ring: amber[500],
};
