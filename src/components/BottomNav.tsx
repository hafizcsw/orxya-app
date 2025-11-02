import { Home, Heart, Users, Menu, Sparkles } from "lucide-react";
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
    { icon: Menu, label: "More", path: "/more" },
  ];

  return (
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
  );
}
