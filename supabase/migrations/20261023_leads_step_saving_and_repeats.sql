-- ==============================================================================
-- BHOOKR - Leads Table Migration: Step Saving & Repeat Submissions
-- Safe to execute on existing database:
-- - Adds new columns with defaults if they don't exist
-- - Drops old single-email constraint so repeat visits are preserved
-- - Allows partial step submissions without requiring name/email immediately
-- - Adds unique constraint on session_id for atomic per-visit upserting
-- ==============================================================================

-- 1. Ensure required columns exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_step_completed integer DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_steps integer DEFAULT 9;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS form_status text DEFAULT 'partial';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_repeat boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_lead_id uuid;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pin_code text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Drop old uniqueness constraint on (email, lead_source) to allow repeat submissions
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_source_unique;

-- 3. Make name and email nullable for partial data saves on step 1/2
ALTER TABLE leads ALTER COLUMN name DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;

-- 4. Add unique constraint on session_id so each visit updates its own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_session_id_unique'
  ) THEN
    ALTER TABLE leads ADD CONSTRAINT leads_session_id_unique UNIQUE (session_id);
  END IF;
END $$;

-- 5. Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_leads_session_id ON leads (session_id);
CREATE INDEX IF NOT EXISTS idx_leads_first_lead_id ON leads (first_lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_is_repeat ON leads (is_repeat);
CREATE INDEX IF NOT EXISTS idx_leads_form_status ON leads (form_status);
CREATE INDEX IF NOT EXISTS idx_leads_phone_clean ON leads (phone_number);
