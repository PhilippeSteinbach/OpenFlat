import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/shared/hooks/useTheme';
import { Button } from '@/shared/ui';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-amber-400" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
