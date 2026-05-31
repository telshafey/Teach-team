-- Please run this SQL snippet in your Supabase SQL Editor to fix the team members insertion issue:
-- This updates the auto-increment sequence to start after the seeded data.
SELECT setval(pg_get_serial_sequence('team_members', 'id'), coalesce(max(id),0) + 1, false) FROM team_members;
