import React from 'react';

export function StatCard({
  title,
  value,
  hint,
  tone = 'neutral',
}: {
  title: string;
  value: string | number;
  hint?: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const toneCls =
    tone === 'good' 
      ? 'border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10' 
      : tone === 'bad' 
      ? 'border-primary/30 bg-primary/5 shadow-primary/10'
      : 'border-border/50 shadow-lg';

  return (
    <div className={`rounded-3xl border-2 ${toneCls} p-6 bg-card transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground/80 mt-2">{hint}</div> : null}
    </div>
  );
}
