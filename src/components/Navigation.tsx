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
      <nav className="border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm transition-all duration-300">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Left: Avatar + Logo */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="relative">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold shadow-lg hover:scale-110 transition-all duration-300 border-2 border-primary/30"
                  style={{
                    boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
                  }}
                  title="الملف الشخصي"
                >
                  {user?.email?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                </button>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              </div>
            )}
            
            <Link
              to="/"
              className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent hover:scale-105 transition-transform cursor-pointer"
            >
              Oryxa
            </Link>
          </div>

          {/* Center: Calendar Navigation */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={goToPreviousDay}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-all hover:scale-110 duration-300"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            <button
              onClick={() => navigate('/calendar')}
              className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-secondary/80 hover:bg-secondary transition-all min-w-[80px] md:min-w-[100px]"
            >
              <span className="font-bold text-xs md:text-sm tracking-wider">{formatDate(currentDate)}</span>
            </button>
            
            <button
              onClick={goToNextDay}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-all hover:scale-110 duration-300"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* Right: Placeholder for balance */}
          <div className="w-11 md:w-12">
            {/* يمكن إضافة أيقونات هنا لاحقاً */}
          </div>
        </div>
      </nav>
      
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navigation;
