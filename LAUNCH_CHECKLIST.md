# 🚀 Oryxa Launch Checklist

Quick reference for deployment day. Print this and check off items as you go.

---

## Pre-Flight (T-24 hours)

### Database
- [ ] All migrations applied to staging
- [ ] RLS audit passes: `SELECT * FROM sec.rls_status WHERE NOT rls_enabled OR NOT has_policy` = 0 rows
- [ ] Feature flags configured
- [ ] Cron jobs scheduled (calendar-renew, calendar-guard-sync, ops-alert)
- [ ] Test data seeded (staging only)

### Edge Functions
- [ ] All 15+ functions deployed to staging
- [ ] Health check returns "healthy": `/functions/v1/health`
- [ ] AI orchestrator working: Test with sample prompt
- [ ] Calendar OAuth flow complete: Start → Callback → Watch
- [ ] Account delete tested: User + data removed
- [ ] Account export tested: JSON file downloaded

### Secrets
- [ ] All env vars set via `supabase secrets list`
- [ ] OAUTH_ENC_KEY is strong (32 bytes)
- [ ] LOVABLE_API_KEY valid
- [ ] GOOGLE_CLIENT_SECRET valid
- [ ] Webhook URLs correct

### Android
- [ ] APK built and signed
- [ ] Tested on Samsung Galaxy (One UI)
- [ ] Tested on Google Pixel (Stock Android)
- [ ] Health Connect permissions grant
- [ ] Notification Access permissions grant
- [ ] Secure Storage working
- [ ] Widget displays data
- [ ] Upload to Play Console (Internal Testing)

### PWA
- [ ] Build successful: `npm run build`
- [ ] Service Worker caching correctly
- [ ] Offline mode functional
- [ ] OAuth redirect URI matches config
- [ ] Desktop install prompt works
- [ ] Mobile add-to-homescreen works
- [ ] Deploy to staging host (Vercel/Netlify)

### Monitoring
- [ ] Slack webhook configured
- [ ] Ops alert function deployed
- [ ] Health dashboard accessible
- [ ] Error tracking setup

---

## Go/No-Go Decision (T-1 hour)

Review these metrics from staging (last 24 hours):

| Metric | Target | Actual | ✅/❌ |
|--------|--------|--------|------|
| Error rate | < 1% | _____% | ____ |
| P95 latency | < 600ms | _____ms | ____ |
| AI cost/user/day | < $0.03 | $_____ | ____ |
| Calendar sync success | > 95% | _____% | ____ |
| Health check uptime | > 99% | _____% | ____ |

**Decision**: GO / NO-GO (circle one)

**If NO-GO**: Document blockers and reschedule.

---

## Launch Sequence (Production)

### Step 1: Database (T-0:30)
```bash
supabase link --project-ref YOUR_PROD_REF
supabase db push --no-seed
```

- [ ] Migrations applied successfully
- [ ] No errors in Supabase Dashboard > Database > Logs
- [ ] Verify RLS: `SELECT * FROM sec.rls_status`

### Step 2: Secrets (T-0:25)
```bash
supabase secrets set --env-file .env.prod
```

- [ ] All secrets set
- [ ] Verify: `supabase secrets list`

### Step 3: Edge Functions (T-0:20)
```bash
bash scripts/deploy-functions.sh
```

- [ ] All functions deployed
- [ ] No errors in output
- [ ] Health check passes: `curl https://YOUR_PROD.supabase.co/functions/v1/health`

### Step 4: Cron Jobs (T-0:15)
Execute cron setup SQL in production DB:

- [ ] calendar-renew-daily scheduled
- [ ] calendar-guard-sync scheduled
- [ ] ops-alert-check scheduled
- [ ] Verify: `SELECT * FROM cron.job`

### Step 5: PWA Deploy (T-0:10)
```bash
npm run build
npm run deploy:production
```

- [ ] Build successful
- [ ] Deployed to production URL
- [ ] DNS propagated
- [ ] HTTPS certificate valid

