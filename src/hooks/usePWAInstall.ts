import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Extend Window interface
declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    console.log('🔍 [usePWAInstall] Hook initialized');
    
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const installed = isStandalone || isIOSStandalone;
      
      console.log('📱 [usePWAInstall] Install status:', {
        isStandalone,
        isIOSStandalone,
        installed
      });
      
      setIsInstalled(installed);
    };

    checkInstalled();

    // Check if prompt already exists (set by main.tsx)
    if (window.deferredPrompt) {
      console.log('✅ [usePWAInstall] Found existing deferred prompt');
      setDeferredPrompt(window.deferredPrompt);
      setIsInstallable(true);
    }

    // Listen for install prompt via custom events
    const handlePWAInstallable = () => {
      console.log('🎯 [usePWAInstall] PWA installable event received');
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        setIsInstallable(true);
      }
    };

    // Listen for successful install via custom events
    const handlePWAInstalled = () => {
      console.log('✅ [usePWAInstall] PWA installed event received');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
      window.deferredPrompt = null;
    };

    window.addEventListener('pwa-installable', handlePWAInstallable);
    window.addEventListener('pwa-installed', handlePWAInstalled);

    // Log Service Worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        console.log('🔧 [usePWAInstall] Service Worker:', reg ? 'Registered ✅' : 'Not registered ❌');
      });
    }

    return () => {
      window.removeEventListener('pwa-installable', handlePWAInstallable);
      window.removeEventListener('pwa-installed', handlePWAInstalled);
    };
  }, []);

  const installApp = async () => {
    console.log('🚀 [usePWAInstall] Install attempt started');
    
    if (!deferredPrompt) {
      console.error('❌ [usePWAInstall] No deferred prompt available');
      return false;
    }

    try {
      console.log('💬 [usePWAInstall] Showing install prompt...');
      await deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log('👤 [usePWAInstall] User choice:', outcome);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        window.deferredPrompt = null;
        console.log('✅ [usePWAInstall] Installation accepted');
        return true;
      }
      
      console.log('❌ [usePWAInstall] Installation dismissed');
      return false;
    } catch (error) {
      console.error('❌ [usePWAInstall] Installation error:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    installApp
  };
}
