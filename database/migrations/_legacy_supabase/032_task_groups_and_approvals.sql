-- Phase 1: Task Groups and Approvals

-- 1. Create Task Groups table
CREATE TABLE IF NOT EXISTS public.task_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Task Group Members table
CREATE TABLE IF NOT EXISTS public.task_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_group_id UUID REFERENCES public.task_groups(id) ON DELETE CASCADE,
    team_member_id BIGINT REFERENCES public.team_members(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member' CHECK (role IN ('Manager', 'Member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_group_id, team_member_id)
);

-- 3. Add task_group_id to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_group_id UUID REFERENCES public.task_groups(id) ON DELETE SET NULL;

-- 4. Add auto_approve fields
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS auto_approve_tasks BOOLEAN DEFAULT false;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS auto_approve_tasks BOOLEAN DEFAULT false;

-- 5. Enable RLS
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_group_members ENABLE ROW LEVEL SECURITY;

-- Simple policies (security mostly handled in backend endpoints)
CREATE POLICY "Allow select for authenticated users" ON public.task_groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow select for authenticated users" ON public.task_group_members FOR SELECT USING (auth.role() = 'authenticated');
