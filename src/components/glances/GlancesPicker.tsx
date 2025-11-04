import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ALL_GLANCE_TYPES = [
  { kind: "next_task", label: "Next Task" },
  { kind: "prayer_next", label: "Next Prayer" },
  { kind: "steps_today", label: "Steps Today" },
  { kind: "work_progress", label: "Work Progress" },
  { kind: "study_progress", label: "Study Progress" },
  { kind: "conflicts_badge", label: "Conflicts" },
  { kind: "focus_toggle", label: "Focus Toggle" }
];

export function GlancesPicker() {
  const [layout, setLayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLayout();
  }, []);

  async function loadLayout() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pref } = await supabase
        .from("user_glances")
        .select("layout")
        .eq("user_id", user.id)
        .maybeSingle();

      setLayout(
        pref?.layout ?? {
          slots: ALL_GLANCE_TYPES.map((g, i) => ({
            id: `slot-${i}`,
            kind: g.kind,
            visible: i < 4
          })),
          theme: "glass"
        }
      );
    } catch (e) {
      console.error('[GlancesPicker] Error loading:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveLayout() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_glances").upsert({
        user_id: user.id,
        layout
      });

      console.log('[GlancesPicker] Layout saved');
    } catch (e) {
      console.error('[GlancesPicker] Error saving:', e);
    } finally {
      setSaving(false);
    }
  }

  function toggleGlance(kind: string) {
    setLayout((prev: any) => ({
      ...prev,
      slots: prev.slots.map((s: any) =>
        s.kind === kind ? { ...s, visible: !s.visible } : s
      )
    }));
  }

  if (loading) {
    return <div className="p-4 text-sm opacity-50">Loading...</div>;
  }

  if (!layout) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm font-medium opacity-70">Customize Glances</div>
      
      <div className="flex flex-wrap gap-2">
        {ALL_GLANCE_TYPES.map(({ kind, label }) => {
          const slot = layout.slots.find((s: any) => s.kind === kind);
          const isVisible = !!slot?.visible;

          return (
            <Badge
              key={kind}
              variant={isVisible ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5"
              onClick={() => toggleGlance(kind)}
            >
              {label}
            </Badge>
          );
        })}
      </div>

      <Button
        onClick={saveLayout}
        disabled={saving}
        className="w-full"
      >
        {saving ? "Saving..." : "Save Layout"}
      </Button>
    </div>
  );
}
