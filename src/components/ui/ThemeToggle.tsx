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
    
    // Remove all theme classes first
    root.classList.remove('dark', 'light');
    root.removeAttribute('data-theme');
    
    // Force a reflow to ensure classes are fully removed
    void root.offsetHeight;
    
    if (dark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      body.style.backgroundColor = '#000000';
      body.style.color = '#FFFFFF';
    } else {
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      body.style.backgroundColor = '#FFFFFF';
      body.style.color = '#000000';
    }
    
    // Force repaint
    requestAnimationFrame(() => {
      document.body.style.display = 'none';
      void document.body.offsetHeight;
      document.body.style.display = '';
    });
  };

  const toggle = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    applyTheme(newTheme);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      className="rounded-full w-9 h-9"
      title={isDark ? 'تبديل إلى الوضع النهاري' : 'تبديل إلى الوضع الليلي'}
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </Button>
  );
}

