import { Home, Calendar, BarChart3, Menu, X, Bell, Settings, Zap, Brain, Bot, Activity, MessageSquare, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAI } from "@/contexts/AIContext";

export function BottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { toggleAI } = useAI();

  const navItems = [
    { icon: Home, label: "اليوم", path: "/" },
    { icon: Calendar, label: "التقويم", path: "/calendar" },
    { icon: BarChart3, label: "المشاريع", path: "/projects" },
  ];

  const menuLinks = [
    { to: "/today-whoop", label: "WHOOP اليوم", icon: Sparkles },
    { to: "/reports", label: "التقارير", icon: BarChart3 },
    { to: "/inbox", label: "الإشعارات", icon: Bell },
    { to: "/conflicts", label: "التعارضات", icon: Zap },
    { to: "/planner", label: "المخطط الذكي", icon: MessageSquare },
    { to: "/assistant", label: "المساعد", icon: Bot },
    { to: "/settings/external", label: "التكاملات", icon: Settings },
    { to: "/settings/notifications", label: "التنبيهات", icon: Bell },
    { to: "/automation", label: "الأتمتة", icon: Zap },
    { to: "/diagnostics", label: "التشخيص", icon: Activity },
    { to: "/profile", label: "حسابي", icon: Settings },
  ];

  return (
    <>
      {/* Full Screen Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] bg-background animate-fade-in">
          <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-bold">القائمة</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
