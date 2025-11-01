import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const location = useLocation();

  const links = [
    { to: "/", label: "اليوم" },
    { to: "/projects", label: "المشاريع" },
    { to: "/reports", label: "التقارير" },
    { to: "/automation", label: "الأتمتة" },
    { to: "/ai", label: "الذكاء الاصطناعي" },
    { to: "/diagnostics", label: "التشخيص" },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center">
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
      </div>
    </nav>
  );
};

export default Navigation;
