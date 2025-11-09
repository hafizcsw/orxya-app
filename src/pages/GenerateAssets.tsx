import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GenerateAssets() {
  const [loading, setLoading] = useState(false);
  const [splashImage, setSplashImage] = useState<string | null>(null);
  const [iconImage, setIconImage] = useState<string | null>(null);

  const generateAssets = async () => {
    setLoading(true);
    try {
      // Generate Splash Screen
      const { data: splashData, error: splashError } = await supabase.functions.invoke('generate-app-assets', {
        body: {
          type: 'splash',
          prompt: 'Create a modern mobile app splash screen with a beautiful blue gradient background (from deep blue #0066CC at top to lighter blue #4D94FF at bottom). In the center, display the text "Oryxa" in elegant white sans-serif font (size 72pt, bold). The design should be clean, professional, and suitable for a productivity app. Dimensions: 2732x2732 pixels, centered composition.'
        }
      });

      if (splashError) throw splashError;
      setSplashImage(splashData.imageUrl);

      // Generate App Icon
      const { data: iconData, error: iconError } = await supabase.functions.invoke('generate-app-assets', {
        body: {
          type: 'icon',
          prompt: 'Create a modern, minimalist mobile app icon with a blue gradient background (circular or rounded square). Feature the letter "O" or "Oryxa" logo in white, centered, with a clean professional design. The icon should work well at small sizes on phone home screens. Dimensions: 1024x1024 pixels, simple and recognizable design.'
        }
      });

      if (iconError) throw iconError;
      setIconImage(iconData.imageUrl);

      toast.success('تم إنشاء الصور بنجاح!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('حدث خطأ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">توليد أصول التطبيق</h1>
      
      <Card className="p-6 mb-6">
        <p className="mb-4 text-muted-foreground">
          سيتم إنشاء شاشة البداية (Splash Screen) وأيقونة التطبيق باستخدام الذكاء الاصطناعي
        </p>
        
        <Button 
          onClick={generateAssets} 
          disabled={loading}
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري التوليد...
            </>
          ) : (
            'إنشاء الصور'
          )}
        </Button>
      </Card>

      {splashImage && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">شاشة البداية (Splash Screen)</h2>
          <img 
            src={splashImage} 
            alt="Splash Screen" 
            className="w-full max-w-md mx-auto rounded-lg shadow-lg mb-4"
          />
          <Button 
            onClick={() => downloadImage(splashImage, 'splash-screen.png')}
            variant="outline"
          >
            تحميل Splash Screen
          </Button>
        </Card>
      )}

      {iconImage && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">أيقونة التطبيق (App Icon)</h2>
          <img 
            src={iconImage} 
            alt="App Icon" 
            className="w-64 h-64 mx-auto rounded-lg shadow-lg mb-4"
          />
          <Button 
            onClick={() => downloadImage(iconImage, 'app-icon.png')}
            variant="outline"
          >
            تحميل App Icon
          </Button>
        </Card>
      )}

      {splashImage && iconImage && (
        <Card className="p-6 mt-6 bg-blue-50 dark:bg-blue-950">
          <h3 className="text-lg font-semibold mb-3">📋 الخطوات التالية:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>احفظ الصورتين على جهازك باستخدام الأزرار أعلاه</li>
            <li>استخدم أداة مثل <a href="https://www.appicon.co/" target="_blank" className="text-blue-600 underline">appicon.co</a> لتوليد جميع المقاسات المطلوبة</li>
            <li>ضع الملفات في المجلدات التالية:
              <ul className="list-disc list-inside mr-6 mt-2">
                <li><code>android/app/src/main/res/mipmap-*/ic_launcher.png</code></li>
                <li><code>android/app/src/main/res/drawable/splash.png</code></li>
              </ul>
            </li>
            <li>قم بتشغيل <code>npx cap sync</code></li>
          </ol>
        </Card>
      )}
    </div>
  );
}
