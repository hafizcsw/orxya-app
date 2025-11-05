import { Home, Calendar, BarChart3, Menu, X, Bell, Settings, Zap, Brain, Bot, Activity, MessageSquare, Sparkles, Sun, Moon, Globe } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAI } from "@/contexts/AIContext";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function BottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { toggleAI } = useAI();
  const { t } = useTranslation('navigation');
  
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true;
  });

  useEffect(() => {
    applyTheme(isDark);
  }, []);

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    const body = document.body;
    
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
    
    void root.offsetHeight;
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    applyTheme(newTheme);
  };

  const navItems = [
    { icon: Home, label: t('bottomNav.today'), path: "/" },
    { icon: Calendar, label: t('bottomNav.calendar'), path: "/calendar" },
  ];

  const menuLinks = [
    { to: "/settings", label: t('menu.settings'), icon: Settings },
    { to: "/projects", label: t('menu.projects'), icon: BarChart3 },
    { to: "/reports", label: t('menu.reports'), icon: BarChart3 },
    { to: "/planner", label: t('menu.planner'), icon: MessageSquare },
    { to: "/assistant", label: t('menu.assistant'), icon: Bot },
    { to: "/conflicts", label: t('menu.conflicts'), icon: Zap },
    { to: "/inbox", label: t('menu.notifications'), icon: Bell },
    { to: "/automation", label: t('menu.automation'), icon: Zap },
    { to: "/diagnostics", label: t('menu.diagnostics'), icon: Activity },
    { to: "/profile", label: t('menu.profile'), icon: Settings },
  ];

  return (
    <>
      {/* Full Screen Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
              <h2 className="text-xl font-bold">{t('menu.title')}</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background/95">
              {/* Language Switcher */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/50 border border-border/50">
                <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <LanguageSwitcher />
                </div>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-right text-muted-foreground hover:bg-accent"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{isDark ? t('menu.lightMode') : t('menu.darkMode')}</span>
              </button>
              
              {menuLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      location.pathname === link.to
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Responsive */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-card/95 backdrop-blur-xl border-t border-border",
        "h-16 md:h-20", // Taller on tablets
        "safe-bottom"
      )}>
        <div className="flex items-center justify-around px-2 py-2 max-w-7xl mx-auto h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[60px]",
                  "md:scale-110",
                  isActive 
                    ? "text-primary" 
                    : "text-foreground/80 hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "transition-all",
                  "w-5 h-5 md:w-6 md:h-6",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] transition-all",
                  "md:text-sm",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* AI Button - Center with Responsive Size */}
          <button
            onClick={toggleAI}
            className={cn(
              "flex flex-col items-center justify-center",
              "relative mt-0 md:mt-0",
              "transition-all duration-300",
              "hover:scale-110 active:scale-95",
              "group"
            )}
          >
            {/* Animated Ring */}
            <div className="absolute inset-0 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
                filter: "blur(8px)",
              }}
            />
            
            {/* Main Button */}
            <div className={cn(
              "rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary to-primary/80",
              "shadow-lg hover:shadow-xl",
              "transition-all duration-300",
              "w-7 h-7 md:w-8 md:h-8",
              "relative z-10",
              "group-active:animate-[scale-in_0.15s_ease-out]"
            )}
              style={{
                boxShadow: "0 0 20px hsl(var(--primary) / 0.5), 0 4px 12px hsl(var(--primary) / 0.3)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground transition-transform duration-300 group-hover:rotate-12 group-active:scale-110" />
            </div>
            
            <span className="text-[10px] md:text-sm mt-1 font-semibold text-primary transition-all duration-300 group-hover:scale-105">
              AI
            </span>
          </button>

          {/* More Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[60px]",
              "md:scale-110",
              "text-foreground/80 hover:text-foreground"
            )}
          >
            <Menu className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-sm font-medium">{t('bottomNav.more')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
