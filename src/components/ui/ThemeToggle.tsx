import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { applyTheme, isSystemDarkMode } from '@/lib/theme';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(isSystemDarkMode());

  useEffect(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    if (stored) {
      const dark = stored === 'dark';
      setIsDark(dark);
      applyTheme(stored as 'light' | 'dark');
    } else {
      // Use system preference
      const systemDark = isSystemDarkMode();
      setIsDark(systemDark);
      applyTheme(systemDark ? 'dark' : 'light');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      className="rounded-full"
      title={isDark ? 'تبديل إلى الوضع النهاري' : 'تبديل إلى الوضع الليلي'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-warning" />
      ) : (
        <Moon className="w-4 h-4 text-primary" />
      )}
    </Button>
  );
}
