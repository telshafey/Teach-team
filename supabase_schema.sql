-- Supabase Schema Setup & Seed Data

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they exist (to allow rerunning this script cleanly)
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS penalties CASCADE;
DROP TABLE IF EXISTS expense_claims CASCADE;
DROP TABLE IF EXISTS overtime_requests CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS meeting_members CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS task_attachments CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS freelancer_contracts CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 3. Create Tables

-- Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}'
);

-- Team Members Table
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    auth_user_id UUID, -- References Supabase Auth (auth.users)
    role_id UUID REFERENCES roles(id),
    reports_to INTEGER REFERENCES team_members(id),
    avatar_url TEXT,
    employment_type TEXT NOT NULL,
    salary NUMERIC,
    hourly_rate NUMERIC,
    weekly_hours_requirement NUMERIC,
    days_off TEXT[] DEFAULT '{}',
    weekly_plan JSONB DEFAULT '{"status": "pending", "hours": {}}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'نشط',
    budget_hours NUMERIC,
    budget_amount NUMERIC,
    deadline TIMESTAMP WITH TIME ZONE,
    creator_id INTEGER REFERENCES team_members(id),
    budget_notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project Members Table (Many-to-Many)
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    project_role TEXT NOT NULL DEFAULT 'Member',
    PRIMARY KEY (project_id, team_member_id)
);

-- Freelancer Contracts Table
CREATE TABLE freelancer_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    freelancer_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC,
    hourly_rate NUMERIC,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    creator_id INTEGER REFERENCES team_members(id),
    assigned_to INTEGER REFERENCES team_members(id),
    status TEXT NOT NULL DEFAULT 'todo',
    due_date TIMESTAMP WITH TIME ZONE,
    approval_status TEXT NOT NULL DEFAULT 'approved',
    approval_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Comments Table
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Attachments Table
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploader_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Logs Table (Time Tracking)
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    hours NUMERIC NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings Table
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    room_name TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    creator_id INTEGER REFERENCES team_members(id),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Members Table (Many-to-Many)
CREATE TABLE meeting_members (
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    has_joined BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (meeting_id, team_member_id)
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT,
    task_title TEXT,
    assigner_name TEXT,
    assignee_name TEXT,
    comment_author_name TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave Requests Table
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    manager_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Overtime Requests Table
CREATE TABLE overtime_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    requested_hours NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    manager_notes TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Claims Table
CREATE TABLE expense_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Penalties Table
CREATE TABLE penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    issuer_id INTEGER REFERENCES team_members(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    appeal_reason TEXT,
    manager_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    creator_id INTEGER REFERENCES team_members(id),
    assignee_id INTEGER REFERENCES team_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. Seed Initial Data
-- ==========================================

-- We will allow anon access to everything for this prototype

ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE penalties DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments DISABLE ROW LEVEL SECURITY;


-- Seed Roles
INSERT INTO roles (id, name, permissions) VALUES 
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'المدير العام (GM)', ARRAY['manage_projects', 'manage_team', 'view_finances', 'manage_roles', 'manage_site_settings', 'view_reports', 'view_analytics']),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'مدير (Manager)', ARRAY['manage_projects', 'create_tasks', 'approve_task_submissions', 'approve_weekly_plans', 'view_reports']),
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'موظف (Employee)', ARRAY['edit_tasks']),
('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90', 'مستقل (Freelancer)', ARRAY['edit_tasks']);

-- Seed Team Members
INSERT INTO team_members (id, name, email, role_id, employment_type, salary, weekly_hours_requirement) VALUES 
(1, 'أحمد محمود', 'ahmed@company.com', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'full-time', 25000, 40),
(2, 'سارة خالد', 'sara@company.com', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'full-time', 15000, 40),
(3, 'عمر زيد', 'omar@company.com', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'full-time', 8000, 40);

-- Make Sara report to Ahmed, Omar report to Sara
UPDATE team_members SET reports_to = 1 WHERE id = 2;
UPDATE team_members SET reports_to = 2 WHERE id = 3;

-- Seed Project
INSERT INTO projects (id, name, description, status, creator_id) VALUES 
('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f90a1', 'مشروع ألفا', 'تطوير تطبيق جديد للسوق المحلي', 'نشط', 1);

-- Assign Members to Project
INSERT INTO project_members (project_id, team_member_id, project_role) VALUES 
('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f90a1', 1, 'Manager'),
('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f90a1', 2, 'Manager'),
('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f90a1', 3, 'Member');

-- Seed Tasks
INSERT INTO tasks (id, title, project_id, creator_id, assigned_to, status, approval_status) VALUES 
('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f90a1b2', 'تجهيز التصميم المبدئي', 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f90a1', 2, 3, 'todo', 'pending');

-- ==========================================
-- 3. Settings Configuration
-- ==========================================

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  app_name TEXT NOT NULL DEFAULT 'Bokra Team',
  logo_url TEXT,
  theme_color TEXT NOT NULL DEFAULT '#0284c7',
  currency TEXT NOT NULL DEFAULT 'USD',
  overtime_rate_multiplier FLOAT NOT NULL DEFAULT 1.5,
  log_editing_days_limit INTEGER NOT NULL DEFAULT 1,
  is_finance_module_enabled BOOLEAN NOT NULL DEFAULT true,
  is_meetings_module_enabled BOOLEAN NOT NULL DEFAULT true,
  is_analytics_module_enabled BOOLEAN NOT NULL DEFAULT true,
  is_reports_module_enabled BOOLEAN NOT NULL DEFAULT true,
  meeting_settings JSONB DEFAULT '{}'::jsonb
);

-- Ensure there is one row
INSERT INTO site_settings (id, app_name) VALUES ('1', 'Bokra Team') ON CONFLICT (id) DO NOTHING;

-- RLS for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings are viewable by everyone" ON site_settings;
CREATE POLICY "Settings are viewable by everyone" 
ON site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Settings are editable by authorized roles" ON site_settings;
CREATE POLICY "Settings are editable by authorized roles" 
ON site_settings FOR UPDATE USING (true);

-- ==========================================
-- 4. Storage Buckets
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site_assets', 'site_assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- For this prototype, allow all access to site_assets bucket
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT USING ( bucket_id = 'site_assets' );

DROP POLICY IF EXISTS "Upload Access" ON storage.objects;
CREATE POLICY "Upload Access"
ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'site_assets' );

DROP POLICY IF EXISTS "Update Access" ON storage.objects;
CREATE POLICY "Update Access"
ON storage.objects FOR UPDATE USING ( bucket_id = 'site_assets' );

DROP POLICY IF EXISTS "Delete Access" ON storage.objects;
CREATE POLICY "Delete Access"
ON storage.objects FOR DELETE USING ( bucket_id = 'site_assets' );

