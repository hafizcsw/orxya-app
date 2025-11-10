import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import { setStorageItem } from '@/lib/capacitor-storage';

const languages = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { updateSettings } = useSettings();
  const [isChanging, setIsChanging] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (langCode: string) => {
    if (isChanging || langCode === i18n.language) return;
    
    setIsChanging(true);
    
    try {
      console.log('[LanguageSwitcher] Changing language to:', langCode);
      
      // 1. Save to Capacitor Storage (works for both web and native)
      await setStorageItem('i18nextLng', langCode);
      
      // 2. Change i18n language
      await i18n.changeLanguage(langCode);
      
      // 3. Update HTML attributes immediately
      const dir = langCode === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('lang', langCode);
      document.documentElement.setAttribute('dir', dir);
      document.body.setAttribute('dir', dir);
      
      // 4. Update settings in database (non-blocking)
      updateSettings({ language: langCode }).catch(err => {
        console.error('[LanguageSwitcher] Failed to save to DB:', err);
      });
      
      // 5. Dispatch event for components to re-render
      window.dispatchEvent(new Event('languagechange'));
      
      // 6. Force full re-render with reload (needed for proper RTL/LTR application)
      setTimeout(() => {
        window.location.reload();
      }, 300);
      
      toast.success('تم تغيير اللغة / Language changed');
      
    } catch (error) {
      console.error('[LanguageSwitcher] Failed to change language:', error);
      toast.error('فشل تغيير اللغة / Failed to change language');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 transition-all duration-200 hover:scale-105" 
          disabled={isChanging}
        >
          <Globe className={`w-4 h-4 ${isChanging ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{currentLanguage.name}</span>
          <span className="text-lg">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-card/95 backdrop-blur-xl border-border/50 shadow-xl z-[100]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="gap-2 cursor-pointer transition-colors duration-200"
            disabled={isChanging}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {i18n.language === lang.code && (
              <span className="ml-auto text-primary animate-fade-in">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
