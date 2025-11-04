import React, { useEffect, useState } from "react";
import { Clock, MapPin, Footprints, Briefcase, BookOpen, AlertCircle, Focus } from "lucide-react";

type NextTask = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  countdown_sec: number;
};

type Prayer = {
  name: string;
  time: string;
  in_sec: number;
};

interface GlanceTileProps {
  kind:
    | "next_task"
    | "prayer_next"
    | "steps_today"
    | "work_progress"
    | "study_progress"
    | "conflicts_badge"
    | "focus_toggle";
  data: any;
  onOpen?: () => void;
  onToggleFocus?: (active: boolean) => void;
}

export function GlanceTile({ kind, data, onOpen, onToggleFocus }: GlanceTileProps) {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (kind === "next_task" && data) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((Date.parse(data.start_at) - Date.now()) / 1000));
        setCountdown(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }

    if (kind === "prayer_next" && data) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((Date.parse(data.time) - Date.now()) / 1000));
        setCountdown(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [kind, data]);

  const cardBase =
    "rounded-2xl shadow-lg border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-4 transition-all hover:scale-105 hover:border-white/20 cursor-pointer";

  // Next Task
  if (kind === "next_task") {
    if (!data) {
      return (
        <div className={cardBase + " opacity-50"}>
          <div className="flex items-center gap-2 text-xs opacity-70">
            <Clock className="w-3 h-3" />
            <span>Next</span>
          </div>
          <div className="font-semibold mt-1">لا يوجد أحداث</div>
        </div>
      );
    }

    const d = data as NextTask;
    const hours = Math.floor(countdown / 3600);
    const mins = Math.floor((countdown % 3600) / 60);
    const secs = countdown % 60;

    return (
      <div className={cardBase} onClick={onOpen}>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Clock className="w-3 h-3" />
          <span>Next</span>
        </div>
        <div className="font-semibold mt-1 truncate">{d.title}</div>
        <div className="text-sm mt-2 tabular-nums font-mono text-primary">
          {hours > 0 ? `${hours}h ` : ''}
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
      </div>
    );
  }

  // Prayer Next
  if (kind === "prayer_next") {
    if (!data) {
      return (
        <div className={cardBase + " opacity-50"}>
          <div className="flex items-center gap-2 text-xs opacity-70">
            <MapPin className="w-3 h-3" />
            <span>Prayer</span>
          </div>
          <div className="font-semibold mt-1">لا توجد بيانات</div>
        </div>
      );
    }

    const d = data as Prayer;
    const hours = Math.floor(countdown / 3600);
    const mins = Math.floor((countdown % 3600) / 60);
    const secs = countdown % 60;
    const label = d.name.charAt(0).toUpperCase() + d.name.slice(1);

    return (
      <div className={cardBase}>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <MapPin className="w-3 h-3" />
          <span>Prayer</span>
        </div>
        <div className="font-semibold mt-1">{label}</div>
        <div className="text-sm mt-2 tabular-nums font-mono text-accent">
          {hours > 0 ? `${hours}h ` : ''}
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
      </div>
    );
  }

  // Steps Today
  if (kind === "steps_today") {
    const steps = data?.steps ?? 0;
    return (
      <div className={cardBase}>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Footprints className="w-3 h-3" />
          <span>Steps</span>
        </div>
        <div className="text-2xl font-bold tabular-nums mt-2">{steps.toLocaleString()}</div>
      </div>
    );
  }

  // Work Progress
  if (kind === "work_progress") {
    const minutes = data?.minutes ?? 0;
    const hours = (minutes / 60).toFixed(1);
    return (
      <div className={cardBase}>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Briefcase className="w-3 h-3" />
          <span>Work</span>
        </div>
        <div className="text-2xl font-bold tabular-nums mt-2">{hours}h</div>
        <div className="text-xs opacity-60">{minutes} min</div>
      </div>
    );
  }

  // Study Progress
  if (kind === "study_progress") {
    const minutes = data?.minutes ?? 0;
    const hours = (minutes / 60).toFixed(1);
    return (
      <div className={cardBase}>
        <div className="flex items-center gap-2 text-xs opacity-70">
          <BookOpen className="w-3 h-3" />
          <span>Study</span>
        </div>
        <div className="text-2xl font-bold tabular-nums mt-2">{hours}h</div>
        <div className="text-xs opacity-60">{minutes} min</div>
      </div>
    );
  }

  // Conflicts Badge
  if (kind === "conflicts_badge") {
    const count = data?.count ?? 0;
    return (
      <div className={cardBase}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold">Conflicts</span>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full text-sm tabular-nums font-bold ${
              count > 0
                ? "bg-red-500/90 text-white"
                : "bg-white/10 text-foreground/50"
            }`}
          >
            {count}
          </div>
        </div>
      </div>
    );
  }

  // Focus Toggle
  if (kind === "focus_toggle") {
    const active = !!data?.active;
    return (
      <button
        className={`${cardBase} w-full text-left ${
          active ? "ring-2 ring-primary/60 bg-primary/10" : ""
        }`}
        onClick={() => onToggleFocus?.(!active)}
      >
        <div className="flex items-center gap-2">
          <Focus className="w-4 h-4" />
          <span className="font-semibold">{active ? "Focus: ON" : "Focus: OFF"}</span>
        </div>
        <div className="text-xs opacity-70 mt-1">
          {active ? "Notifications minimized" : "Tap to focus"}
        </div>
      </button>
    );
  }

  return (
    <div className={cardBase + " opacity-30"}>
      <div className="text-sm">—</div>
    </div>
  );
}
