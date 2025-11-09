import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function MobileDownloadBanner() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Check if app is already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    if (isStandalone || isIOSStandalone) {
      // App is installed, don't show banner
      return;
    }

    // Check if banner was dismissed
    const dismissed = localStorage.getItem('download_banner_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid || window.innerWidth < 768;

    if (isMobile) {
      setIsVisible(true);
      if (isIOS) {
        setDeviceType('ios');
      } else if (isAndroid) {
        setDeviceType('android');
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('download_banner_dismissed', 'true');
  };

  const handleDownload = () => {
    navigate('/install');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary/95 to-primary-glow/95 backdrop-blur-lg shadow-lg"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-background/20 backdrop-blur-sm flex items-center justify-center">
                  <Download className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-foreground truncate">
                    {t('downloadApp.bannerTitle')}
                  </p>
                  <p className="text-xs text-primary-foreground/80 truncate">
                    {deviceType === 'ios' && t('downloadApp.bannerSubtitleIOS')}
                    {deviceType === 'android' && t('downloadApp.bannerSubtitleAndroid')}
                    {deviceType === 'other' && t('downloadApp.bannerSubtitleOther')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleDownload}
                  className="bg-background text-primary hover:bg-background/90 shadow-lg h-8 px-4 text-xs font-semibold"
                >
                  {t('downloadApp.download')}
                </Button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg hover:bg-background/20 transition-colors"
                  aria-label={t('common.close')}
                >
                  <X className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
