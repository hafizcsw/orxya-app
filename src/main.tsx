import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initOnlineSync } from "./lib/sync";
import { initTelemetry } from "./lib/telemetry";
import { startDailyRescheduler } from "./lib/notify";

initOnlineSync();
void initTelemetry();
startDailyRescheduler();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
