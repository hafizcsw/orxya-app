import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import AuthSheet from "@/components/AuthSheet";
import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { User, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
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
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
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
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-3">
          {/* Left: Avatar */}
          {user && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => navigate('/profile')}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold shadow-lg hover:scale-110 transition-all duration-300 border-2 border-primary/30"
                style={{
                  boxShadow: "0 0 15px hsl(var(--primary) / 0.3)",
                }}
              >
                {user?.email?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
              </button>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            </div>
          )}

          {/* Center: Calendar Navigation */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={goToPreviousDay}
              className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary/80 flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <div className="px-5 py-1.5 rounded-lg bg-secondary/60">
              <span className="font-bold text-sm tracking-wide">{formatDate(currentDate)}</span>
            </div>
            
            <button
              onClick={goToNextDay}
              className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary/80 flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Logo - MUST BE VISIBLE */}
          <Link
            to="/"
            className="text-2xl font-bold text-foreground hover:text-primary transition-colors flex-shrink-0"
          >
            Oryxa
          </Link>
        </div>
      </nav>
      
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navigation;
