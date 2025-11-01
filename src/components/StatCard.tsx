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
    tone === 'good' ? 'border-green-500 dark:border-green-700'
    : tone === 'bad' ? 'border-red-500 dark:border-red-700'
    : 'border-border';

  return (
    <div className={`rounded-2xl border-2 ${toneCls} p-4 shadow-sm bg-card`}>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </div>
  );
}
