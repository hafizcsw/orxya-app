-- Add RPC functions for privacy client
create or replace function public.get_privacy_prefs(p_user_id uuid)
returns setof user_privacy_prefs
language sql
security definer
as $$
  select * from public.user_privacy_prefs where user_id = p_user_id;
$$;
grant execute on function public.get_privacy_prefs(uuid) to authenticated;

create or replace function public.update_privacy_prefs(p_user_id uuid, p_prefs jsonb)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.user_privacy_prefs (
    user_id,
    health_enabled,
    calendar_enabled,
    notif_fin_enabled,
    location_enabled,
    pause_all,
    retention_days,
    updated_at
  ) values (
    p_user_id,
    coalesce((p_prefs->>'health_enabled')::boolean, true),
    coalesce((p_prefs->>'calendar_enabled')::boolean, true),
    coalesce((p_prefs->>'notif_fin_enabled')::boolean, true),
    coalesce((p_prefs->>'location_enabled')::boolean, true),
    coalesce((p_prefs->>'pause_all')::boolean, false),
    coalesce((p_prefs->>'retention_days')::int, 90),
    now()
  )
  on conflict (user_id) do update set
    health_enabled = coalesce((p_prefs->>'health_enabled')::boolean, user_privacy_prefs.health_enabled),
    calendar_enabled = coalesce((p_prefs->>'calendar_enabled')::boolean, user_privacy_prefs.calendar_enabled),
    notif_fin_enabled = coalesce((p_prefs->>'notif_fin_enabled')::boolean, user_privacy_prefs.notif_fin_enabled),
    location_enabled = coalesce((p_prefs->>'location_enabled')::boolean, user_privacy_prefs.location_enabled),
    pause_all = coalesce((p_prefs->>'pause_all')::boolean, user_privacy_prefs.pause_all),
    retention_days = coalesce((p_prefs->>'retention_days')::int, user_privacy_prefs.retention_days),
    updated_at = now();
end;
$$;
grant execute on function public.update_privacy_prefs(uuid, jsonb) to authenticated;

create or replace function public.log_privacy_audit(p_user_id uuid, p_action text, p_meta jsonb)
returns void
language sql
security definer
as $$
  insert into public.privacy_audit (user_id, action, meta)
  values (p_user_id, p_action, p_meta);
$$;
grant execute on function public.log_privacy_audit(uuid, text, jsonb) to authenticated;