# Security & Compliance Setup (Order 7)

This document outlines the security and compliance layer implemented in Oryxa, covering RLS auditing, secure storage, GDPR compliance, and audit logging.

---

## 1. RLS (Row-Level Security) Status Monitoring

### Views Created

- **`sec.rls_status`**: Shows RLS status for all public tables
- **`sec.user_tables`**: Lists tables containing `user_id` column

### Quick Check

```sql
-- Check for tables without RLS or policies
SELECT * FROM sec.rls_status 
WHERE NOT rls_enabled OR NOT has_policy;
```

**Expected Result**: Zero rows (all tables should have RLS enabled and policies)

### Auto-Enable RLS

The migration automatically enables RLS and creates self-ownership policies for all tables with `user_id` column:

```sql
CREATE POLICY [table]_rw_own ON public.[table]
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 2. Secure Secrets Storage

### Database Encryption

- OAuth tokens stored in `external_accounts` table use encrypted columns:
  - `access_token_enc` (bytea)
  - `refresh_token_enc` (bytea)

### Key Rotation Process

When rotating the `OAUTH_ENC_KEY`:

```sql
-- Replace :OLD and :NEW with actual keys
UPDATE public.external_accounts
SET refresh_token_enc = pgp_sym_encrypt(
  pgp_sym_decrypt(refresh_token_enc::bytea, :OLD), 
  :NEW
),
updated_at = now();
```

**Critical**: Never store encryption keys in the database. Use Supabase Secrets only.

### Android Secure Storage

**Implementation**: `android/app/src/main/java/com/oryxa/app/security/SecureStorage.kt`

Uses `EncryptedSharedPreferences` with AES256-GCM encryption:

```kotlin
val storage = SecureStorage(context)
storage.saveString(SecureStorage.KEY_SESSION, sessionJson)
val session = storage.getString(SecureStorage.KEY_SESSION)
```

**Protected Data**:
- Supabase session tokens
- Widget tokens
- OAuth tokens
- Privacy consent flags

---

## 3. GDPR Compliance

### Right to Erasure (Account Deletion)

**Edge Function**: `account-delete`

**Flow**:
1. Authenticates user via JWT
2. Logs deletion request in `audit_log`
3. Uses Admin API to delete user
4. Cascading deletes remove all related data via `ON DELETE CASCADE`

**Usage**:
```typescript
await supabase.functions.invoke('account-delete');
```

**Security**:
- Requires valid user JWT
- Uses `service_role` key server-side only
- Never exposes service role to client

### Right to Portability (Data Export)

**Edge Function**: `account-export`

**Exports**:
- All user tables (19+ tables)
- Complete data in JSON format
- Timestamped export metadata

**Usage**:
```typescript
const { data } = await supabase.functions.invoke('account-export');
// Returns JSON file with all user data
```

**Exported Tables**:
- profiles
- signals_daily
- signals_raw
- financial_events
- meals_log
- recommendations
- calendar_events_mirror
- events
- ai_calls_log
- ai_cache
- ai_messages
- ai_sessions
- health_samples
- location_samples
- business_plans
- conflicts
- notifications
- privacy_consents
- audit_log

---

## 4. Audit Logging

### Audit Log Table

**Schema**:
```sql
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  at timestamptz DEFAULT now(),
  user_id uuid,
  action text NOT NULL,         -- INSERT/UPDATE/DELETE
  table_name text NOT NULL,
  row_pk text,
  details jsonb                 -- Sanitized data
);
```

### RLS Policies

- Users can **read** their own audit logs
- Users **cannot** modify audit logs (system-only writes)

### Trigger Function

**Function**: `sec.audit_row()`

Automatically logs changes to sensitive tables:
- `financial_events`
- `signals_daily`
- `meals_log`
- `events`

**Privacy Protection**:
- Excludes sensitive fields like `input_text` from logs
- Stores only metadata needed for audit trail

### Sample Audit Log Query

```sql
SELECT 
  action,
  table_name,
  at,
  details
