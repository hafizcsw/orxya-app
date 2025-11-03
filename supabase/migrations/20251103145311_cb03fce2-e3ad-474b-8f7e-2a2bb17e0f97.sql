-- Fix 5: Migrate TOKEN_ENC_KEY to Supabase Vault
-- Note: The actual secret value needs to be inserted manually via Supabase dashboard
-- This migration creates the infrastructure to use vault secrets

-- Ensure vault extension is available
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Create a function to safely retrieve the encryption key from vault
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_value text;
BEGIN
  -- Try to get from vault first, fallback to env var for backwards compatibility
  SELECT decrypted_secret INTO key_value
  FROM vault.decrypted_secrets
  WHERE name = 'token_enc_key'
  LIMIT 1;
  
  -- If not found in vault, use environment variable (legacy)
  IF key_value IS NULL THEN
    key_value := current_setting('app.settings.token_enc_key', true);
  END IF;
  
  RETURN key_value;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION private.get_encryption_key() TO service_role;

COMMENT ON FUNCTION private.get_encryption_key() IS 'Retrieves encryption key from Vault (preferred) or falls back to environment variable. Migrate by running: SELECT vault.create_secret(''your-current-key-value'', ''token_enc_key'');';