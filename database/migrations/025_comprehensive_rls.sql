-- 025_comprehensive_rls.sql
-- Comprehensive RLS Setup

-- A. public.roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.roles;
DROP POLICY IF EXISTS "roles_select_policy" ON public.roles;
DROP POLICY IF EXISTS "roles_all_policy" ON public.roles;

CREATE POLICY "roles_select_policy_v2" ON public.roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_all_policy_v2" ON public.roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- B. public.team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;

CREATE POLICY "team_members_select_policy_v2" ON public.team_members
  FOR SELECT TO authenticated USING (auth_user_id = auth.uid() OR public.is_admin() OR reports_to = public.get_current_team_member_id());
CREATE POLICY "team_members_insert_policy_v2" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "team_members_update_policy_v2" ON public.team_members
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid() OR public.is_admin()) WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());
CREATE POLICY "team_members_delete_policy_v2" ON public.team_members
  FOR DELETE TO authenticated USING (public.is_admin());

-- C. public.projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;

CREATE POLICY "projects_select_policy_v2" ON public.projects
  FOR SELECT TO authenticated USING (public.is_admin() OR creator_id = public.get_current_team_member_id() OR public.get_current_team_member_id() IN (SELECT (member->>'team_member_id')::int FROM jsonb_array_elements(members) as member));
CREATE POLICY "projects_insert_policy_v2" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.has_permission('manage_projects') OR public.is_admin());
CREATE POLICY "projects_update_policy_v2" ON public.projects
  FOR UPDATE TO authenticated USING (public.has_permission('edit_projects') OR public.is_admin() OR creator_id = public.get_current_team_member_id()) WITH CHECK (public.has_permission('edit_projects') OR public.is_admin() OR creator_id = public.get_current_team_member_id());
CREATE POLICY "projects_delete_policy_v2" ON public.projects
  FOR DELETE TO authenticated USING (public.has_permission('manage_projects') OR public.is_admin());

-- D. public.project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.project_members;
DROP POLICY IF EXISTS "project_members_select_policy" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON public.project_members;

CREATE POLICY "project_members_select_policy_v2" ON public.project_members
  FOR SELECT TO authenticated USING (public.is_admin() OR public.get_current_team_member_id() IN (SELECT (member->>'team_member_id')::int FROM public.projects p, jsonb_array_elements(p.members) as member WHERE p.id = project_members.project_id));
CREATE POLICY "project_members_insert_policy_v2" ON public.project_members
  FOR INSERT TO authenticated WITH CHECK (public.has_permission('manage_projects') OR public.is_admin());
CREATE POLICY "project_members_update_policy_v2" ON public.project_members
  FOR UPDATE TO authenticated USING (public.has_permission('manage_projects') OR public.is_admin()) WITH CHECK (public.has_permission('manage_projects') OR public.is_admin());
CREATE POLICY "project_members_delete_policy_v2" ON public.project_members
  FOR DELETE TO authenticated USING (public.has_permission('manage_projects') OR public.is_admin());

-- E. public.tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

CREATE POLICY "tasks_select_policy_v2" ON public.tasks
  FOR SELECT TO authenticated USING (public.is_admin() OR creator_id = public.get_current_team_member_id() OR assigned_to = public.get_current_team_member_id() OR public.get_current_team_member_id() IN (SELECT team_member_id FROM project_members WHERE project_id = tasks.project_id));
CREATE POLICY "tasks_insert_policy_v2" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (public.has_permission('create_tasks') OR public.is_admin() OR public.get_current_team_member_id() IN (SELECT team_member_id FROM project_members WHERE project_id = tasks.project_id));
CREATE POLICY "tasks_update_policy_v2" ON public.tasks
  FOR UPDATE TO authenticated USING (public.is_admin() OR public.has_permission('manage_projects') OR creator_id = public.get_current_team_member_id() OR (public.has_permission('edit_tasks') AND assigned_to = public.get_current_team_member_id())) WITH CHECK (public.is_admin() OR public.has_permission('manage_projects') OR creator_id = public.get_current_team_member_id() OR (public.has_permission('edit_tasks') AND assigned_to = public.get_current_team_member_id()));
CREATE POLICY "tasks_delete_policy_v2" ON public.tasks
  FOR DELETE TO authenticated USING (public.has_permission('delete_tasks') OR public.is_admin() OR creator_id = public.get_current_team_member_id());

-- F. public.task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_select_policy" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert_policy" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_delete_policy" ON public.task_comments;

CREATE POLICY "task_comments_select_policy_v2" ON public.task_comments
  FOR SELECT TO authenticated USING (public.is_admin() OR public.get_current_team_member_id() IN (SELECT team_member_id FROM project_members WHERE project_id = (SELECT project_id FROM tasks WHERE id = task_comments.task_id)));
