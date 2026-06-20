-- add login title and subtitle to site_settings
ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS login_title TEXT;
ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS login_subtitle TEXT;
