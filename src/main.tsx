import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOnlineSync } from "./lib/sync";
import { initSentry, initPostHog } from "./lib/telemetry";

// Initialize telemetry
initSentry();
initPostHog();

// Initialize online sync
initOnlineSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
