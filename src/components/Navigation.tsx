import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import AuthSheet from "@/components/AuthSheet";
import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const location = useLocation();
  const { user } = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const links = [
    { to: "/", label: "اليوم" },
    { to: "/projects", label: "المشاريع" },
    { to: "/reports", label: "التقارير" },
    { to: "/automation", label: "الأتمتة" },
    { to: "/ai", label: "الذكاء الاصطناعي" },
    { to: "/diagnostics", label: "التشخيص" },
    { to: "/profile", label: "حسابي" },
  ];

  return (
    <>
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center">
              <span className="font-bold text-xl">Oryxa</span>
            </Link>
            
            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="flex gap-4 md:gap-6 mr-6">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      location.pathname === link.to
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Desktop Auth */}
          {!isMobile && (
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {user.email}
                  </span>
                  <button 
                    className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm" 
                    onClick={async () => { 
                      await supabase.auth.signOut(); 
                      track('auth_signout'); 
                    }}
                  >
                    خروج
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm" 
                >
                  دخول
                </Link>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobile && mobileMenuOpen && (
          <div className="border-t bg-background">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-lg transition-colors",
                    location.pathname === link.to
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-2 border-t mt-2">
                {user ? (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground px-4 py-2">
                      {user.email}
                    </div>
                    <button 
                      className="w-full px-4 py-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm" 
                      onClick={async () => { 
                        await supabase.auth.signOut(); 
                        track('auth_signout');
                        setMobileMenuOpen(false);
                      }}
                    >
                      خروج
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm text-center" 
                  >
                    دخول
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navigation;
