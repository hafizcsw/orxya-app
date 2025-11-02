import { Home, Heart, Users, Menu, X, Calendar, Bell, Settings, BarChart3, Zap, Brain, Bot, Activity } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface BottomNavProps {
  onAIClick?: () => void;
}

export function BottomNav({ onAIClick }: BottomNavProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Heart, label: "Health", path: "/health" },
    { icon: Users, label: "Community", path: "/community" },
  ];

  const menuLinks = [
    { to: "/", label: "اليوم", icon: Home },
    { to: "/calendar", label: "التقويم", icon: Calendar },
    { to: "/calendar-view", label: "تقويم ذكي", icon: Calendar },
    { to: "/inbox", label: "الإشعارات", icon: Bell },
    { to: "/calendar-simple", label: "تقويم بسيط", icon: Calendar },
    { to: "/planner", label: "المخطط الذكي", icon: Brain },
    { to: "/conflicts", label: "التعارضات", icon: Zap },
    { to: "/settings/external", label: "التكاملات", icon: Settings },
    { to: "/settings/notifications", label: "التنبيهات", icon: Bell },
    { to: "/projects", label: "المشاريع", icon: BarChart3 },
    { to: "/reports", label: "التقارير", icon: BarChart3 },
    { to: "/automation", label: "الأتمتة", icon: Zap },
    { to: "/ai", label: "الذكاء الاصطناعي", icon: Brain },
    { to: "/assistant", label: "المساعد", icon: Bot },
    { to: "/diagnostics", label: "التشخيص", icon: Activity },
    { to: "/profile", label: "حسابي", icon: Users },
  ];

  return (
    <>
      {/* Full Screen Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-background animate-fade-in">
          <div className="flex flex-col h-full">
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around px-4 py-3 max-w-7xl mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
            <span className="text-xs font-medium">More</span>
          </button>

          {/* AI Button */}
          <button
            onClick={onAIClick}
            className={cn(
              "w-14 h-14 rounded-full",
              "bg-primary text-primary-foreground",
              "flex items-center justify-center",
              "font-bold text-xl",
              "shadow-lg hover:scale-110 transition-all duration-300",
              "border-2 border-primary/30"
            )}
            style={{
              boxShadow: "0 0 20px hsl(var(--primary) / 0.4)",
            }}
          >
            AI
          </button>
        </div>
      </nav>
    </>
  );
}
