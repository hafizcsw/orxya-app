import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import AuthSheet from "@/components/AuthSheet";
import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { User, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CalendarPopover } from "@/components/CalendarPopover";
import { useSelectedDate } from "@/contexts/DateContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    if (isSigningOut) {
      console.log('[Navigation] Sign out already in progress');
      return;
    }
    
    console.log('[Navigation] Sign out clicked');
    setIsSigningOut(true);
    
    try {
      track('auth_signout');
      
      console.log('[Navigation] Signing out from Supabase...');
      await supabase.auth.signOut({ scope: 'global' });
      
      console.log('[Navigation] Sign out successful, redirecting...');
      
      setTimeout(() => {
        navigate('/auth', { replace: true });
        setIsSigningOut(false);
      }, 300);
    } catch (err) {
      console.error('[Navigation] Sign out failed:', err);
      setTimeout(() => {
        navigate('/auth', { replace: true });
        setIsSigningOut(false);
      }, 300);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) {
      return "TODAY";
    }
    return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  const links = [
    { to: "/", label: "اليوم" },
    { to: "/calendar", label: "التقويم" },
    { to: "/calendar-view", label: "تقويم ذكي" },
    { to: "/inbox", label: "الإشعارات" },
    { to: "/calendar-simple", label: "تقويم بسيط" },
    { to: "/planner", label: "المخطط الذكي" },
    { to: "/conflicts", label: "التعارضات" },
    { to: "/settings/external", label: "التكاملات" },
    { to: "/settings/notifications", label: "التنبيهات" },
    { to: "/projects", label: "المشاريع" },
    { to: "/reports", label: "التقارير" },
    { to: "/automation", label: "الأتمتة" },
    { to: "/ai", label: "الذكاء الاصطناعي" },
    { to: "/assistant", label: "المساعد" },
    { to: "/diagnostics", label: "التشخيص" },
    { to: "/profile", label: "حسابي" },
  ];

  return (
    <>
      <nav className="border-b bg-background/95 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex h-12 items-center justify-between px-4">
          {/* Left: Avatar */}
          {user && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => navigate('/profile')}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold shadow-lg hover:scale-110 transition-all duration-300 border-2 border-primary/30 text-sm"
                style={{
                  boxShadow: "0 0 12px hsl(var(--primary) / 0.3)",
                }}
              >
                {user?.email?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
              </button>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-background" />
            </div>
          )}

          {/* Center: Calendar Navigation */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={goToPreviousDay}
              className="w-7 h-7 rounded-lg bg-secondary/60 hover:bg-secondary/80 flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            
            <CalendarPopover 
              selectedDate={selectedDate}
              onDateChange={(date) => setSelectedDate(date)}
            >
              <button className="px-3 py-1 rounded-lg bg-secondary/60 hover:bg-secondary/80 transition-all">
                <span className="font-bold text-xs tracking-wide">{formatDate(selectedDate)}</span>
              </button>
            </CalendarPopover>
            
            <button
              onClick={goToNextDay}
              className="w-7 h-7 rounded-lg bg-secondary/60 hover:bg-secondary/80 flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Logo + Theme Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <Link
              to="/"
              className="text-lg font-bold text-foreground hover:text-primary transition-colors"
            >
              Oryxa
            </Link>
          </div>
        </div>
      </nav>
      
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navigation;
