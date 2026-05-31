-- Please run this SQL snippet in your Supabase SQL Editor to fix the deletion of team members
-- This updates the foreign keys to automatically set the referencing columns to NULL when a user is deleted.

ALTER TABLE team_members 
  DROP CONSTRAINT team_members_reports_to_fkey, 
  ADD CONSTRAINT team_members_reports_to_fkey FOREIGN KEY (reports_to) REFERENCES team_members(id) ON DELETE SET NULL;

ALTER TABLE projects 
  DROP CONSTRAINT projects_creator_id_fkey, 
  ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE SET NULL;

ALTER TABLE tasks 
  DROP CONSTRAINT tasks_creator_id_fkey, 
  ADD CONSTRAINT tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE SET NULL;

ALTER TABLE tasks 
  DROP CONSTRAINT tasks_assigned_to_fkey, 
  ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES team_members(id) ON DELETE SET NULL;

ALTER TABLE meetings 
  DROP CONSTRAINT meetings_creator_id_fkey, 
  ADD CONSTRAINT meetings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE support_tickets 
  DROP CONSTRAINT support_tickets_creator_id_fkey, 
  ADD CONSTRAINT support_tickets_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE support_tickets 
  DROP CONSTRAINT support_tickets_assignee_id_fkey, 
  ADD CONSTRAINT support_tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES team_members(id) ON DELETE SET NULL;
