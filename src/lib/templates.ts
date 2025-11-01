import { supabase } from '@/integrations/supabase/client';

export type TemplateKey = 'work_after_maghrib' | 'gym_after_isha' | 'deep_work_morning' | 'balanced_day';

export interface ApplyTemplateOptions {
  template_key: TemplateKey;
  date?: string; // YYYY-MM-DD
  tags?: string[];
}

export interface TemplateResult {
  ok: boolean;
  inserted: number;
  items: any[];
  error?: string;
}

/**
 * Apply a smart template to create a batch of events
 */
export async function applyTemplate(options: ApplyTemplateOptions): Promise<TemplateResult> {
  const { data, error } = await supabase.functions.invoke('templates', {
    body: options,
  });

  if (error) {
    console.error('Template error:', error);
    throw error;
  }

  return data as TemplateResult;
}

/**
 * Get summary of tasks and events for a period
 */
export async function summarizePeriod(span: 'day' | 'week' | 'month', startIso?: string) {
  const { data, error } = await supabase.functions.invoke('summarize-period', {
    body: { span, start_iso: startIso },
  });

  if (error) {
    console.error('Summarize error:', error);
    throw error;
  }

  return data as { ok: boolean; summary: string; stats: any };
}
