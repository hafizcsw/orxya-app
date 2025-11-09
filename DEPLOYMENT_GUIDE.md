# Oryxa Deployment Guide (Order 8)

This guide covers the complete deployment process from staging to production, including monitoring, rollback procedures, and operational runbooks.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Database Migration](#2-database-migration)
3. [Edge Functions Deployment](#3-edge-functions-deployment)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Health Checks & Feature Flags](#5-health-checks--feature-flags)
6. [Monitoring & Alerts](#6-monitoring--alerts)
7. [Security Hardening](#7-security-hardening)
8. [Launch Checklist](#8-launch-checklist)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Incident Runbooks](#10-incident-runbooks)

---

## 1. Environment Setup

### 1.1 Environment Files

Create separate environment files for staging and production:

**`.env.staging`**
```bash
# Supabase
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://staging.oryxa.app/auth/callback

# Encryption
OAUTH_ENC_KEY=your-32-byte-random-string-here

# AI/LLM
LOVABLE_API_KEY=your-lovable-key
AI_COMPLEX_MODEL=google/gemini-2.5-flash
AI_EMBED_MODEL=text-embedding-3-small

# Webhooks
WEBHOOK_BASE=https://your-staging-project.supabase.co/functions/v1
WATCH_TTL_SECONDS=604800

# Monitoring (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# App
APP_VERSION=1.0.0-staging
```

**`.env.prod`**
```bash
# Same structure as staging but with production values
SUPABASE_URL=https://your-production-project.supabase.co
# ... etc
APP_VERSION=1.0.0
```

### 1.2 Set Supabase Secrets

**Staging:**
```bash
cd /path/to/oryxa
supabase link --project-ref your-staging-ref
supabase secrets set --env-file .env.staging
```

**Production:**
```bash
supabase link --project-ref your-production-ref
supabase secrets set --env-file .env.prod
```

### 1.3 Database Configuration (GUCs for pg_cron)

Run this SQL in both staging and production:

```sql
-- Set global configs for pg_cron functions
ALTER DATABASE postgres SET app.functions_base = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.service_key = 'your-service-role-key';
```

---

## 2. Database Migration

### 2.1 Review Migration Files

Ensure all migration files from Orders 1-7 are in `supabase/migrations/`:
- Base infrastructure
- Health Connect integration
- Finance notification parsing
- Google Calendar mirror
- AI intelligence layer
- Nutrition/health UX
- Security & compliance

### 2.2 Apply Migrations

**Staging:**
```bash
supabase db push --include-seed
```

**Production:**
```bash
# IMPORTANT: Test in staging first!
supabase db push --no-seed  # Don't seed production with test data
```

### 2.3 Verify Schema

```sql
-- Check RLS status
SELECT * FROM sec.rls_status 
WHERE NOT rls_enabled OR NOT has_policy;

-- Expected: 0 rows (all tables protected)

-- Check feature flags
SELECT * FROM feature_flags;

-- Check cron jobs
SELECT * FROM cron.job;
```

---

## 3. Edge Functions Deployment

### 3.1 Deploy All Functions

**Order matters for dependencies:**

```bash
# Calendar integration (Order 4)
supabase functions deploy calendar-oauth-start
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-watch-setup
supabase functions deploy calendar-sync
supabase functions deploy calendar-notify
supabase functions deploy calendar-renew

# Deterministic tools (Order 5)
supabase functions deploy budget-simulator
supabase functions deploy scheduler-solver
supabase functions deploy nutrition-estimator

# AI layer (Order 5)
supabase functions deploy ai-router
supabase functions deploy ai-orchestrator

# Privacy & compliance (Order 7)
supabase functions deploy account-delete
supabase functions deploy account-export

# Monitoring (Order 8)
supabase functions deploy health
supabase functions deploy ops-alert

# Data ingestion
supabase functions deploy ingest-health
supabase functions deploy ingest-finance
supabase functions deploy etl-health-daily

# Realtime data
supabase functions deploy today-realtime-data
```

### 3.2 Verify Deployment

Test each critical function:

```bash
# Health check
curl https://your-project.supabase.co/functions/v1/health

# AI orchestrator (requires auth)
curl -X POST https://your-project.supabase.co/functions/v1/ai-orchestrator \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","domain":"health","locale":"ar"}'
```

### 3.3 Setup Cron Jobs

**Calendar Watch Renewal (Daily at 2 AM UTC):**
```sql
SELECT cron.schedule(
  'calendar-renew-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.functions_base') || '/calendar-renew',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Calendar Guard Sync (Daily at 3 AM UTC):**
```sql
SELECT cron.schedule(
  'calendar-guard-sync',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.functions_base') || '/calendar-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body := jsonb_build_object('mode', 'guard')
  );
  $$
);
```

**Ops Alerts (Every 10 minutes):**
```sql
SELECT cron.schedule(
  'ops-alert-check',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.functions_base') || '/ops-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Example

**`.github/workflows/deploy-staging.yml`**
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: |
          npm install -g supabase
      
      - name: Link Supabase Project
        run: |
          supabase link --project-ref ${{ secrets.STAGING_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Push Database Migrations
        run: supabase db push
      
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy health
          supabase functions deploy ops-alert
          supabase functions deploy ai-orchestrator
          supabase functions deploy calendar-sync
          # ... deploy other functions
      
      - name: Build PWA
        run: |
          npm install
          npm run build
      
      - name: Deploy PWA
        run: |
          # Deploy to your static host (Vercel, Netlify, etc.)
          npm run deploy:staging
```

**`.github/workflows/deploy-production.yml`**
```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # Similar to staging but with production secrets
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        run: npm install -g supabase
      
      - name: Link Production Project
        run: supabase link --project-ref ${{ secrets.PROD_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Push Database Migrations
        run: supabase db push --no-seed
      
      - name: Deploy Functions
        run: |
          # Deploy all functions in order
          bash ./scripts/deploy-functions.sh
      
      - name: Build & Deploy PWA
        run: |
          npm install
          npm run build
          npm run deploy:production
      
      - name: Notify Slack
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Oryxa deployed to production: ${{ github.ref_name }}"}'
```

### 4.2 Deploy Script

**`scripts/deploy-functions.sh`**
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Oryxa Edge Functions..."

# Order matters for dependencies
functions=(
  "calendar-oauth-start"
  "calendar-oauth-callback"
  "calendar-watch-setup"
  "calendar-sync"
  "calendar-notify"
  "calendar-renew"
  "budget-simulator"
  "scheduler-solver"
  "nutrition-estimator"
  "ai-router"
  "ai-orchestrator"
  "account-delete"
  "account-export"
  "health"
  "ops-alert"
  "today-realtime-data"
)

for func in "${functions[@]}"; do
  echo "Deploying $func..."
  supabase functions deploy "$func"
done

echo "✅ All functions deployed successfully!"
```

---

## 5. Health Checks & Feature Flags

### 5.1 Health Endpoint

**Endpoint:** `GET /functions/v1/health`

**Response:**
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-01-09T10:00:00Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "ok" },
    "feature_flags": { 
      "status": "ok", 
      "count": 5,
      "flags": {
        "AI_COMPLEX_ON": true,
        "NUTRITION_V2_USDA": false
      }
    },
    "ai_quota": { 
      "status": "ok",
      "max_usage_percent": 45
    },
    "error_rate": {
      "status": "ok",
      "error_rate_percent": 0.5,
      "total_calls_1h": 120,
      "errors_1h": 0
    },
    "oauth_connections": {
      "status": "ok",
      "active_connections": 15,
      "by_provider": { "google": 15 }
    }
  }
}
```

### 5.2 Feature Flags Management

**Initialize flags:**
```sql
INSERT INTO feature_flags (key, enabled) VALUES
  ('AI_COMPLEX_ON', true),
  ('NUTRITION_V2_USDA', false),
  ('CALENDAR_WATCH_ENABLED', true),
  ('BETA_VOICE_ASSISTANT', false),
  ('LAUNCH_PERCENT', true)
ON CONFLICT (key) DO NOTHING;
```

**Toggle flags:**
```sql
-- Emergency: Disable AI to reduce costs
UPDATE feature_flags SET enabled = false WHERE key = 'AI_COMPLEX_ON';

-- Enable beta feature
UPDATE feature_flags SET enabled = true WHERE key = 'BETA_VOICE_ASSISTANT';
```

**Check in code:**
```typescript
const { data } = await supabase.from('feature_flags')
  .select('enabled')
  .eq('key', 'AI_COMPLEX_ON')
  .single();

if (!data?.enabled) {
  // Use fallback/cached responses only
  return getCachedResponse();
}
```

---

## 6. Monitoring & Alerts

### 6.1 Metrics to Monitor

**System Health:**
- Database response time (p50, p95, p99)
- Edge function error rates
- OAuth connection health
- RLS policy violations

**Business Metrics:**
- Daily active users
- AI calls per user
- Feature adoption rates
- Calendar sync success rate

**Cost Metrics:**
- AI API costs per day
- Database storage growth
- Edge function invocations

### 6.2 Alert Thresholds

**Critical (PagerDuty/SMS):**
- Error rate > 5% in last hour
- Daily AI cost > $10
- Database down
- All OAuth connections failing

**Warning (Slack):**
- Error rate > 2% in last hour
- AI quota usage > 80% for any user
- P95 latency > 2 seconds
- Cron jobs failed

### 6.3 Slack Integration

Set `SLACK_WEBHOOK_URL` secret:
```bash
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

The `ops-alert` function (running every 10 minutes) will automatically send alerts to Slack.

### 6.4 Monitoring Dashboard

**Supabase Dashboard:**
- Database > Logs > Postgres
- Edge Functions > Logs
- Storage > Usage

**Custom Dashboard Queries:**

```sql
-- Error rate over time (hourly buckets)
SELECT 
  date_trunc('hour', created_at) as hour,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE route LIKE '%error%') as errors,
  ROUND((COUNT(*) FILTER (WHERE route LIKE '%error%')::numeric / COUNT(*)) * 100, 2) as error_rate_percent
FROM ai_calls_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Top 10 users by AI usage today
SELECT 
  user_id,
  COUNT(*) as calls_today,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency_ms
FROM ai_calls_log
WHERE created_at > CURRENT_DATE
GROUP BY user_id
ORDER BY calls_today DESC
LIMIT 10;

-- Calendar sync health
SELECT 
  provider,
  status,
  COUNT(*) as count,
  MAX(last_sync_at) as last_successful_sync
FROM external_accounts
GROUP BY provider, status;
```

---

## 7. Security Hardening

### 7.1 Web Security Headers

Add to your PWA hosting configuration:

```nginx
# Nginx example
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 7.2 Key Rotation Schedule

**Every 90 days:**
- `OAUTH_ENC_KEY` (requires re-encryption of `external_accounts`)
- `LOVABLE_API_KEY` (if rotated by Lovable)

**Every 180 days:**
- `GOOGLE_CLIENT_SECRET` (via Google Cloud Console)

**Key rotation procedure:**

```sql
-- 1. Generate new encryption key (32 bytes, base64)
-- 2. Re-encrypt all OAuth tokens
UPDATE public.external_accounts
SET refresh_token_enc = pgp_sym_encrypt(
  pgp_sym_decrypt(refresh_token_enc::bytea, :OLD_KEY),
  :NEW_KEY
),
updated_at = NOW();

-- 3. Update Supabase secret
-- supabase secrets set OAUTH_ENC_KEY=new-key-here

-- 4. Verify by testing one OAuth connection
```

### 7.3 RLS Audit

**Monthly check:**
```sql
-- Tables without RLS
SELECT * FROM sec.rls_status 
WHERE NOT rls_enabled;

-- Tables without policies
SELECT * FROM sec.rls_status 
WHERE NOT has_policy;

-- Expected: 0 rows for both
```

---

## 8. Launch Checklist

### 8.1 Pre-Launch (Staging)

- [ ] All migrations applied successfully
- [ ] All Edge Functions deployed and responding 200
- [ ] Health check endpoint returns `"status": "healthy"`
- [ ] Feature flags configured correctly
- [ ] Cron jobs scheduled and running
- [ ] RLS audit passes (0 exposed tables)
- [ ] Security headers configured
- [ ] Monitoring alerts configured
- [ ] Error rate < 1% over 24 hours in staging
- [ ] P95 latency < 600ms
- [ ] Average daily cost < $0.03/user

### 8.2 Android Testing

- [ ] Health Connect permissions grant successfully
- [ ] Notification Access permissions grant successfully
- [ ] Data syncs to `signals_daily` within 5 minutes
- [ ] Financial events captured from notifications
- [ ] Widget displays today's data
- [ ] Secure Storage (EncryptedSharedPreferences) working
- [ ] Tested on Samsung, Pixel, OnePlus devices

### 8.3 PWA Testing

- [ ] OAuth flow completes (Google Calendar)
- [ ] PKCE authentication works
- [ ] Service Worker caches correctly
- [ ] Offline mode functions
- [ ] AI Orchestrator returns valid JSON
- [ ] Recommendation cards render properly
- [ ] Baseline banner shows correct progress
- [ ] Meal quick-add works

### 8.4 Production Deployment

**Phase 1: 10% Traffic (Day 1)**
- [ ] Deploy to production
- [ ] Enable for 10% of users via feature flag
- [ ] Monitor for 24 hours
- [ ] Error rate < 1%
- [ ] No critical alerts
- [ ] User feedback positive

**Phase 2: 50% Traffic (Day 2-3)**
- [ ] Increase to 50% of users
- [ ] Monitor for 48 hours
- [ ] Performance metrics stable
- [ ] Cost per user within budget

**Phase 3: 100% Traffic (Day 4)**
- [ ] Roll out to all users
- [ ] Monitor for 1 week
- [ ] Document any issues
- [ ] Celebrate! 🎉

---

## 9. Rollback Procedures

### 9.1 Emergency Kill Switch

**Immediate actions (< 2 minutes):**

```sql
-- Disable AI to stop costs
UPDATE feature_flags SET enabled = false WHERE key = 'AI_COMPLEX_ON';

-- Disable new calendar watches
UPDATE feature_flags SET enabled = false WHERE key = 'CALENDAR_WATCH_ENABLED';
```

### 9.2 Edge Function Rollback

```bash
# Redeploy previous version
git checkout v1.0.0-stable
supabase functions deploy ai-orchestrator
supabase functions deploy calendar-sync
```

### 9.3 Database Rollback

**Using Supabase Point-in-Time Recovery (PITR):**

1. Go to Supabase Dashboard > Database > Backups
2. Select timestamp before issue occurred
3. Restore to new database
4. Update connection strings
5. Redeploy functions

**Cost:** ~15 minutes downtime

### 9.4 PWA Rollback

```bash
# Revert to previous deploy
vercel rollback  # or your hosting provider's rollback command

# Or redeploy stable version
git checkout v1.0.0-stable
npm run build
npm run deploy
```

---

## 10. Incident Runbooks

### 10.1 Google Calendar Sync Failure

**Symptoms:**
- `calendar_events_mirror` not updating
- Users report missing calendar events
- `external_accounts` status = "error"

**Diagnosis:**
```sql
-- Check account status
SELECT provider, status, COUNT(*) 
FROM external_accounts 
GROUP BY provider, status;

-- Check last successful sync
SELECT user_id, last_sync_at, status
FROM external_accounts
WHERE provider = 'google'
ORDER BY last_sync_at DESC
LIMIT 10;

-- Check watch channels
SELECT * FROM calendar_watch_channels
WHERE expires_at < NOW();
```

**Resolution:**
1. Disable new watches: `UPDATE feature_flags SET enabled=false WHERE key='CALENDAR_WATCH_ENABLED'`
2. Switch to guard sync (daily poll): Cron job `calendar-guard-sync` will continue syncing
3. Investigate OAuth token issues
4. Re-authorize affected users
5. Re-enable watches once stable

**Prevention:**
- `calendar-renew` cron renews watches before expiry
- `calendar-guard-sync` provides fallback
- Monitor `external_accounts.status` alerts

---

### 10.2 AI Cost Spike

**Symptoms:**
- `ai_calls_log` shows > $10/day
- Ops alert fires for high daily cost

**Diagnosis:**
```sql
-- Check cost by user
SELECT user_id, COUNT(*) as calls, SUM(cost_usd) as total_cost
FROM ai_calls_log
WHERE created_at > CURRENT_DATE
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 20;

-- Check cache hit rate
SELECT 
  COUNT(*) FILTER (WHERE cached = true) as cached,
  COUNT(*) FILTER (WHERE cached = false) as uncached,
  ROUND((COUNT(*) FILTER (WHERE cached = true)::numeric / COUNT(*)) * 100, 2) as cache_rate_percent
FROM ai_calls_log
WHERE created_at > CURRENT_DATE;
```

**Resolution:**
1. Kill switch: Disable AI immediately
   ```sql
   UPDATE feature_flags SET enabled = false WHERE key = 'AI_COMPLEX_ON';
   ```
2. Increase cache TTL:
   ```typescript
   await putCache(admin, cacheKey, user_id, parsed, 21600); // 6 hours instead of 1
   ```
3. Lower quota limits:
   ```sql
   UPDATE ai_quota SET daily_calls_limit = 20 WHERE daily_calls_limit > 20;
   ```
4. Review high-usage users (potential abuse)
5. Switch to cheaper model temporarily:
   ```bash
   supabase secrets set AI_COMPLEX_MODEL=google/gemini-2.5-flash-lite
   ```

**Prevention:**
- Set hard quotas per user (enforced in code)
- Monitor daily spend alerts
- Use router to minimize complex calls

---

### 10.3 Database Connection Exhaustion

**Symptoms:**
- "Too many connections" errors
- Edge functions timing out
- Health check fails

**Diagnosis:**
```sql
-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Check by source
SELECT application_name, COUNT(*) 
FROM pg_stat_activity 
GROUP BY application_name;
```

**Resolution:**
1. Kill idle connections:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND state_change < NOW() - INTERVAL '5 minutes';
   ```
2. Increase connection pool limit (Supabase Dashboard > Database > Settings)
3. Review Edge Functions for connection leaks
4. Ensure `createClient` is not called repeatedly

**Prevention:**
- Use connection pooling (Supabase default: PgBouncer)
- Close unused connections promptly
- Monitor `pg_stat_activity` daily

---

### 10.4 Auth/PKCE Issues

**Symptoms:**
- Users stuck on auth callback
- "Invalid grant" errors
- Session not persisting

**Diagnosis:**
- Check browser console for PKCE errors
- Verify redirect URI matches exactly (trailing slash matters)
- Check `detectSessionInUrl` is enabled
- Verify `flowType: 'pkce'` in client config

**Resolution:**
1. Clear browser storage (localStorage, cookies)
2. Verify redirect URI in Google Cloud Console matches app config
3. Ensure `GOOGLE_REDIRECT_URI` secret matches callback page
4. Redeploy `calendar-oauth-start` and `calendar-oauth-callback`
5. Test with incognito window

**Prevention:**
- Document exact redirect URIs
- Test OAuth flow in CI/CD
- Monitor auth error rates

---

### 10.5 Android Health Connect Not Syncing

**Symptoms:**
- `signals_daily` empty for users
- Health metrics not showing in app

**Diagnosis:**
- Check Android logs for Health Connect errors
- Verify permissions granted in Settings > Apps > Health Connect
- Check `ingest-health` Edge Function logs
- Verify `HealthSyncWorker` scheduled correctly

**Resolution:**
1. Re-request Health Connect permissions in app
2. Manually trigger sync via `scheduleHealthSync(context)`
3. Check `HcStore.kt` for data reading errors
4. Verify `signals_raw` table has recent data:
   ```sql
   SELECT * FROM signals_raw 
   WHERE user_id = 'xxx' 
   ORDER BY occurred_at DESC 
   LIMIT 10;
   ```
5. Check ETL job logs (`etl-health-daily`)

**Prevention:**
- Daily ETL job consolidates `signals_raw` → `signals_daily`
- HealthSyncWorker runs every 6 hours
- Monitor sync success rate

---

## 11. Post-Launch Operations

### 11.1 Daily Checks

- [ ] Review health check status
- [ ] Check error rate dashboard
- [ ] Review AI cost report
- [ ] Monitor Slack alerts
- [ ] Check cron job success

### 11.2 Weekly Reviews

- [ ] Analyze user growth metrics
- [ ] Review feature adoption rates
- [ ] Check for RLS policy violations (audit log)
- [ ] Review and respond to user feedback
- [ ] Update documentation based on issues

### 11.3 Monthly Tasks

- [ ] RLS audit (sec.rls_status)
- [ ] Review and optimize AI prompts
- [ ] Analyze cost trends
- [ ] Plan feature flag rollouts
- [ ] Update dependency versions

### 11.4 Quarterly Tasks

- [ ] Rotate encryption keys (OAUTH_ENC_KEY)
- [ ] Security audit (external penetration test)
- [ ] Performance optimization review
- [ ] Database vacuum and analyze
- [ ] Backup restore test

---

## 12. Support Contacts

**Critical Issues (24/7):**
- On-call engineer: [pagerduty-link]
- Slack: #oryxa-incidents

**Business Hours:**
- Engineering lead: [email]
- Product manager: [email]
- Slack: #oryxa-support

**Vendor Support:**
- Supabase: support@supabase.com
- Google Cloud: [support-link]
- Lovable AI: [support-link]

---

## Appendix A: Cost Breakdown

**Monthly Estimates (1000 active users):**

| Service | Cost/Month |
|---------|------------|
| Supabase Pro | $25 |
| AI API Calls (Lovable) | $50-150 |
| Google Calendar API | Free (< 1M requests) |
| PWA Hosting (Vercel/Netlify) | $20 |
| Android Distribution (Play Console) | $25/year |
| Monitoring (optional) | $0-50 |
| **Total** | **$95-245/month** |

**Per-user costs:**
- Storage: ~10MB/user (health + calendar + finance data)
- AI calls: ~20 calls/day × $0.001 = $0.60/user/month
- Database reads/writes: Negligible (within Supabase plan)

---

## Appendix B: Performance Benchmarks

**Target Metrics:**

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Health check response | < 200ms | < 500ms | > 1s |
| AI orchestrator P95 | < 2s | < 5s | > 10s |
| Calendar sync success rate | > 99% | > 95% | < 90% |
| Error rate | < 0.5% | < 2% | > 5% |
| Daily AI cost per user | < $0.02 | < $0.05 | > $0.10 |
| Database response time P95 | < 100ms | < 300ms | > 1s |

---

## Appendix C: Glossary

- **PITR**: Point-in-Time Recovery
- **RLS**: Row-Level Security
- **PKCE**: Proof Key for Code Exchange (OAuth flow)
- **TTL**: Time To Live (cache duration)
- **GUC**: Grand Unified Configuration (Postgres settings)
- **ETL**: Extract, Transform, Load (data pipeline)
- **p50/p95/p99**: 50th/95th/99th percentile latency

---

**Last Updated**: 2025-01-09  
**Version**: 1.0.0  
**Status**: ✅ Ready for Production

**Next Steps**: Begin staging deployment following Section 8.1 checklist.
