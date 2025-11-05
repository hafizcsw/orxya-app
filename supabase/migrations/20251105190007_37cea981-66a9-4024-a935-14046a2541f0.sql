-- Phase 1: Create vw_today_activities view for calculating activity hours from events

CREATE OR REPLACE VIEW vw_today_activities AS
SELECT 
  owner_id,
  date_trunc('day', starts_at AT TIME ZONE 'UTC')::date as day,
  
  -- Work hours (from tags or title)
  COALESCE(SUM(
    CASE 
      WHEN tags @> ARRAY['work'] OR lower(title) LIKE '%work%' OR lower(title) LIKE '%عمل%' THEN 
        EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600.0
      ELSE 0 
    END
  ), 0) as work_hours,
  
  -- Study hours
  COALESCE(SUM(
    CASE 
      WHEN tags @> ARRAY['study'] OR lower(title) LIKE '%study%' OR lower(title) LIKE '%دراسة%' OR lower(title) LIKE '%كورس%' THEN 
        EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600.0
      ELSE 0 
    END
  ), 0) as study_hours,
  
  -- Sports/MMA hours
  COALESCE(SUM(
    CASE 
      WHEN tags @> ARRAY['sport', 'mma', 'fitness', 'gym', 'workout'] OR lower(title) LIKE '%mma%' OR lower(title) LIKE '%رياضة%' OR lower(title) LIKE '%تمرين%' THEN 
        EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600.0
      ELSE 0 
    END
  ), 0) as sports_hours,
  
  -- Sleep hours (from sleep events)
  COALESCE(SUM(
    CASE 
      WHEN tags @> ARRAY['sleep'] OR lower(title) LIKE '%sleep%' OR lower(title) LIKE '%نوم%' THEN 
        EXTRACT(EPOCH FROM (ends_at - starts_at)) / 3600.0
      ELSE 0 
    END
  ), 0) as sleep_hours,

  -- Walk/Activity minutes
  COALESCE(SUM(
    CASE 
      WHEN tags @> ARRAY['walk', 'activity'] OR lower(title) LIKE '%walk%' OR lower(title) LIKE '%مشي%' THEN 
        EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60.0
      ELSE 0 
    END
  ), 0) as walk_minutes

FROM events
WHERE deleted_at IS NULL
GROUP BY owner_id, day;