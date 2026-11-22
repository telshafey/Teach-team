-- Add description column to tasks table if it doesn't already exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
