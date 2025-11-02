import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
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
import OAuthGoogle from "./pages/OAuthGoogle";
import NotFound from "./pages/NotFound";
import { Protected } from "./components/Protected";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/today" element={<Protected><Today /></Protected>} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/reports" element={<Protected><Reports /></Protected>} />
          <Route path="/automation" element={<Protected><Automation /></Protected>} />
          <Route path="/ai" element={<AI />} />
          <Route path="/assistant" element={<Protected><Assistant /></Protected>} />
          <Route path="/calendar" element={<Protected><Calendar /></Protected>} />
          <Route path="/calendar-full" element={<Protected><CalendarFull /></Protected>} />
          <Route path="/oauth/google" element={<OAuthGoogle />} />
          <Route path="/diagnostics" element={<Protected><Diagnostics /></Protected>} />
          <Route path="/seed" element={<Seed />} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
