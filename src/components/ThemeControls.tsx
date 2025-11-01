import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { applyTheme, applyDensity } from '@/lib/theme';
import { track } from '@/lib/telemetry';
import { useUser } from '@/lib/auth';

export default function ThemeControls() {
  const { user } = useUser();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [accent, setAccent] = useState('#0ea5e9');
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as any)}
        className="border rounded-lg px-2 py-1 bg-background"
      >
        <option value="system">النظام</option>
        <option value="light">فاتح</option>
        <option value="dark">داكن</option>
      </select>
      <select
        value={density}
        onChange={(e) => setDensity(e.target.value as any)}
        className="border rounded-lg px-2 py-1 bg-background"
      >
        <option value="comfortable">مريح</option>
        <option value="compact">مضغوط</option>
      </select>
      <input
        type="color"
        value={accent}
        onChange={(e) => setAccent(e.target.value)}
        className="h-8 w-10 p-0 border rounded"
      />
      <button onClick={save} className="px-3 py-1 rounded-lg border bg-primary text-primary-foreground">
        {saving ? '...' : 'حفظ المظهر'}
      </button>
    </div>
  );
}
