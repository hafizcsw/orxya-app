import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HooksErrorBoundary } from "./components/HooksErrorBoundary";
import { ThemeProvider } from "next-themes";
import { DateProvider } from "./contexts/DateContext";
import { AIProvider } from "./contexts/AIContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { LoadingFallback } from "./components/ui/loading-fallback";
import { useUser } from "./lib/auth";
import { useAutopilotNotifications } from "./hooks/useAutopilotNotifications";
import { useWidgetTokenSync } from "./hooks/useWidgetToken";
import { usePreloadPages } from "./hooks/usePreloadPages";
import { usePrefetchData } from "./hooks/usePrefetchData";

import { PWAUpdateNotification } from "./components/PWAUpdateNotification";
import { PWAUpdateToast } from "./components/PWAUpdateToast";

// Eagerly load critical components
import Navigation from "./components/Navigation";
import { BottomNav } from "./components/BottomNav";
import { AIDock } from "./components/oryxa/AIDock";
import { Protected } from "./components/Protected";
import { MobileDownloadBanner } from "./components/MobileDownloadBanner";

// Lazy load pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Today = lazy(() => import("./pages/Today"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Install = lazy(() => import("./pages/Install"));

// Secondary pages
const Projects = lazy(() => import("./pages/Projects"));
const Reports = lazy(() => import("./pages/Reports"));
const Automation = lazy(() => import("./pages/Automation"));
const AI = lazy(() => import("./pages/AI"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Profile = lazy(() => import("./pages/Profile"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Inbox = lazy(() => import("./pages/Inbox"));

// Calendar pages
const Calendar = lazy(() => import("./pages/Calendar"));
const CalendarFull = lazy(() => import("./pages/CalendarFull"));
const CalendarSimple = lazy(() => import("./pages/CalendarSimple"));
const CalendarSettings = lazy(() => import("./pages/CalendarSettings"));
const PublicBookingPage = lazy(() => import("./pages/PublicBookingPage"));

// Settings pages
const Settings = lazy(() => import("./pages/Settings"));
const SettingsExternal = lazy(() => import("./pages/SettingsExternal"));
const SettingsNotifications = lazy(() => import("./pages/SettingsNotifications"));
const SettingsPrayer = lazy(() => import("./pages/SettingsPrayer"));
const GlancesSettings = lazy(() => import("./pages/GlancesSettings"));

// Integration pages
const IntegrationsHub = lazy(() => import("./pages/IntegrationsHub"));

// Other pages
const PlannerChat = lazy(() => import("./pages/PlannerChat"));
const Conflicts = lazy(() => import("./pages/Conflicts"));
const TestConflicts = lazy(() => import("./pages/TestConflicts"));
const OAuthGoogle = lazy(() => import("./pages/OAuthGoogle"));
const PrivacyCenter = lazy(() => import("./pages/PrivacyCenter"));
const TodayWHOOP = lazy(() => import("./pages/TodayWHOOP"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages
const Diagnostics = lazy(() => import("./pages/Diagnostics"));
const Seed = lazy(() => import("./pages/Seed"));
const FlagsConsole = lazy(() => import("./pages/FlagsConsole"));
const EngagementDashboard = lazy(() => import("./pages/EngagementDashboard"));
const GoLiveDashboard = lazy(() => import("./pages/GoLiveDashboard"));
const AdminAutopilot = lazy(() => import("./pages/AdminAutopilot"));
const GenerateAssets = lazy(() => import("./pages/GenerateAssets"));

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useUser(); // ✅ Call useUser ONCE at top level
  
  useAutopilotNotifications(user); // Pass user as prop
  useWidgetTokenSync(); // Auto-sync JWT token for widgets
  usePreloadPages(); // Preload commonly used pages in background
  usePrefetchData(user); // Pass user as prop
  const location = useLocation();
  const { i18n } = useTranslation();
  
  // Apply language attribute and listen for language changes
  useEffect(() => {
    // Set initial language
    if (i18n?.language) {
      document.documentElement.setAttribute('lang', i18n.language);
    }
    
    // Listen for language change events
    const handleLanguageChange = (e: Event) => {
      const custom = e as CustomEvent<{ language: string }>;
      const lng = custom?.detail?.language;
      if (lng) document.documentElement.setAttribute('lang', lng);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []); // Empty dependency array - register once
  
  // Hide navigation on auth pages
  const isAuthPage = location.pathname === '/auth' || location.pathname === '/auth/callback';
  
  return (
    <AuthProvider user={user} loading={loading}>
      <PWAUpdateNotification />
      <PWAUpdateToast />
      {!isAuthPage && <MobileDownloadBanner />}
      {!isAuthPage && <Navigation />}
      <div className={isAuthPage ? '' : 'pb-20'}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/today" element={<Protected><HooksErrorBoundary><Today /></HooksErrorBoundary></Protected>} />
            <Route path="/today-whoop" element={<Protected><TodayWHOOP /></Protected>} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/reports" element={<Protected><Reports /></Protected>} />
            <Route path="/automation" element={<Protected><Automation /></Protected>} />
            <Route path="/ai" element={<AI />} />
            <Route path="/assistant" element={<Protected><Assistant /></Protected>} />
            <Route path="/calendar" element={<Protected><ErrorBoundary><Calendar /></ErrorBoundary></Protected>} />
            <Route path="/calendar/settings" element={<Protected><CalendarSettings /></Protected>} />
            <Route path="/book/:slug" element={<PublicBookingPage />} />
            <Route path="/inbox" element={<Protected><Inbox /></Protected>} />
            <Route path="/calendar-full" element={<Protected><CalendarFull /></Protected>} />
            <Route path="/calendar-simple" element={<Protected><CalendarSimple /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/settings/external" element={<Protected><SettingsExternal /></Protected>} />
            <Route path="/settings/notifications" element={<Protected><SettingsNotifications /></Protected>} />
            <Route path="/settings/prayer" element={<Protected><SettingsPrayer /></Protected>} />
            <Route path="/settings/glances" element={<Protected><GlancesSettings /></Protected>} />
            <Route path="/integrations" element={<Protected><IntegrationsHub /></Protected>} />
            <Route path="/planner" element={<Protected><PlannerChat /></Protected>} />
            <Route path="/conflicts" element={<Protected><Conflicts /></Protected>} />
            <Route path="/test-conflicts" element={<Protected><TestConflicts /></Protected>} />
            <Route path="/oauth/google" element={<OAuthGoogle />} />
            <Route path="/admin/autopilot" element={<Protected><AdminAutopilot /></Protected>} />
            <Route path="/generate-assets" element={<GenerateAssets />} />
            <Route path="/diagnostics" element={<Protected><Diagnostics /></Protected>} />
            <Route path="/seed" element={<Seed />} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
            <Route path="/privacy" element={<Protected><PrivacyCenter /></Protected>} />
            <Route path="/flags" element={<Protected><FlagsConsole /></Protected>} />
            <Route path="/engagement" element={<Protected><EngagementDashboard /></Protected>} />
            <Route path="/golive" element={<Protected><GoLiveDashboard /></Protected>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      {!isAuthPage && <BottomNav />}
      {!isAuthPage && <AIDock />}
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <SettingsProvider>
            <DateProvider>
              <AIProvider>
                <div id="app-root" className="relative min-h-dvh isolate">
                  <div id="page" className="relative z-0">
                    <ErrorBoundary>
                      <AppContent />
                    </ErrorBoundary>
                  </div>
                  <div id="portals" className="fixed inset-0 z-50 pointer-events-none" />
                </div>
                <Toaster />
                <Sonner />
              </AIProvider>
            </DateProvider>
          </SettingsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
