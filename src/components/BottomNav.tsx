import { Home, Calendar, BarChart3, Menu, X, Bell, Settings, Zap, Brain, Bot, Activity, MessageSquare, Sparkles, Sun, Moon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAI } from "@/contexts/AIContext";

export function BottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { toggleAI } = useAI();
  
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
    { icon: Home, label: "اليوم", path: "/" },
    { icon: Calendar, label: "التقويم", path: "/calendar" },
    { icon: Settings, label: "الإعدادات", path: "/settings" },
  ];

  const menuLinks = [
    { to: "/settings", label: "الإعدادات", icon: Settings },
    { to: "/projects", label: "المشاريع", icon: BarChart3 },
    { to: "/reports", label: "التقارير", icon: BarChart3 },
    { to: "/planner", label: "المخطط الذكي", icon: MessageSquare },
    { to: "/assistant", label: "المساعد", icon: Bot },
    { to: "/conflicts", label: "التعارضات", icon: Zap },
    { to: "/inbox", label: "الإشعارات", icon: Bell },
    { to: "/automation", label: "الأتمتة", icon: Zap },
    { to: "/diagnostics", label: "التشخيص", icon: Activity },
    { to: "/profile", label: "حسابي", icon: Settings },
  ];

  return (
    <>
      {/* Full Screen Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
              <h2 className="text-xl font-bold">القائمة</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background/95">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-right text-muted-foreground hover:bg-accent"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{isDark ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="flex items-center justify-around px-2 py-2 max-w-7xl mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[60px]",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* AI Button - Prominent in Center */}
          <button
            onClick={toggleAI}
            className={cn(
              "relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[60px] group"
            )}
          >
            <div
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300"
              style={{
                boxShadow: "0 0 24px hsl(var(--primary) / 0.6), 0 6px 16px hsl(var(--primary) / 0.4)",
              }}
            >
              <Sparkles className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-medium text-primary mt-0.5">الذكاء</span>
          </button>

          {/* More Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all text-muted-foreground hover:text-foreground min-w-[60px]"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">المزيد</span>
          </button>
        </div>
      </nav>
    </>
  );
}
