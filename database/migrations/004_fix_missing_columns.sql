-- 004_fix_missing_columns.sql
-- This migration adds the missing JSON columns to various tables.
-- The application relies on these columns to store application state
-- (such as arrays of members or embedded configuration objects).

DO $$
BEGIN

-- 1. Projects
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS freelancer_contract JSONB;

-- 2. Meetings
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS meetings ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]'::jsonb;

-- 3. Team Members
ALTER TABLE IF EXISTS team_members ADD COLUMN IF NOT EXISTS days_off JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS team_members ADD COLUMN IF NOT EXISTS weekly_plan JSONB;

-- 4. Site Settings
ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS meeting_settings JSONB;

END
$$;
