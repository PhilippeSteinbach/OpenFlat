/**
 * Mobile color themes — mirrors the web CSS variables.
 * Dark theme is the default.
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
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
  // Status
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export const darkColors: ThemeColors = {
  background: '#020817',     // hsl(222, 84%, 5%)
  foreground: '#F8FAFC',     // hsl(210, 40%, 98%)
  card: '#1E293B',           // hsl(217, 33%, 17%)
  cardForeground: '#F8FAFC',
  primary: '#F59E0B',        // Amber 500
  primaryForeground: '#451A03',
  secondary: '#1E293B',
  secondaryForeground: '#F8FAFC',
  muted: '#1E293B',
  mutedForeground: '#94A3B8', // Slate 400
  accent: '#1E293B',
  accentForeground: '#F8FAFC',
  destructive: '#EF4444',
  destructiveForeground: '#FAFAFA',
  border: '#334155',         // Slate 700
  input: '#334155',
  ring: '#F59E0B',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

export const lightColors: ThemeColors = {
  background: '#F8FAFC',     // hsl(210, 40%, 98%)
  foreground: '#0F172A',     // hsl(222, 84%, 5%)
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  primary: '#F59E0B',        // Amber 500
  primaryForeground: '#451A03',
  secondary: '#F1F5F9',
  secondaryForeground: '#0F172A',
  muted: '#F1F5F9',
  mutedForeground: '#64748B', // Slate 500
  accent: '#F1F5F9',
  accentForeground: '#0F172A',
  destructive: '#EF4444',
  destructiveForeground: '#FAFAFA',
  border: '#E2E8F0',         // Slate 200
  input: '#E2E8F0',
  ring: '#F59E0B',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

export const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];
