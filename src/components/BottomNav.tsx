import { Home, Calendar, BarChart3, Menu, X, Bell, Settings, Zap, Brain, Bot, Activity, MessageSquare, Sparkles, Sun, Moon, Globe, LogOut, Download, TrendingUp, FolderKanban, Users, Workflow, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from "react-router-dom";
import { useAI } from "@/contexts/AIContext";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { preloadPage } from "@/hooks/usePreloadPages";
import { prefetchPageData } from "@/hooks/usePrefetchData";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDraggingToClose, setIsDraggingToClose] = useState(false);
  const { toggleAI } = useAI();
  const { t } = useTranslation('navigation');
  
  // Haptic feedback function
  const triggerHaptic = () => {
    // Check if device supports vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Light vibration for 10ms
    }
    
    // For Capacitor apps, you can also use Haptics API for better native feel
    // This will work if @capacitor/haptics is installed
    const Capacitor = (window as any).Capacitor;
    if (Capacitor?.isNativePlatform?.()) {
      const Haptics = (window as any).Capacitor?.Plugins?.Haptics;
      if (Haptics) {
        Haptics.impact({ style: 'light' });
      }
    }
  };
  
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true;
  });

  useEffect(() => {
    applyTheme(isDark);
  }, []);

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement;
    const body = document.body;
    
    root.classList.remove('dark', 'light');
    root.removeAttribute('data-theme');
    
    if (dark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      body.style.setProperty('background-color', '#000000', 'important');
      body.style.setProperty('color', '#FFFFFF', 'important');
    } else {
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      body.style.setProperty('background-color', '#FFFFFF', 'important');
      body.style.setProperty('color', '#000000', 'important');
    }
    
    void root.offsetHeight;
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    applyTheme(newTheme);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t('menu.signOutSuccess', { defaultValue: 'تم تسجيل الخروج بنجاح' }));
      setMenuOpen(false);
      navigate('/auth', { replace: true });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(t('menu.signOutError', { defaultValue: 'فشل تسجيل الخروج' }));
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: t('bottomNav.today'), path: "/" },
    { icon: Calendar, label: t('bottomNav.calendar'), path: "/calendar" },
    { icon: TrendingUp, label: t('bottomNav.reports'), path: "/reports" },
  ];

  const menuLinks = [
    { to: "/settings", label: t('menu.settings'), icon: Settings },
    { to: "/projects", label: t('menu.projects'), icon: FolderKanban },
    { to: "/reports", label: t('menu.reports'), icon: TrendingUp },
    { to: "/planner", label: t('menu.planner'), icon: Brain },
    { to: "/assistant", label: t('menu.assistant'), icon: Bot },
    { to: "/conflicts", label: t('menu.conflicts'), icon: Zap },
    { to: "/inbox", label: t('menu.notifications'), icon: Bell },
    { to: "/automation", label: t('menu.automation'), icon: Workflow },
    { to: "/diagnostics", label: t('menu.diagnostics'), icon: Activity },
    { to: "/profile", label: t('menu.profile'), icon: Users },
  ];

  return (
    <>
      {/* Full Screen Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md"
              onClick={() => setMenuOpen(false)}
            />
            
            {/* Menu Content */}
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ 
                type: "spring",
                damping: 25,
                stiffness: 300
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDrag={(_, info) => {
                // تحديث حالة المؤشر بناءً على مسافة السحب
                setIsDraggingToClose(info.offset.y > 100);
              }}
              onDragEnd={(_, info) => {
                // إغلاق القائمة إذا تم السحب لأسفل بسرعة أو لمسافة كافية
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setMenuOpen(false);
                  setIsDraggingToClose(false);
                } else {
                  setIsDraggingToClose(false);
                }
              }}
              className="fixed inset-x-0 bottom-0 z-[101] bg-background/98 backdrop-blur-xl rounded-t-3xl shadow-2xl"
              style={{ maxHeight: "85vh" }}
            >
            <div className="flex flex-col h-full">
              {/* Header with drag indicator */}
              <div className="flex flex-col items-center pt-3 pb-2 border-b border-border/50 bg-card/50 rounded-t-3xl">
                <motion.div 
                  className="w-12 h-1.5 rounded-full mb-3 transition-all duration-200"
                  animate={{
                    backgroundColor: isDraggingToClose 
                      ? "hsl(var(--destructive))" 
                      : "hsl(var(--border))",
                    width: isDraggingToClose ? "48px" : "48px",
                    height: isDraggingToClose ? "8px" : "6px"
                  }}
                />
                <div className="flex items-center justify-between w-full px-4 pb-2">
                  <h2 className="text-xl font-bold">{t('menu.title')}</h2>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background/95">
                {/* Language Switcher */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/50 border border-border/50"
                >
                  <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <LanguageSwitcher />
                  </div>
                </motion.div>
                
                {/* Theme Toggle */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  onClick={toggleTheme}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-right text-muted-foreground hover:bg-accent"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{isDark ? t('menu.lightMode') : t('menu.darkMode')}</span>
                </motion.button>
                
                {menuLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + (index * 0.05) }}
                    >
                      <Link
                        to={link.to}
                        onClick={() => setMenuOpen(false)}
                        onMouseEnter={() => {
                          // Preload page on hover
                          const pageName = link.to.slice(1).replace(/\//g, '-');
                          preloadPage(pageName);
                        }}
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
                    </motion.div>
                  );
                })}

                {/* Download App Button */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (menuLinks.length * 0.05) }}
                  onClick={() => {
                    // Detect if user is on iOS or Android
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    const isAndroid = /Android/.test(navigator.userAgent);
                    
                    if (isIOS) {
                      toast.info('قريباً على App Store');
                    } else if (isAndroid) {
                      toast.info('قريباً على Google Play');
                    } else {
                      toast.info('التطبيق متاح على الأجهزة المحمولة');
                    }
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-right bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 mt-2"
                >
                  <Download className="w-5 h-5" />
                  <span className="font-medium">{t('menu.downloadApp', { defaultValue: 'تنزيل التطبيق' })}</span>
                </motion.button>

                {/* Sign Out Button */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + (menuLinks.length * 0.05) }}
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-right text-destructive hover:bg-destructive/10 border border-destructive/20 mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">{t('menu.signOut', { defaultValue: 'تسجيل الخروج' })}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* Bottom Navigation - Responsive */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-card/95 backdrop-blur-xl border-t border-border",
        "h-16 md:h-20", // Taller on tablets
        "safe-bottom"
      )}>
        <div className="flex items-center justify-around px-2 py-2 max-w-7xl mx-auto h-full">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
              >
                <Link
                  to={item.path}
                  onClick={triggerHaptic}
                  onMouseEnter={() => {
                    // Preload page code
                    const pageName = item.path === '/' ? 'today' : item.path.slice(1);
                    preloadPage(pageName);
                    
                    // Prefetch API data
                    if (pageName === 'today' || pageName === 'calendar') {
                      prefetchPageData(pageName as 'today' | 'calendar');
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[60px] relative",
                    "md:scale-110",
                    isActive 
                      ? "text-primary" 
                      : "text-foreground/80 hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "transition-all",
                    "w-5 h-5 md:w-6 md:h-6",
                    isActive && "scale-110"
                  )} />
                  <span className={cn(
                    "text-[10px] transition-all",
                    "md:text-sm",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Animated Active Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 bg-primary rounded-full"
                      initial={{ width: "40%" }}
                      animate={{ width: "60%" }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30
                      }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}

          {/* AI Button - Center with Responsive Size */}
          <motion.button
            onClick={() => {
              triggerHaptic();
              toggleAI();
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.4,
              delay: navItems.length * 0.1,
              ease: "backOut"
            }}
            className={cn(
              "flex flex-col items-center justify-center",
              "relative mt-0 md:mt-0",
              "transition-all duration-300",
              "hover:scale-110 active:scale-95",
              "group"
            )}
          >
            {/* Animated Ring */}
            <div className="absolute inset-0 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
                filter: "blur(8px)",
              }}
            />
            
            {/* Main Button */}
            <div className={cn(
              "rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary to-primary/80",
              "shadow-lg hover:shadow-xl",
              "transition-all duration-300",
              "w-7 h-7 md:w-8 md:h-8",
              "relative z-10",
              "group-active:animate-[scale-in_0.15s_ease-out]"
            )}
              style={{
                boxShadow: "0 0 20px hsl(var(--primary) / 0.5), 0 4px 12px hsl(var(--primary) / 0.3)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground transition-transform duration-300 group-hover:rotate-12 group-active:scale-110" />
            </div>
            
            <span className="text-[10px] md:text-sm mt-1 font-semibold text-primary transition-all duration-300 group-hover:scale-105">
              AI
            </span>
          </motion.button>

          {/* More Button */}
          <motion.button
            onClick={() => {
              triggerHaptic();
              setMenuOpen(true);
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3,
              delay: (navItems.length + 1) * 0.1,
              ease: "easeOut"
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[60px]",
              "md:scale-110",
              "text-foreground/80 hover:text-foreground"
            )}
          >
            <Menu className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[10px] md:text-sm font-medium">{t('bottomNav.more')}</span>
          </motion.button>
        </div>
      </nav>
    </>
  );
}
