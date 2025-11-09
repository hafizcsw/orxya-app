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
      // Save to localStorage first for immediate persistence
      localStorage.setItem('i18nextLng', langCode);
      
      // Update settings in database first
      await updateSettings({ language: langCode });
      
      // Then change i18n language (this will trigger re-render)
      await i18n.changeLanguage(langCode);
      
      // Force page reload to ensure all components update
      window.location.reload();
      
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error('فشل تغيير اللغة / Failed to change language');
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={isChanging}>
          <Globe className="w-4 h-4" />
          <span className="hidden md:inline">{currentLanguage.name}</span>
          <span className="text-lg">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="gap-2 cursor-pointer"
            disabled={isChanging}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {i18n.language === lang.code && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
