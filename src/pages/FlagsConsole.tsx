// Epic 10: Feature Flags Console
import { useState, useEffect } from "react";
import { Flag, Users, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface FlagState {
  key: string;
  globalValue: boolean;
  userOverride?: boolean;
  description?: string;
}

export default function FlagsConsole() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FlagState[]>([]);
  const [pilotCohort, setPilotCohort] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFlags();
    loadPilotStatus();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load global flags
      const { data: globalFlags } = await supabase
        .from("feature_flags")
        .select("*");

      // Load user overrides
      const { data: userFlags } = await supabase.rpc("get_user_flags", {
        p_user_id: user.id
      });

      const flagMap = new Map<string, FlagState>();

      // Process global flags
      globalFlags?.forEach(f => {
        flagMap.set(f.key, {
          key: f.key,
          globalValue: f.enabled ?? false,
          userOverride: undefined
        });
      });

      // Apply user overrides
      if (userFlags) {
        Object.entries(userFlags as Record<string, boolean>).forEach(([key, value]) => {
          const existing = flagMap.get(key);
          if (existing) {
            existing.userOverride = value;
          }
        });
      }

      setFlags(Array.from(flagMap.values()));
    } catch (error) {
      console.error("Failed to load flags:", error);
      toast({
        title: "Error",
        description: "Failed to load feature flags",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPilotStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("pilot_users")
        .select("cohort")
        .eq("user_id", user.id)
        .single();

      setPilotCohort(data?.cohort ?? null);
    } catch (error) {
      // User not in pilot program
      setPilotCohort(null);
    }
  };

  const toggleUserOverride = async (key: string, currentOverride: boolean | undefined) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    try {
      // If override exists, toggle it; otherwise set to opposite of global
      const flag = flags.find(f => f.key === key);
      const newValue = currentOverride !== undefined 
        ? !currentOverride 
        : !flag?.globalValue;

      const { error } = await supabase.rpc("set_user_flag", {
        p_user_id: user.id,
        p_key: key,
        p_value: newValue
      });

      if (error) throw error;

      setFlags(prev => prev.map(f => 
        f.key === key ? { ...f, userOverride: newValue } : f
      ));

      toast({
        title: "Flag Updated",
        description: `User override for ${key} set to ${newValue}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update flag",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const joinPilot = async (cohort: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("pilot_users")
        .upsert({
          user_id: user.id,
          cohort
        });

      if (error) throw error;

      setPilotCohort(cohort);
      toast({
        title: "Pilot Status Updated",
        description: `You are now in the ${cohort} cohort`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update pilot status",
        variant: "destructive"
      });
    }
  };

  const leavePilot = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("pilot_users")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setPilotCohort(null);
      toast({
        title: "Left Pilot Program",
        description: "You are no longer in any pilot cohort",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave pilot program",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Feature Flags Console</h1>
          <p className="text-muted-foreground">Manage feature rollout and user overrides</p>
        </div>
      </div>

      {/* Pilot Program */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Pilot Program</CardTitle>
            </div>
            {pilotCohort && (
              <Badge variant="secondary">{pilotCohort}</Badge>
            )}
          </div>
          <CardDescription>
            Join early access cohorts for staged rollouts
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          {!pilotCohort ? (
            <>
              <Button onClick={() => joinPilot("internal")} variant="outline">
                Join Internal
              </Button>
              <Button onClick={() => joinPilot("5pct")} variant="outline">
                Join 5%
              </Button>
              <Button onClick={() => joinPilot("25pct")} variant="outline">
                Join 25%
              </Button>
            </>
          ) : (
            <Button onClick={leavePilot} variant="destructive">
              Leave Pilot
            </Button>
          )}
          <Button onClick={loadPilotStatus} variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Global values apply to all users. User overrides apply only to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags.map(flag => {
            const effectiveValue = flag.userOverride !== undefined 
              ? flag.userOverride 
              : flag.globalValue;
            const hasOverride = flag.userOverride !== undefined;

            return (
              <div key={flag.key} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="font-mono text-sm">{flag.key}</Label>
                    {hasOverride && (
                      <Badge variant="outline" className="text-xs">Override</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Global: {flag.globalValue ? "ON" : "OFF"}</span>
                    <span>Effective: {effectiveValue ? "ON" : "OFF"}</span>
                  </div>
                </div>
                <Switch
                  checked={effectiveValue}
                  onCheckedChange={() => toggleUserOverride(flag.key, flag.userOverride)}
                  disabled={saving}
                />
              </div>
            );
          })}

          {flags.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No feature flags configured
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
