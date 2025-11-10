import { useState, useEffect } from 'react';

interface PWAUpdateState {
  updateAvailable: boolean;
  updateApp: () => void;
}

export function usePWAUpdate(): PWAUpdateState {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for controller change (new SW took over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Check for updates periodically
    navigator.serviceWorker.ready.then(reg => {
      reg.update(); // Check on mount
      const interval = setInterval(() => reg.update(), 60_000 * 15); // Every 15 min
      return () => clearInterval(interval);
    });

    // Listen for updates
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;

      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;

        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            setWaitingWorker(sw);
          }
        });
      });
    });
  }, []);

  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return { updateAvailable, updateApp };
}
