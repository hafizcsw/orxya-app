import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, CheckCircle2, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Install() {
  const navigate = useNavigate();
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
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">تثبيت Oryxa</h1>
          <p className="text-muted-foreground text-lg">
            ثبّت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت
          </p>
        </div>

        {/* Status Card */}
        {isInstalled ? (
          <Card className="p-6 bg-green-500/10 border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  ✅ التطبيق مثبت بنجاح!
                </h3>
                <p className="text-sm text-muted-foreground">
                  يمكنك الآن استخدام Oryxa من الشاشة الرئيسية
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/today')} 
              className="w-full mt-4"
            >
              الذهاب إلى التطبيق
            </Button>
          </Card>
        ) : (
          <>
            {/* Android/Desktop Install Button */}
            {platform !== 'ios' && isInstallable && (
              <Card className="p-6 bg-primary/10 border-primary/20">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Download className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        جاهز للتثبيت!
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        اضغط الزر أدناه لتثبيت التطبيق
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleInstallClick} 
                    className="w-full"
                    size="lg"
                  >
                    <Download className="w-5 h-5 ml-2" />
                    تثبيت التطبيق الآن
                  </Button>
                </div>
              </Card>
            )}

            {/* iOS Instructions */}
            {platform === 'ios' && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-8 h-8 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      تثبيت على iOS (آيفون/آيباد)
                    </h3>
                  </div>
                  
                  <ol className="space-y-3 text-foreground list-decimal list-inside">
                    <li>اضغط على زر <strong>"المشاركة"</strong> 📤 في Safari</li>
                    <li>اسحب للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></li>
                    <li>اضغط <strong>"إضافة"</strong> في الزاوية العلوية اليمنى</li>
                    <li>سيظهر التطبيق على شاشتك الرئيسية! 🎉</li>
                  </ol>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>ملاحظة:</strong> يجب استخدام متصفح Safari لتثبيت التطبيق على iOS
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Android Manual Instructions */}
            {platform === 'android' && !isInstallable && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-8 h-8 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      تثبيت على أندرويد
                    </h3>
                  </div>
                  
                  <ol className="space-y-3 text-foreground list-decimal list-inside">
                    <li>اضغط على قائمة Chrome (⋮) في الأعلى</li>
                    <li>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> أو <strong>"تثبيت التطبيق"</strong></li>
                    <li>اضغط <strong>"تثبيت"</strong> للتأكيد</li>
                    <li>سيظهر التطبيق على شاشتك الرئيسية! 🎉</li>
                  </ol>
                </div>
              </Card>
            )}

            {/* Desktop Instructions */}
            {platform === 'desktop' && !isInstallable && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-8 h-8 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      تثبيت على الكمبيوتر
                    </h3>
                  </div>
                  
                  <ol className="space-y-3 text-foreground list-decimal list-inside">
                    <li>ابحث عن أيقونة <strong>"تثبيت"</strong> في شريط العنوان</li>
                    <li>أو اضغط على القائمة (⋮) واختر <strong>"تثبيت Oryxa"</strong></li>
                    <li>اضغط <strong>"تثبيت"</strong> للتأكيد</li>
                  </ol>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 يعمل التثبيت على Chrome و Edge و Brave
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Features Card */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            🌟 مميزات التطبيق المثبت
          </h3>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>وصول سريع من الشاشة الرئيسية مثل التطبيقات الأخرى</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>يعمل بدون إنترنت - يمكنك استخدامه في أي مكان</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>فتح أسرع وتجربة أكثر سلاسة</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>شاشة كاملة بدون شريط المتصفح</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>استهلاك أقل للبطارية والذاكرة</span>
            </li>
          </ul>
        </Card>

        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => navigate('/')} 
          className="w-full"
        >
          العودة للصفحة الرئيسية
        </Button>
      </div>
    </div>
  );
}
