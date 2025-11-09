import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle2, Smartphone, Monitor, Share2, MoreVertical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Install() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else setPlatform('desktop');

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error('التثبيت غير متاح حالياً');
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
        toast.success('تم تثبيت التطبيق بنجاح! 🎉');
      }
    } catch (error) {
      console.error('Error installing:', error);
      toast.error('حدث خطأ أثناء التثبيت');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-bold text-foreground">{t('install.title')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('install.subtitle')}
          </p>
        </motion.div>

        {/* Status Card */}
        {isInstalled ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-6 bg-green-500/10 border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    ✅ {t('install.alreadyInstalled')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('install.installedDescription')}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/today')} 
                className="w-full mt-4"
              >
                {t('install.goToApp')}
              </Button>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Direct Install Button for Android/Desktop */}
            {isInstallable && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-primary/20 rounded-2xl">
                        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foreground mb-1">
                          {t('install.readyToInstall')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          اضغط الزر أدناه للتثبيت المباشر بنقرة واحدة
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleInstallClick} 
                      className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                      size="lg"
                    >
                      <Download className="w-6 h-6 ml-3" />
                      {t('install.installNow')}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* iOS Instructions */}
            {platform === 'ios' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-6">
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {t('install.iosTitle')}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.iosStep1')}</p>
                          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                            <Share2 className="w-4 h-4" />
                            <span className="text-xs">Safari &gt; Share button</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          2
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.iosStep2')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.iosStep3')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.iosStep4')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                      <p className="text-sm text-foreground">
                        💡 <strong>ملاحظة:</strong> {t('install.iosNote')}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Android Manual Instructions */}
            {platform === 'android' && !isInstallable && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-6">
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {t('install.androidTitle')}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.androidStep1')}</p>
                          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                            <MoreVertical className="w-4 h-4" />
                            <span className="text-xs">Chrome Menu</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          2
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.androidStep2')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.androidStep3')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.androidStep4')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Desktop Instructions */}
            {platform === 'desktop' && !isInstallable && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-6">
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-8 h-8 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {t('install.desktopTitle')}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.desktopStep1')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          2
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.desktopStep2')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 items-start p-4 bg-accent/30 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{t('install.desktopStep3')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                      <p className="text-sm text-foreground">
                        💡 {t('install.desktopNote')}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </>
        )}

        {/* Features Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              🌟 {t('install.featuresTitle')}
            </h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{t('install.feature1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{t('install.feature2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{t('install.feature3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{t('install.feature4')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{t('install.feature5')}</span>
              </li>
            </ul>
          </Card>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            variant="outline" 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            {t('install.backToHome')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
