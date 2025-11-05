import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "next-themes";
import { DateProvider } from "./contexts/DateContext";
import { AIProvider } from "./contexts/AIContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "./components/Navigation";
import { BottomNav } from "./components/BottomNav";
import { AIDock } from "./components/oryxa/AIDock";
import Index from "./pages/Index";
import Today from "./pages/Today";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import Automation from "./pages/Automation";
import AI from "./pages/AI";
import Diagnostics from "./pages/Diagnostics";
import Seed from "./pages/Seed";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Assistant from "./pages/Assistant";
import Calendar from "./pages/Calendar";
import CalendarFull from "./pages/CalendarFull";
import CalendarSimple from "./pages/CalendarSimple";
import CalendarSettings from "./pages/CalendarSettings";
import PublicBookingPage from "./pages/PublicBookingPage";

import Inbox from "./pages/Inbox";
import SettingsExternal from "./pages/SettingsExternal";
import SettingsNotifications from "./pages/SettingsNotifications";
import SettingsPrayer from "./pages/SettingsPrayer";
import PlannerChat from "./pages/PlannerChat";
import OAuthGoogle from "./pages/OAuthGoogle";
import NotFound from "./pages/NotFound";
import PrivacyCenter from "./pages/PrivacyCenter";
import FlagsConsole from "./pages/FlagsConsole";
import EngagementDashboard from "./pages/EngagementDashboard";
import GoLiveDashboard from "./pages/GoLiveDashboard";
import AdminAutopilot from "./pages/AdminAutopilot";
import Conflicts from "./pages/Conflicts";
import TestConflicts from "./pages/TestConflicts";
import Expenses from "./pages/Expenses";
import TodayWHOOP from "./pages/TodayWHOOP";
import Settings from "./pages/Settings";
import GlancesSettings from "./pages/GlancesSettings";
import { Protected } from "./components/Protected";
import { useAutopilotNotifications } from "./hooks/useAutopilotNotifications";

const queryClient = new QueryClient();

function AppContent() {
  useAutopilotNotifications();
  const location = useLocation();
  const { i18n } = useTranslation();
  
  // Apply RTL/LTR on mount
  useEffect(() => {
    const currentLang = i18n.language || 'ar';
    const dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', currentLang);
  }, [i18n.language]);
  
  // Hide navigation on auth pages
  const isAuthPage = location.pathname === '/auth' || location.pathname === '/auth/callback';
  
  return (
    <>
      {!isAuthPage && <Navigation />}
      <div className={isAuthPage ? '' : 'pb-20'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Routes location={location}>
        <Route path="/" element={<Index />} />
        <Route path="/today" element={<Protected><Today /></Protected>} />
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
        <Route path="/planner" element={<Protected><PlannerChat /></Protected>} />
        <Route path="/conflicts" element={<Protected><Conflicts /></Protected>} />
        <Route path="/test-conflicts" element={<Protected><TestConflicts /></Protected>} />
        <Route path="/oauth/google" element={<OAuthGoogle />} />
        <Route path="/admin/autopilot" element={<Protected><AdminAutopilot /></Protected>} />
        <Route path="/diagnostics" element={<Protected><Diagnostics /></Protected>} />
        <Route path="/seed" element={<Seed />} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/expenses" element={<Protected><Expenses /></Protected>} />
        <Route path="/privacy" element={<Protected><PrivacyCenter /></Protected>} />
        <Route path="/flags" element={<Protected><FlagsConsole /></Protected>} />
        <Route path="/engagement" element={<Protected><EngagementDashboard /></Protected>} />
        <Route path="/golive" element={<Protected><GoLiveDashboard /></Protected>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      {!isAuthPage && <BottomNav />}
      {!isAuthPage && <AIDock />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
              </AIProvider>
            </DateProvider>
          </SettingsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
