import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    // Default to dark mode (WHOOP style)
    return true;
  });
  useEffect(() => {
    // Apply theme on mount
    applyTheme(isDark);
  }, []);
  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    const body = document.body;

    // Instant class swap
    root.classList.remove('dark', 'light');
    root.removeAttribute('data-theme');
    if (dark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      body.style.setProperty('background-color', '#000000', 'important');
      body.style.setProperty('color', '#FFFFFF', 'important');
    } else {
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      body.style.setProperty('background-color', '#FFFFFF', 'important');
      body.style.setProperty('color', '#000000', 'important');
    }

    // Force immediate repaint
    void root.offsetHeight;
  };
  const toggle = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    applyTheme(newTheme);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-9 w-9"
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}