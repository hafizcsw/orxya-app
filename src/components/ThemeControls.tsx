import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { applyTheme, applyDensity, getSystemTheme, isSystemDarkMode } from '@/lib/theme';
import { track } from '@/lib/telemetry';
import { useUser } from '@/lib/auth';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function ThemeControls() {
  const { user } = useUser();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [accent, setAccent] = useState('#0ea5e9');
  const [saving, setSaving] = useState(false);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme());

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('theme_pref,density_pref,accent_color')
        .eq('id', user.id)
        .maybeSingle();
      const tp = (data?.theme_pref as any) || 'system';
      const dp = (data?.density_pref as any) || 'comfortable';
      const ac = data?.accent_color || '#0ea5e9';
      setTheme(tp);
      setDensity(dp);
      setAccent(ac);
      applyTheme(tp, ac);
      applyDensity(dp);
    })();
  }, [user?.id]);

  // الاستماع لتغييرات إعدادات النظام
  useEffect(() => {
    const handleSystemThemeChange = (e: CustomEvent) => {
      setSystemTheme(e.detail.theme);
      console.log('🔔 تم استقبال تغيير ثيم النظام:', e.detail.theme);
    };

    window.addEventListener('system-theme-changed', handleSystemThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('system-theme-changed', handleSystemThemeChange as EventListener);
    };
  }, []);

  async function save() {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        theme_pref: theme,
        density_pref: density,
        accent_color: accent,
      })
      .eq('id', user.id);
    applyTheme(theme, accent);
    applyDensity(density);
    track('ui_theme_saved', { theme, density });
    setSaving(false);
  }

  const getThemeIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4" />;
    }
    return theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {getThemeIcon()}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="border rounded-lg px-3 py-2 bg-background text-sm"
          >
            <option value="system">النظام</option>
            <option value="light">فاتح</option>
            <option value="dark">داكن</option>
          </select>
        </div>
        
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as any)}
          className="border rounded-lg px-3 py-2 bg-background text-sm"
        >
          <option value="comfortable">مريح</option>
          <option value="compact">مضغوط</option>
        </select>
        
        <input
          type="color"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="h-10 w-12 p-1 border rounded-lg cursor-pointer"
          title="اختر اللون المفضل"
        />
        
        <button 
          onClick={save} 
          className="px-4 py-2 rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {saving ? '⏳ جاري الحفظ...' : '💾 حفظ المظهر'}
        </button>
      </div>
      
      {theme === 'system' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <Monitor className="w-3.5 h-3.5" />
          <span>
            يتبع إعدادات النظام حاليًا: 
            <strong className="ms-1 text-foreground">
              {systemTheme === 'dark' ? '🌙 وضع مظلم' : '☀️ وضع نهاري'}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}
