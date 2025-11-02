-- إصلاح trigger الذي يحتوي على حقل meta غير موجود
DROP TRIGGER IF EXISTS trg_events_fill_calendar ON events;

CREATE OR REPLACE FUNCTION public.fn_events_fill_calendar()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  dest text;
begin
  if new.external_calendar_id is not null then
    return new;
  end if;

  -- Fallback to default calendar only
  select default_calendar_id into dest
  from public.profiles 
  where id = new.owner_id;

  if dest is not null then
    new.external_source := coalesce(new.external_source, 'google');
    new.external_calendar_id := dest;
  end if;

  return new;
end$function$;

CREATE TRIGGER trg_events_fill_calendar
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION fn_events_fill_calendar();