CREATE POLICY "task_comments_insert_policy_v2" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (public.has_permission('create_tasks') OR public.is_admin());
CREATE POLICY "task_comments_delete_policy_v2" ON public.task_comments
  FOR DELETE TO authenticated USING (public.is_admin() OR author_id = public.get_current_team_member_id());

-- G. public.task_attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_select_policy" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert_policy" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete_policy" ON public.task_attachments;

CREATE POLICY "task_attachments_select_policy_v2" ON public.task_attachments
  FOR SELECT TO authenticated USING (public.is_admin() OR public.get_current_team_member_id() IN (SELECT team_member_id FROM project_members WHERE project_id = (SELECT project_id FROM tasks WHERE id = task_attachments.task_id)));
CREATE POLICY "task_attachments_insert_policy_v2" ON public.task_attachments
  FOR INSERT TO authenticated WITH CHECK (public.has_permission('create_tasks') OR public.is_admin());
CREATE POLICY "task_attachments_delete_policy_v2" ON public.task_attachments
  FOR DELETE TO authenticated USING (public.has_permission('delete_tasks') OR public.is_admin());

-- H. public.daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_select_policy" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_insert_policy" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_update_policy" ON public.daily_logs;
DROP POLICY IF EXISTS "daily_logs_delete_policy" ON public.daily_logs;

CREATE POLICY "daily_logs_select_policy_v2" ON public.daily_logs
  FOR SELECT TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "daily_logs_insert_policy_v2" ON public.daily_logs
  FOR INSERT TO authenticated WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "daily_logs_update_policy_v2" ON public.daily_logs
  FOR UPDATE TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin()) WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "daily_logs_delete_policy_v2" ON public.daily_logs
  FOR DELETE TO authenticated USING (public.is_admin());

-- I. public.meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.meetings;
DROP POLICY IF EXISTS "meetings_select_policy" ON public.meetings;
DROP POLICY IF EXISTS "meetings_insert_policy" ON public.meetings;
DROP POLICY IF EXISTS "meetings_update_policy" ON public.meetings;
DROP POLICY IF EXISTS "meetings_delete_policy" ON public.meetings;

CREATE POLICY "meetings_select_policy_v2" ON public.meetings
  FOR SELECT TO authenticated USING (public.has_permission('manage_meetings') OR public.is_admin() OR creator_id = public.get_current_team_member_id() OR public.get_current_team_member_id() IN (SELECT jsonb_array_elements_text(members)::int));
CREATE POLICY "meetings_insert_policy_v2" ON public.meetings
  FOR INSERT TO authenticated WITH CHECK (public.has_permission('manage_meetings') OR public.is_admin());
CREATE POLICY "meetings_update_policy_v2" ON public.meetings
  FOR UPDATE TO authenticated USING (public.has_permission('manage_meetings') OR public.is_admin() OR creator_id = public.get_current_team_member_id()) WITH CHECK (public.has_permission('manage_meetings') OR public.is_admin() OR creator_id = public.get_current_team_member_id());
CREATE POLICY "meetings_delete_policy_v2" ON public.meetings
  FOR DELETE TO authenticated USING (public.has_permission('manage_meetings') OR public.is_admin() OR creator_id = public.get_current_team_member_id());

-- J. public.meeting_members
ALTER TABLE public.meeting_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.meeting_members;
DROP POLICY IF EXISTS "meeting_members_select_policy" ON public.meeting_members;
DROP POLICY IF EXISTS "meeting_members_all_policy" ON public.meeting_members;

CREATE POLICY "meeting_members_select_policy_v2" ON public.meeting_members
  FOR SELECT TO authenticated USING (public.is_admin() OR public.get_current_team_member_id() IN (SELECT jsonb_array_elements_text(members)::int FROM public.meetings WHERE id = meeting_members.meeting_id));
CREATE POLICY "meeting_members_all_policy_v2" ON public.meeting_members
  FOR ALL TO authenticated USING (public.has_permission('manage_meetings') OR public.is_admin()) WITH CHECK (public.has_permission('manage_meetings') OR public.is_admin());

-- K. public.leave_requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_delete_policy" ON public.leave_requests;

CREATE POLICY "leave_requests_select_policy_v2" ON public.leave_requests
  FOR SELECT TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "leave_requests_insert_policy_v2" ON public.leave_requests
  FOR INSERT TO authenticated WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "leave_requests_update_policy_v2" ON public.leave_requests
  FOR UPDATE TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin()) WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "leave_requests_delete_policy_v2" ON public.leave_requests
  FOR DELETE TO authenticated USING (public.is_admin());

-- L. public.overtime_requests
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_select_policy" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_insert_policy" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_update_policy" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_delete_policy" ON public.overtime_requests;