FROM audit_log
WHERE user_id = auth.uid()
ORDER BY at DESC
LIMIT 20;
```

---

## 5. Privacy Consents

### Consent Types

- `health_connect`: Health data collection
- `notification_access`: Financial notification parsing
- `calendar`: Google Calendar sync
- `analytics`: Usage analytics

### Consent Table

```sql
CREATE TABLE privacy_consents (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  granted boolean NOT NULL,
  at timestamptz DEFAULT now(),
  meta jsonb
);
```

### Recording Consent

```typescript
await supabase.from('privacy_consents').insert({
  consent_type: 'health_connect',
  granted: true,
  meta: { source: 'onboarding' }
});
```

### Checking Consent

```typescript
const { data } = await supabase
  .from('privacy_consents')
  .select('*')
  .eq('consent_type', 'health_connect')
  .order('at', { ascending: false })
  .limit(1)
  .single();

const hasConsent = data?.granted ?? false;
```

---

## 6. Security Checklist

### Pre-Production

- [ ] All tables have RLS enabled
- [ ] All user-specific tables have ownership policies
- [ ] No service role keys in client code
- [ ] Encryption keys stored in Supabase Secrets only
- [ ] Android uses EncryptedSharedPreferences
- [ ] Audit triggers attached to sensitive tables
- [ ] Privacy consents recorded during onboarding

### Testing

- [ ] RLS prevents cross-user data access
- [ ] Account deletion removes all user data
- [ ] Data export includes all tables
- [ ] Audit log captures all mutations
- [ ] Consent changes are logged
- [ ] Key rotation works without data loss

### Monitoring

- [ ] Check `sec.rls_status` regularly
- [ ] Monitor `audit_log` for suspicious activity
- [ ] Review `ai_calls_log` for cost/usage
- [ ] Verify encryption key rotation schedule

---

## 7. Compliance Notes

### GDPR

✅ **Right to Access**: Implemented via `account-export`  
✅ **Right to Erasure**: Implemented via `account-delete`  
✅ **Right to Portability**: JSON export format  
✅ **Consent Management**: `privacy_consents` table  
✅ **Audit Trail**: `audit_log` for all sensitive operations

### Data Retention

**Default**: 90 days (configurable in `user_privacy_prefs`)

**Automatic Cleanup**:
- Old signals_raw (> retention period)
- Old audit_log entries
- Expired AI cache entries

### Encryption

- **At Rest**: Database-level encryption (Supabase default)
- **In Transit**: HTTPS/TLS for all API calls
- **Client-side**: EncryptedSharedPreferences (Android)
- **Secrets**: pgcrypto for OAuth tokens

---

## 8. Emergency Procedures

### Data Breach Response

1. Check `audit_log` for unauthorized access patterns
2. Revoke compromised OAuth tokens in `external_accounts`
3. Force password reset via Supabase Admin
4. Notify affected users (GDPR requirement)

### Key Compromise

1. Generate new `OAUTH_ENC_KEY`
2. Run key rotation SQL on all `external_accounts`
3. Update Supabase Secret
4. Redeploy Edge Functions

### Unauthorized Deletion

1. Check `audit_log` for deletion records
2. Restore from backups (Supabase Point-in-Time Recovery)
3. Verify RLS policies weren't modified

---

## 9. Future Enhancements

- [ ] Implement soft-delete with 7-day grace period
- [ ] Add rate limiting on account-delete to prevent abuse
- [ ] Compress/split large exports (>10MB)
- [ ] Implement data anonymization for analytics
- [ ] Add webhook notifications for audit events
- [ ] Create admin dashboard for compliance monitoring

---

## References

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [Android EncryptedSharedPreferences](https://developer.android.com/topic/security/data)
- [pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)

---

**Last Updated**: 2025-01-09  
**Status**: ✅ Production Ready
