-- add support email to site_settings
ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS support_email TEXT;
