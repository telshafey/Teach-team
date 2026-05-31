-- Fix team_members
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_reports_to_fkey;
ALTER TABLE team_members ADD CONSTRAINT team_members_reports_to_fkey FOREIGN KEY (reports_to) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_creator_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix tasks
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_creator_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE SET NULL;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix meetings
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_creator_id_fkey;
ALTER TABLE meetings ADD CONSTRAINT meetings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix support_tickets
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_creator_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES team_members(id) ON DELETE SET NULL;

ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assignee_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES team_members(id) ON DELETE SET NULL;
