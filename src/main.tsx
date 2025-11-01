import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOnlineSync } from "./lib/sync";
import { initSentry, initPostHog } from "./lib/telemetry";

// Wrapper component to initialize after mount
function AppWrapper() {
  useEffect(() => {
    // Initialize telemetry after React is ready
    initSentry();
    initPostHog();
    // Initialize online sync
    initOnlineSync();
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>
);
