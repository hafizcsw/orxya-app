import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[plans-manage] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client for auth verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify JWT token
    console.log('[plans-manage] Verifying JWT...');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    console.log('[plans-manage] User result:', { hasUser: !!user, error: userError?.message });
    
    if (userError || !user) {
      console.error('[plans-manage] Auth failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[plans-manage] User authenticated:', user.id);

    // Create user client for database operations (with RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { action, id, name, slug, icon, color, category, target_monthly, description, order_pos } = await req.json();

    // GET - Fetch all plans with performance data
    if (action === 'list' || !action) {
      const { data, error } = await supabase
        .from('v_plan_performance')
        .select('*')
        .eq('owner_id', user.id)
        .order('order_pos', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ plans: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create new plan
    if (action === 'create') {
      const { data, error } = await supabase
        .from('business_plans')
        .insert({
          owner_id: user.id,
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
          icon: icon || 'DollarSign',
          color: color || 'hsl(142, 76%, 36%)',
          category: category || 'business',
          target_monthly,
          description,
          order_pos: order_pos ?? 999,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ plan: data, success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update plan
    if (action === 'update' && id) {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (slug !== undefined) updateData.slug = slug;
      if (icon !== undefined) updateData.icon = icon;
      if (color !== undefined) updateData.color = color;
      if (category !== undefined) updateData.category = category;
      if (target_monthly !== undefined) updateData.target_monthly = target_monthly;
      if (description !== undefined) updateData.description = description;
      if (order_pos !== undefined) updateData.order_pos = order_pos;

      const { data, error } = await supabase
        .from('business_plans')
        .update(updateData)
        .eq('id', id)
        .eq('owner_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ plan: data, success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Soft delete (set is_active = false)
    if (action === 'delete' && id) {
      const { error } = await supabase
        .from('business_plans')
        .update({ is_active: false })
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // REORDER - Update order_pos for multiple plans
    if (action === 'reorder' && Array.isArray(req.json)) {
      const plans = await req.json();
      const updates = plans.map(({ id, order_pos }: any) =>
        supabase
          .from('business_plans')
          .update({ order_pos })
          .eq('id', id)
          .eq('owner_id', user.id)
      );

      await Promise.all(updates);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('plans-manage error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});