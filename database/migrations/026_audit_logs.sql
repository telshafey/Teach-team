CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id integer REFERENCES public.team_members(id),
  actor_email text,
  action text NOT NULL CHECK (action IN (
    'task_created', 'task_updated', 'task_deleted',
    'project_created', 'project_updated', 'project_deleted',
    'member_created', 'member_updated', 'member_deleted',
    'invite_created', 'invite_revoked', 'invite_accepted',
    'settings_updated',
    'login', 'logout', 'password_changed'
  )),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'project', 'member', 'invite', 'settings', 'auth')),
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);
