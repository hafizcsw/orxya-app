import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SeedRequestSchema = z.object({
  action: z.enum(['seed', 'rollback']),
  days: z.number().min(1).max(7).default(3),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default('2025-11-03'),
  tag: z.string().default('seed:oryxa-2025-11-03'),
});

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[seed-data] Request received');
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[seed-data] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const { action, days, startDate, tag } = SeedRequestSchema.parse(body);
    
    console.log(`[seed-data] Action: ${action}, Days: ${days}, Tag: ${tag}`);

    if (action === 'rollback') {
      return await handleRollback(supabase, user.id, tag);
    }

    return await handleSeed(supabase, user.id, days, startDate, tag);

  } catch (err) {
    console.error('[seed-data] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSeed(
  supabase: any,
  userId: string,
  days: number,
  startDate: string,
  tag: string
) {
  const results = {
    events: 0,
    financial: 0,
    health: 0,
  };

  const baseDate = new Date(startDate + 'T00:00:00+04:00');

  // Generate events for each day
  const events = [];
  for (let day = 0; day < days; day++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    // Daily routine events
    events.push({
      owner_id: userId,
      title: 'Walking — Marina/JBR loop',
      starts_at: `${dateStr}T05:00:00+04:00`,
      ends_at: `${dateStr}T07:30:00+04:00`,
      location: 'Dubai Marina',
      source: 'local',
      external_source: tag,
      color: '#10b981',
    });

    events.push({
      owner_id: userId,
      title: 'Deep Work — CRM/Bot (Malak)',
      starts_at: `${dateStr}T08:00:00+04:00`,
      ends_at: `${dateStr}T21:30:00+04:00`,
      location: 'Workspace',
      source: 'local',
      external_source: tag,
      color: '#3b82f6',
    });

    // MMA on day 3 (Wednesday)
    if (day === 2) {
      events.push({
        owner_id: userId,
        title: 'MMA Training',
        starts_at: `${dateStr}T19:00:00+04:00`,
        ends_at: `${dateStr}T20:30:00+04:00`,
        location: 'Gym',
        source: 'local',
        external_source: tag,
        color: '#ef4444',
      });
    }

    events.push({
      owner_id: userId,
      title: 'Wind down & prep for sleep',
      starts_at: `${dateStr}T21:30:00+04:00`,
      ends_at: `${dateStr}T22:00:00+04:00`,
      location: 'Home',
      source: 'local',
      external_source: tag,
      color: '#8b5cf6',
    });
  }

  // Insert events
  const { data: insertedEvents, error: eventsError } = await supabase
    .from('events')
    .insert(events)
    .select();

  if (eventsError) {
    console.error('[seed-data] Events error:', eventsError);
    throw new Error(`Failed to insert events: ${eventsError.message}`);
  }

  results.events = insertedEvents?.length || 0;
  console.log(`[seed-data] Inserted ${results.events} events`);

  // Generate financial data
  const financialEntries = [];
  for (let day = 0; day < days; day++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    // Daily expenses
    financialEntries.push({
      owner_id: userId,
      entry_date: dateStr,
      type: 'expense',
      amount_usd: (18 / 3.67).toFixed(2), // Convert AED to USD
      category: 'Food & Drink',
      note: `coffee [${tag}]`,
      source: 'seed',
    });

    if (day === 0) {
      financialEntries.push({
        owner_id: userId,
        entry_date: dateStr,
        type: 'expense',
        amount_usd: (70 / 3.67).toFixed(2),
        category: 'Workspace',
        note: `coworking [${tag}]`,
        source: 'seed',
      });
      financialEntries.push({
        owner_id: userId,
        entry_date: dateStr,
        type: 'expense',
        amount_usd: (45 / 3.67).toFixed(2),
        category: 'Groceries',
        note: `groceries [${tag}]`,
        source: 'seed',
      });
    }

    if (day === 1) {
      financialEntries.push({
        owner_id: userId,
        entry_date: dateStr,
        type: 'income',
        amount_usd: (600 / 3.67).toFixed(2),
        category: 'Client Payment',
        note: `client deposit [${tag}]`,
        source: 'seed',
      });
    }

    if (day === 2) {
      financialEntries.push({
        owner_id: userId,
        entry_date: dateStr,
        type: 'expense',
        amount_usd: (35 / 3.67).toFixed(2),
        category: 'Transportation',
        note: `transport [${tag}]`,
        source: 'seed',
      });
    }
  }

  const { data: insertedFinancial, error: financialError } = await supabase
    .from('finance_entries')
    .insert(financialEntries)
    .select();

  if (financialError) {
    console.error('[seed-data] Financial error:', financialError);
    // Don't throw, just log - table might not exist
    console.warn('[seed-data] Skipping financial entries');
  } else {
    results.financial = insertedFinancial?.length || 0;
    console.log(`[seed-data] Inserted ${results.financial} financial entries`);
  }

  // Generate health data
  const healthEntries = [];
  for (let day = 0; day < days; day++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    const steps = day === 0 ? 18000 : day === 1 ? 17000 : 12000;
    const meters = day === 0 ? 13000 : day === 1 ? 12000 : 8500;

    healthEntries.push({
      user_id: userId,
      day: dateStr,
      steps: steps,
      meters: meters,
      sleep_minutes: 420, // 7 hours
      hr_avg: 68 + Math.random() * 4, // 68-72
      hr_max: 140 + Math.random() * 20, // 140-160
    });
  }

  const { data: insertedHealth, error: healthError } = await supabase
    .from('health_samples')
    .upsert(healthEntries, { onConflict: 'user_id,day' })
    .select();

  if (healthError) {
    console.error('[seed-data] Health error:', healthError);
    console.warn('[seed-data] Skipping health entries');
  } else {
    results.health = insertedHealth?.length || 0;
    console.log(`[seed-data] Inserted ${results.health} health samples`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Seeded ${days} days of data`,
      tag,
      results,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRollback(supabase: any, userId: string, tag: string) {
  const results = {
    events: 0,
    financial: 0,
    health: 0,
  };

  // Delete events
  const { error: eventsError, count: eventsCount } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .eq('owner_id', userId)
    .eq('external_source', tag);

  if (eventsError) {
    console.error('[seed-data] Rollback events error:', eventsError);
  } else {
    results.events = eventsCount || 0;
  }

  // Delete financial entries
  const { error: financialError, count: financialCount } = await supabase
    .from('finance_entries')
    .delete({ count: 'exact' })
    .eq('owner_id', userId)
    .like('note', `%[${tag}]%`);

  if (financialError) {
    console.error('[seed-data] Rollback financial error:', financialError);
  } else {
    results.financial = financialCount || 0;
  }

  console.log(`[seed-data] Rollback completed: ${JSON.stringify(results)}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Rolled back seed data with tag: ${tag}`,
      results,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
