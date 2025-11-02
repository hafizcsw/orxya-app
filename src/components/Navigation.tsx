import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import AuthSheet from "@/components/AuthSheet";
import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { Menu, X, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    // Prevent multiple signout calls
    if (isSigningOut) {
      console.log('[Navigation] Sign out already in progress');
      return;
    }
    
    console.log('[Navigation] Sign out clicked');
    setIsSigningOut(true);
    
    try {
      track('auth_signout');
      
      console.log('[Navigation] Signing out from Supabase...');
      // Use 'global' scope to clear all sessions
      await supabase.auth.signOut({ scope: 'global' });
      
      console.log('[Navigation] Sign out successful, redirecting...');
      
      // Small delay to allow cleanup
      setTimeout(() => {
        navigate('/auth', { replace: true });
        setIsSigningOut(false);
      }, 300);
    } catch (err) {
      console.error('[Navigation] Sign out failed:', err);
      // Still redirect on error
      setTimeout(() => {
        navigate('/auth', { replace: true });
        setIsSigningOut(false);
      }, 300);
    }
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
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center group">
              <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-xl transition-transform group-hover:scale-105">
                Oryxa
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="flex gap-2 mr-6">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      location.pathname === link.to
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {location.pathname === link.to && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Desktop and Mobile Auth - Avatar on Right */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="relative">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold shadow-lg hover:scale-110 transition-all duration-300 border-2 border-primary/30"
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
          </div>

        </div>

      </nav>
      
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navigation;
