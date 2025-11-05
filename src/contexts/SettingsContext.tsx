import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserSettings } from '@/types/settings';
import { formatTime as formatTimeHelper, formatDate as formatDateHelper } from '@/lib/time';
import i18n from '@/i18n';

interface SettingsContextValue {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  formatTime: (date: Date | string) => string;
  formatDate: (date: Date | string) => string;
  reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // For unauthenticated users: detect browser language
        const browserLang = navigator.language.split('-')[0];
        const supportedLang = ['ar', 'en', 'es'].includes(browserLang) ? browserLang : 'ar';
        await i18n.changeLanguage(supportedLang);
        setSettings(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setSettings(data as unknown as UserSettings);
      
      // If user has no saved language, detect from browser
      if (!data.language) {
        const browserLang = navigator.language.split('-')[0];
        const supportedLang = ['ar', 'en', 'es'].includes(browserLang) ? browserLang : 'ar';
        await updateSettings({ language: supportedLang });
        await i18n.changeLanguage(supportedLang);
      } else {
        await i18n.changeLanguage(data.language);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // If language changed, update i18n
      if (updates.language) {
        await i18n.changeLanguage(updates.language);
      }

      setSettings(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const formatTime = (date: Date | string) => {
    if (!settings) return formatTimeHelper(date, '12h', 'ar');
    return formatTimeHelper(date, settings.time_format, settings.language);
  };

  const formatDate = (date: Date | string) => {
    if (!settings) return formatDateHelper(date, 'DD/MM/YYYY', 'ar');
    return formatDateHelper(date, settings.date_format, settings.language);
  };

  useEffect(() => {
    loadSettings();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadSettings();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        formatTime,
        formatDate,
        reloadSettings: loadSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
