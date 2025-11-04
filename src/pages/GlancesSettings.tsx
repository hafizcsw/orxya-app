import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getUserFlags, setUserFlag } from '@/lib/featureFlags';
import { GlancesPicker } from '@/components/glances/GlancesPicker';
import { Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GlancesSettings() {
  const navigate = useNavigate();
  const [glancesEnabled, setGlancesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    try {
      const flags = await getUserFlags();
      setGlancesEnabled(!!flags.ff_glances);
    } catch (e) {
      console.error('[GlancesSettings] Error loading flags:', e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleGlances(enabled: boolean) {
    try {
      setSaving(true);
      const success = await setUserFlag('ff_glances', enabled);
      if (success) {
        setGlancesEnabled(enabled);
      }
    } catch (e) {
      console.error('[GlancesSettings] Error toggling:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Protected>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
              >
                ← Back
              </Button>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Glances Settings
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Enable/Disable Glances */}
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Enable Glances</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Show quick insights on your Today page
                </p>
              </div>
              {loading ? (
                <div className="w-10 h-6 bg-muted animate-pulse rounded-full" />
              ) : (
                <Switch
                  checked={glancesEnabled}
                  onCheckedChange={toggleGlances}
                  disabled={saving}
                />
              )}
            </div>
          </GlassPanel>

          {/* Customize Layout */}
          {glancesEnabled && (
            <GlassPanel className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <SettingsIcon className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Customize Layout</h3>
              </div>
              <GlancesPicker />
            </GlassPanel>
          )}

          {/* Info */}
          <GlassPanel className="p-6 bg-primary/5">
            <h4 className="font-semibold mb-2">ℹ️ About Glances</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Quick view of your next tasks, prayers, and stats</li>
              <li>• Auto-refreshes every 60 seconds when page is visible</li>
              <li>• Battery-optimized with smart scheduling</li>
              <li>• Customize which cards you want to see</li>
            </ul>
          </GlassPanel>
        </div>
      </div>
    </Protected>
  );
}
