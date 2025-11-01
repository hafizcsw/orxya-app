import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import AuthSheet from "@/components/AuthSheet";
import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";

const Navigation = () => {
  const location = useLocation();
  const { user } = useUser();
  const [authOpen, setAuthOpen] = useState(false);

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
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <div className="flex gap-6 md:gap-8">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">Oryxa</span>
            </Link>
            <div className="flex gap-4 md:gap-6">
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
          </div>
          
          <div className="flex items-center gap-2">
            {user ? (
              <button 
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm" 
                onClick={async () => { 
                  await supabase.auth.signOut(); 
                  track('auth_signout'); 
                }}
              >
                خروج
              </button>
            ) : (
              <button 
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm" 
                onClick={() => setAuthOpen(true)}
              >
                دخول
              </button>
            )}
          </div>
        </div>
      </nav>
      
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navigation;
