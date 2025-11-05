import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlanceTile } from "./GlanceTile";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from "@/lib/utils";

interface GlancesFeed {
  now: string;
  glances: {
    next_task: any;
    prayer_next: any;
    steps_today: any;
    work_progress: any;
    study_progress: any;
    conflicts_badge: any;
    focus_toggle: any;
  };
}

export function GlancesBar() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<GlancesFeed | null>(null);
  const [layout, setLayout] = useState<any>(null);
  const [focus, setFocus] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    dragFree: true,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  async function loadFeed() {
    try {
      const { data, error } = await supabase.functions.invoke('glances-feed', {
        body: {}
      });

      if (error) {
        console.error('[GlancesBar] Error fetching feed:', error);
        return;
      }

      setFeed(data);

      // Load user layout preferences
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pref } = await supabase
          .from("user_glances")
          .select("layout")
          .eq("user_id", user.id)
          .maybeSingle();

        setLayout(
          pref?.layout ?? {
            slots: [
              { id: "top-hero", kind: "next_task", visible: true },
              { id: "row-1-a", kind: "prayer_next", visible: true },
              { id: "row-1-b", kind: "steps_today", visible: true },
              { id: "row-2-a", kind: "work_progress", visible: true },
              { id: "row-2-b", kind: "conflicts_badge", visible: true },
              { id: "row-3-a", kind: "focus_toggle", visible: true }
            ],
            theme: "glass"
          }
        );

        // Load focus state
        const { data: fs } = await supabase
          .from("user_focus_state")
          .select("active")
          .eq("user_id", user.id)
          .maybeSingle();

        setFocus(!!fs?.active);
      }
    } catch (e) {
      console.error('[GlancesBar] Exception:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();

    // Refresh every 60 seconds while page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadFeed();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  async function toggleFocus(active: boolean) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("user_focus_state").upsert({
        user_id: user.id,
        active,
        updated_at: new Date().toISOString()
      });

      setFocus(active);
    } catch (e) {
      console.error('[GlancesBar] Error toggling focus:', e);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3">
        <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (!layout || !feed) {
    return null;
  }

  const mapData = (kind: string) => {
    if (kind === "focus_toggle") return { active: focus };
    return (feed.glances as any)[kind] ?? null;
  };

  const visibleSlots = layout.slots.filter((s: any) => s.visible);

  return (
    <div className="relative">
      {/* Desktop Grid View */}
      <div className="hidden md:grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        {visibleSlots.map((slot: any) => (
          <GlanceTile
            key={slot.id}
            kind={slot.kind}
            data={mapData(slot.kind)}
            onOpen={() => {
              if (slot.kind === "next_task" && feed.glances.next_task) {
                navigate('/calendar');
              } else if (slot.kind === "conflicts_badge") {
                navigate('/conflicts');
              }
            }}
            onToggleFocus={toggleFocus}
          />
        ))}
      </div>

      {/* Mobile Carousel View */}
      <div className="md:hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3 touch-pan-y">
            {visibleSlots.map((slot: any, index: number) => (
              <div 
                key={slot.id} 
                className="flex-[0_0_85%] min-w-0"
              >
                <GlanceTile
                  kind={slot.kind}
                  data={mapData(slot.kind)}
                  onOpen={() => {
                    if (slot.kind === "next_task" && feed.glances.next_task) {
                      navigate('/calendar');
                    } else if (slot.kind === "conflicts_badge") {
                      navigate('/conflicts');
                    }
                  }}
                  onToggleFocus={toggleFocus}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Indicators */}
        {scrollSnaps.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === selectedIndex 
                    ? "w-8 bg-primary" 
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
