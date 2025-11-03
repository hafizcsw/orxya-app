# 📋 Epic 7-10: Acceptance Testing Checklist

## Prerequisites
```bash
export SUPABASE_URL="https://gcjggazmatipzqnxixhp.supabase.co"
export JWT="your_user_jwt_token_here"
```

## A) AI Health Tests (Brief + Plan/Draft)

### 1. Daily Briefing
```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"intent":"daily_briefing"}' \
  $SUPABASE_URL/functions/v1/ai-orchestrator | jq
```
**Expected:** JSON with `bullets[]` array (5 concise points)

### 2. Plan My Day (Ghost/Draft)
```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"intent":"plan_my_day","ghost":true,"calendar_window":{"start":"2025-11-03T00:00:00Z","end":"2025-11-03T23:59:59Z"}}' \
  $SUPABASE_URL/functions/v1/ai-orchestrator | jq
```
**Expected:** JSON with `events[]` array, `status: "draft_created"`

### 3. Budget Guard
```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"intent":"budget_guard","input":{"threshold":-100}}' \
  $SUPABASE_URL/functions/v1/ai-orchestrator | jq
```
**Expected:** `triggered`, `current_balance`, `threshold`

---

## B) ETL: Ingestion & Aggregation

### 1. Ingest Health
```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"day":"2025-11-03","steps":7200,"meters":5000,"sleep_minutes":420}' \
  $SUPABASE_URL/functions/v1/ingest-health | jq
```
**Expected:** `{"ok":true,"user_id":"...","day":"2025-11-03"}`

### 2. Ingest Finance
```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"when_at":"2025-11-03T10:10:00Z","direction":1,"amount":200,"currency":"AED","merchant":"Test Store"}' \
  $SUPABASE_URL/functions/v1/ingest-finance | jq
```
**Expected:** `{"ok":true,"user_id":"...","when_at":"..."}`

### 3. Daily Report
```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"start":"2025-11-01","end":"2025-11-03"}' \
  $SUPABASE_URL/functions/v1/report-daily | jq
```
**Expected:** `items[]` array with daily metrics

---

## C) AI Summary (Period)

```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"start":"2025-10-27","end":"2025-11-03"}' \
  $SUPABASE_URL/functions/v1/summarize-period | jq
```
**Expected:** `agg{...}` + `bullets[5]`

---

## D) Privacy Tests

### 1. Export Data
```bash
curl -sS -H "Authorization: Bearer $JWT" \
  $SUPABASE_URL/functions/v1/privacy-export | jq
```
**Expected:** `signed_url` (valid for 24h)

### 2. Delete Request
```bash
curl -sS -H "Authorization: Bearer $JWT" \
  $SUPABASE_URL/functions/v1/privacy-delete-request | jq
```
**Expected:** `{"ok":true,"message":"...","status":"soft_delete_requested"}`

---

## E) Analytics & Engagement

### 1. Batch Analytics
```bash
curl -sS -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '[{"kind":"ai_plan","meta":{"ghost":true}},{"kind":"page_view","meta":{"path":"/reports"}}]' \
  $SUPABASE_URL/functions/v1/analytics-batch | jq
```
**Expected:** `{"ok":true,"count":2}`

### 2. Verify MV Refresh
```sql
SELECT public.refresh_engagement();
SELECT * FROM mv_engagement_daily
WHERE user_id = auth.uid()
ORDER BY day DESC LIMIT 3;
```
**Expected:** Incrementing counters (ai_plans, page_views)

---

## F) Cron Jobs Verification

```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job
WHERE jobname LIKE 'refresh_%'
ORDER BY jobname;
```
**Expected:** 4 active jobs

---

## G) UI End-to-End Tests

1. **Reports Page** (`/reports`)
   - Select date range
   - Click "Load Daily Report" → verify table data
   - Switch to AI Summary tab → verify bullets appear

2. **Privacy Center** (`/privacy`)
   - Toggle each switch (Health, Calendar, Financial, Location)
   - Click "Export My Data" → verify download link
   - Click "Request Data Deletion" → confirm dialog

3. **Flags Console** (`/flags`)
   - Toggle feature flags
   - Join/Leave pilot cohort
   - Verify changes persist

4. **Engagement Dashboard** (`/engagement`)
   - View 30-day summary
   - Check daily breakdown table
   - Verify auto-refresh

5. **Go-Live Dashboard** (`/golive`)
   - Review health checks
   - Check feature flags status
   - Review rollout stages

---

## ✅ Acceptance Criteria

- [ ] All 8 Edge Functions return 200/JSON
- [ ] AI orchestrator handles all 5 intents correctly
- [ ] ETL pipeline ingests and aggregates data
- [ ] Privacy export/delete work correctly
- [ ] Analytics events flow to mv_engagement_daily
- [ ] All 4 cron jobs scheduled and active
- [ ] UI pages render without errors
- [ ] No console errors in browser
- [ ] JWT authentication works on all protected endpoints

---

## 🚀 Next Steps (to reach 10/10)

### Critical (8.5 → 9.5):
- [ ] Android Widget implementation
- [ ] Android QS Tiles implementation
- [ ] Power Autopilot + OEM Guide

### Nice-to-Have (9.5 → 10):
- [ ] AI telemetry logging (tokens, duration)
- [ ] Rate limiting on AI endpoints
- [ ] Enhanced error handling with retries
- [ ] Production monitoring setup