### Step 6: Smoke Tests (T-0:05)
- [ ] Health check: https://oryxa.app/functions/v1/health
- [ ] Login flow: https://oryxa.app/auth
- [ ] Today page renders: https://oryxa.app/today
- [ ] AI recommendation loads
- [ ] Calendar OAuth redirects correctly

### Step 7: Gradual Rollout (T+0:00)

**10% Traffic (Day 1)**
```sql
UPDATE feature_flags 
SET enabled = true 
WHERE key = 'LAUNCH_PERCENT';

-- Target 10% via random sampling or specific user cohort
```

- [ ] Monitor for 24 hours
- [ ] Error rate < 1%
- [ ] No critical Slack alerts
- [ ] User feedback positive

**50% Traffic (Day 2)**
- [ ] Increase to 50%
- [ ] Monitor for 48 hours
- [ ] Metrics stable

**100% Traffic (Day 4)**
- [ ] Roll out to all users
- [ ] Monitor for 1 week
- [ ] Announce launch 🎉

---

## Post-Launch (T+24 hours)

### Health Check
- [ ] Review Supabase Dashboard > Edge Functions > Logs
- [ ] Check Slack for alerts
- [ ] No critical errors in last 24h
- [ ] Database performance normal

### Metrics Review
```sql
-- Error rate
SELECT 
  COUNT(*) FILTER (WHERE route LIKE '%error%')::numeric / COUNT(*) * 100 as error_rate_percent
FROM ai_calls_log
WHERE created_at > NOW() - INTERVAL '24 hours';

-- AI cost
SELECT SUM(cost_usd) as total_cost_24h
FROM ai_calls_log
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Active users
SELECT COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE created_at > CURRENT_DATE;
```

- [ ] Error rate: _____% (target < 1%)
- [ ] Total AI cost: $_____ (target < $10/day)
- [ ] DAU: _____ users
- [ ] No anomalies detected

### User Feedback
- [ ] Check support channels (email, social media)
- [ ] Review app store reviews
- [ ] Document common issues
- [ ] Create FAQ if needed

---

## Rollback Plan (If Needed)

**Trigger conditions:**
- Error rate > 5%
- Critical functionality broken
- Security incident
- Cost spike (> $50/day)

**Immediate Actions:**
1. Kill switch:
   ```sql
   UPDATE feature_flags SET enabled = false WHERE key IN ('AI_COMPLEX_ON', 'CALENDAR_WATCH_ENABLED');
   ```
2. Notify team on Slack: #oryxa-incidents
3. Revert PWA deploy:
   ```bash
   vercel rollback  # or your host's rollback command
   ```
4. Redeploy stable Edge Functions:
   ```bash
   git checkout v1.0.0-stable
   supabase functions deploy ai-orchestrator calendar-sync
   ```
5. Database PITR if needed (Supabase Dashboard)

**Communication:**
- [ ] Update status page
- [ ] Notify users via email/push
- [ ] Post incident report within 24h

---

## Success Criteria (Week 1)

After 7 days in production, review:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| DAU | > 100 | _____ | ✅/❌ |
| Error rate (avg) | < 1% | _____% | ✅/❌ |
| Calendar sync success | > 95% | _____% | ✅/❌ |
| AI cost/user/day | < $0.03 | $_____ | ✅/❌ |
| Uptime | > 99.9% | _____% | ✅/❌ |
| User retention (D7) | > 40% | _____% | ✅/❌ |

**Overall Status**: SUCCESS / NEEDS IMPROVEMENT

**Action Items** (if any):
1. _______________________________________
2. _______________________________________
3. _______________________________________

---

## Team Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | __________ | __________ | ______ |
| Product Manager | __________ | __________ | ______ |
| DevOps | __________ | __________ | ______ |
| QA | __________ | __________ | ______ |

---

**Launch Date**: ____ / ____ / 2025  
**Launch Time**: ____ : ____ UTC  
**Version**: 1.0.0

🎉 **LET'S LAUNCH ORYXA!** 🎉