CREATE POLICY "overtime_requests_select_policy_v2" ON public.overtime_requests
  FOR SELECT TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "overtime_requests_insert_policy_v2" ON public.overtime_requests
  FOR INSERT TO authenticated WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "overtime_requests_update_policy_v2" ON public.overtime_requests
  FOR UPDATE TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin()) WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "overtime_requests_delete_policy_v2" ON public.overtime_requests
  FOR DELETE TO authenticated USING (public.is_admin());

-- M. public.expense_claims
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.expense_claims;
DROP POLICY IF EXISTS "expense_claims_select_policy" ON public.expense_claims;
DROP POLICY IF EXISTS "expense_claims_insert_policy" ON public.expense_claims;
DROP POLICY IF EXISTS "expense_claims_update_policy" ON public.expense_claims;
DROP POLICY IF EXISTS "expense_claims_delete_policy" ON public.expense_claims;

CREATE POLICY "expense_claims_select_policy_v2" ON public.expense_claims
  FOR SELECT TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "expense_claims_insert_policy_v2" ON public.expense_claims
  FOR INSERT TO authenticated WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "expense_claims_update_policy_v2" ON public.expense_claims
  FOR UPDATE TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin()) WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "expense_claims_delete_policy_v2" ON public.expense_claims
  FOR DELETE TO authenticated USING (public.is_admin());

-- N. public.penalties
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.penalties;
DROP POLICY IF EXISTS "penalties_select_policy" ON public.penalties;
DROP POLICY IF EXISTS "penalties_all_policy" ON public.penalties;

CREATE POLICY "penalties_select_policy_v2" ON public.penalties
  FOR SELECT TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "penalties_all_policy_v2" ON public.penalties
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- P. public.support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_select_policy" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_policy" ON public.support_tickets;

CREATE POLICY "support_tickets_select_policy_v2" ON public.support_tickets
  FOR SELECT TO authenticated USING (creator_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "support_tickets_insert_policy_v2" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "support_tickets_update_policy_v2" ON public.support_tickets
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "support_tickets_delete_policy_v2" ON public.support_tickets
  FOR DELETE TO authenticated USING (public.is_admin());

-- Q. public.ticket_comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_select_policy" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_insert_policy" ON public.ticket_comments;
DROP POLICY IF EXISTS "ticket_comments_delete_policy" ON public.ticket_comments;

CREATE POLICY "ticket_comments_select_policy_v2" ON public.ticket_comments
  FOR SELECT TO authenticated USING (public.is_admin() OR public.get_current_team_member_id() IN (SELECT creator_id FROM public.support_tickets WHERE id = ticket_comments.ticket_id));
CREATE POLICY "ticket_comments_insert_policy_v2" ON public.ticket_comments
  FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.get_current_team_member_id() IN (SELECT creator_id FROM public.support_tickets WHERE id = ticket_comments.ticket_id));
CREATE POLICY "ticket_comments_delete_policy_v2" ON public.ticket_comments
  FOR DELETE TO authenticated USING (public.is_admin());

-- R. public.notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

CREATE POLICY "notifications_select_policy_v2" ON public.notifications
  FOR SELECT TO authenticated USING (recipient_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "notifications_insert_policy_v2" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "notifications_update_policy_v2" ON public.notifications
  FOR UPDATE TO authenticated USING (recipient_id = public.get_current_team_member_id() OR public.is_admin()) WITH CHECK (recipient_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "notifications_delete_policy_v2" ON public.notifications
  FOR DELETE TO authenticated USING (recipient_id = public.get_current_team_member_id() OR public.is_admin());

-- T. public.site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_select_policy" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_all_policy" ON public.site_settings;

CREATE POLICY "site_settings_select_policy_v2" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "site_settings_all_policy_v2" ON public.site_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- U. public.freelancer_contracts
ALTER TABLE public.freelancer_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.freelancer_contracts;
DROP POLICY IF EXISTS "freelancer_contracts_select_policy" ON public.freelancer_contracts;
DROP POLICY IF EXISTS "freelancer_contracts_all_policy" ON public.freelancer_contracts;

CREATE POLICY "freelancer_contracts_select_policy_v2" ON public.freelancer_contracts
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "freelancer_contracts_all_policy_v2" ON public.freelancer_contracts
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- V. public.invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.invites;
DROP POLICY IF EXISTS "Admins can insert invites" ON public.invites;
DROP POLICY IF EXISTS "Token owners or admins can read invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
DROP POLICY IF EXISTS "invites_select_policy" ON public.invites;
DROP POLICY IF EXISTS "invites_insert_policy" ON public.invites;
DROP POLICY IF EXISTS "invites_update_policy" ON public.invites;

CREATE POLICY "invites_select_policy_v2" ON public.invites
  FOR SELECT USING (token IS NOT NULL OR public.is_admin());
CREATE POLICY "invites_insert_policy_v2" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "invites_update_policy_v2" ON public.invites
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
