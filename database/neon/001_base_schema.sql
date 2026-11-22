-- =====================================================================
-- 001_base_schema.sql
-- الـ schema الكامل لـ public مأخوذ من نسخة Supabase بتاريخ 2026-07-26
-- (27 جدول، 118 سياسة RLS، 10 دوال). اتشال منه الحاجات الخاصة بـ Supabase:
-- دوال update_user_password_v2/v4/v5 (مش مستخدمة في الكود، وتغيير الباسورد
-- هيبقى من السيرفر) والـ event trigger rls_auto_enable.
-- =====================================================================

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auto_confirm_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_confirm_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION auto_confirm_email(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: get_current_member_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_member_id() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$;

--
-- Name: FUNCTION get_current_member_id(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: get_current_member_permissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_member_permissions() RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_perms TEXT[];
BEGIN
  SELECT roles.permissions INTO v_perms
  FROM public.team_members 
  JOIN public.roles ON team_members.role_id = roles.id 
  WHERE team_members.auth_user_id = auth.uid() LIMIT 1;
  
  RETURN COALESCE(v_perms, '{}'::TEXT[]);
END;
$$;

--
-- Name: FUNCTION get_current_member_permissions(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: get_current_team_member_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_team_member_id() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    tm_id integer;
BEGIN
    SELECT id INTO tm_id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
    RETURN tm_id;
END;
$$;

--
-- Name: FUNCTION get_current_team_member_id(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: get_my_accessible_projects(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_accessible_projects() RETURNS SETOF uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY 
  SELECT project_id FROM public.project_members WHERE team_member_id IN (SELECT public.get_my_hierarchy());
END;
$$;

--
-- Name: FUNCTION get_my_accessible_projects(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: get_my_hierarchy(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_hierarchy() RETURNS SETOF integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_me INTEGER;
BEGIN
  v_me := public.get_current_member_id();
  
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT v_me;
  
  RETURN QUERY
  WITH RECURSIVE subs AS (
    SELECT id, ARRAY[id] as visited FROM public.team_members WHERE reports_to = v_me
    UNION ALL
    SELECT tm.id, s.visited || tm.id 
    FROM public.team_members tm
    INNER JOIN subs s ON tm.reports_to = s.id
    WHERE tm.id <> ALL(s.visited)
  )
  SELECT id FROM subs;
END;
$$;

--
-- Name: FUNCTION get_my_hierarchy(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: get_my_manager_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_manager_id() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_manager_id INTEGER;
BEGIN
  SELECT reports_to INTO v_manager_id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
  RETURN v_manager_id;
END;
$$;

--
-- Name: FUNCTION get_my_manager_id(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- التحقق من وجود المستخدم بالإيميل أولاً
  IF EXISTS (SELECT 1 FROM public.team_members WHERE email = NEW.email) THEN
    -- تحديث الحساب الحالي وربطه
    UPDATE public.team_members SET auth_user_id = NEW.id WHERE email = NEW.email;
  ELSE
    -- إنشاء مستخدم جديد
    INSERT INTO public.team_members (auth_user_id, email, name, employment_type, avatar_url)
    VALUES (
      NEW.id, 
      NEW.email, 
      SPLIT_PART(NEW.email, '@', 1), 
      'full-time',
      'https://api.dicebear.com/8.x/initials/svg?seed=' || SPLIT_PART(NEW.email, '@', 1)
    );
  END IF;
  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION handle_new_user(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: has_permission(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_permission(req_permission text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    has_perm boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.roles r ON tm.role_id = r.id
        WHERE tm.auth_user_id = auth.uid()
        AND req_permission = ANY(r.permissions)
    ) INTO has_perm;
    RETURN has_perm;
END;
$$;

--
-- Name: FUNCTION has_permission(req_permission text); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    is_admin boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.roles r ON tm.role_id = r.id
        WHERE tm.auth_user_id = auth.uid()
        AND 'manage_team' = ANY(r.permissions)
    ) INTO is_admin;
    RETURN is_admin;
END;
$$;

--
-- Name: FUNCTION is_admin(); Type: COMMENT; Schema: public; Owner: -
--

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id integer,
    actor_email text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['task_created'::text, 'task_updated'::text, 'task_deleted'::text, 'project_created'::text, 'project_updated'::text, 'project_deleted'::text, 'member_created'::text, 'member_updated'::text, 'member_deleted'::text, 'invite_created'::text, 'invite_revoked'::text, 'invite_accepted'::text, 'settings_updated'::text, 'login'::text, 'logout'::text, 'password_changed'::text]))),
    CONSTRAINT audit_logs_entity_type_check CHECK ((entity_type = ANY (ARRAY['task'::text, 'project'::text, 'member'::text, 'invite'::text, 'settings'::text, 'auth'::text])))
);

--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_member_id integer,
    project_id uuid,
    task_id uuid,
    date date NOT NULL,
    hours numeric NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: expense_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_claims (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_member_id integer,
    amount numeric NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    project_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: freelancer_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freelancer_contracts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid,
    freelancer_id integer,
    type text NOT NULL,
    amount numeric,
    hourly_rate numeric,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role_id uuid,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    token text NOT NULL,
    used boolean DEFAULT false
);

--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_member_id integer,
    type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    manager_notes text,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: meeting_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_members (
    meeting_id uuid NOT NULL,
    team_member_id integer NOT NULL,
    has_joined boolean DEFAULT false
);

--
-- Name: meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    room_name text NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    creator_id integer,
    project_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    members jsonb DEFAULT '[]'::jsonb,
    attendees jsonb DEFAULT '[]'::jsonb
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    recipient_id integer,
    type text NOT NULL,
    message text,
    task_title text,
    assigner_name text,
    assignee_name text,
    comment_author_name text,
    project_id uuid,
    task_id uuid,
    read boolean DEFAULT false,
    "timestamp" timestamp with time zone DEFAULT now()
);

--
-- Name: overtime_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.overtime_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_member_id integer,
    week_start_date date NOT NULL,
    requested_hours numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    manager_notes text,
    project_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: penalties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.penalties (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_member_id integer,
    issuer_id integer,
    date date NOT NULL,
    amount numeric NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    appeal_reason text,
    manager_notes text,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    team_member_id integer NOT NULL,
    project_role text DEFAULT 'Member'::text NOT NULL
);

--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'نشط'::text NOT NULL,
    budget_hours numeric,
    budget_amount numeric,
    deadline timestamp with time zone,
    creator_id integer,
    budget_notification_sent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    members jsonb DEFAULT '[]'::jsonb,
    freelancer_contract jsonb,
    auto_approve_tasks boolean DEFAULT false
);

--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL
);

--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id text DEFAULT '1'::text NOT NULL,
    app_name text DEFAULT 'Bokra Team'::text NOT NULL,
    logo_url text,
    theme_color text DEFAULT '#0284c7'::text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    overtime_rate_multiplier double precision DEFAULT 1.5 NOT NULL,
    log_editing_days_limit integer DEFAULT 1 NOT NULL,
    is_finance_module_enabled boolean DEFAULT true NOT NULL,
    is_meetings_module_enabled boolean DEFAULT true NOT NULL,
    is_analytics_module_enabled boolean DEFAULT true NOT NULL,
    is_reports_module_enabled boolean DEFAULT true NOT NULL,
    meeting_settings jsonb DEFAULT '{}'::jsonb,
    login_title text,
    login_subtitle text,
    support_email text
);

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    priority text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    creator_id integer,
    assignee_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_id uuid,
    file_name text NOT NULL,
    file_url text NOT NULL,
    uploader_id integer,
    "timestamp" timestamp with time zone DEFAULT now()
);

--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_id uuid,
    author_id integer,
    text text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now()
);

--
-- Name: task_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_group_id uuid,
    team_member_id bigint,
    role text DEFAULT 'Member'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_group_members_role_check CHECK ((role = ANY (ARRAY['Manager'::text, 'Member'::text])))
);

--
-- Name: task_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    project_id uuid,
    creator_id integer,
    assigned_to integer,
    status text DEFAULT 'todo'::text NOT NULL,
    due_date timestamp with time zone,
    approval_status text DEFAULT 'approved'::text NOT NULL,
    approval_notes text,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    task_group_id uuid,
    auto_approve boolean DEFAULT false
);

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    auth_user_id uuid,
    role_id uuid,
    reports_to integer,
    avatar_url text,
    employment_type text NOT NULL,
    salary numeric,
    hourly_rate numeric,
    weekly_hours_requirement numeric,
    days_off text[] DEFAULT '{}'::text[],
    weekly_plan jsonb DEFAULT '{"hours": {}, "status": "pending"}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    auto_approve_tasks boolean DEFAULT false
);

--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;

--
-- Name: ticket_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    ticket_id uuid,
    author_id integer,
    text text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    theme text DEFAULT 'system'::text,
    language text DEFAULT 'ar'::text,
    notifications_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: work_contract_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_contract_change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_member_id integer NOT NULL,
    reason text NOT NULL,
    current_weekly_hours numeric,
    current_salary numeric,
    requested_weekly_hours numeric NOT NULL,
    requested_salary numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    manager_notes text,
    approved_weekly_hours numeric,
    approved_salary numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: customers customers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_name_key UNIQUE (name);

--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);

--
-- Name: expense_claims expense_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_claims
    ADD CONSTRAINT expense_claims_pkey PRIMARY KEY (id);

--
-- Name: freelancer_contracts freelancer_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_contracts
    ADD CONSTRAINT freelancer_contracts_pkey PRIMARY KEY (id);

--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);

--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);

--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);

--
-- Name: meeting_members meeting_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_members
    ADD CONSTRAINT meeting_members_pkey PRIMARY KEY (meeting_id, team_member_id);

--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: overtime_requests overtime_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_pkey PRIMARY KEY (id);

--
-- Name: penalties penalties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penalties
    ADD CONSTRAINT penalties_pkey PRIMARY KEY (id);

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, team_member_id);

--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);

--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);

--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);

--
-- Name: task_group_members task_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_group_members
    ADD CONSTRAINT task_group_members_pkey PRIMARY KEY (id);

--
-- Name: task_group_members task_group_members_task_group_id_team_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_group_members
    ADD CONSTRAINT task_group_members_task_group_id_team_member_id_key UNIQUE (task_group_id, team_member_id);

--
-- Name: task_groups task_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_groups
    ADD CONSTRAINT task_groups_pkey PRIMARY KEY (id);

--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

--
-- Name: team_members team_members_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_email_key UNIQUE (email);

--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);

--
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);

--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);

--
-- Name: work_contract_change_requests work_contract_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_contract_change_requests
    ADD CONSTRAINT work_contract_change_requests_pkey PRIMARY KEY (id);

--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.team_members(id);

--
-- Name: daily_logs daily_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

--
-- Name: daily_logs daily_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

--
-- Name: daily_logs daily_logs_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: expense_claims expense_claims_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_claims
    ADD CONSTRAINT expense_claims_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: expense_claims expense_claims_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_claims
    ADD CONSTRAINT expense_claims_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: freelancer_contracts freelancer_contracts_freelancer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_contracts
    ADD CONSTRAINT freelancer_contracts_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: freelancer_contracts freelancer_contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelancer_contracts
    ADD CONSTRAINT freelancer_contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: invites invites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.team_members(id);

--
-- Name: invites invites_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);

--
-- Name: leave_requests leave_requests_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: meeting_members meeting_members_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_members
    ADD CONSTRAINT meeting_members_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;

--
-- Name: meeting_members meeting_members_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_members
    ADD CONSTRAINT meeting_members_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: meetings meetings_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: meetings meetings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

--
-- Name: overtime_requests overtime_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: overtime_requests overtime_requests_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: penalties penalties_issuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penalties
    ADD CONSTRAINT penalties_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: penalties penalties_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penalties
    ADD CONSTRAINT penalties_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: project_members project_members_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: projects projects_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: support_tickets support_tickets_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: support_tickets support_tickets_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

--
-- Name: task_attachments task_attachments_uploader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: task_comments task_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

--
-- Name: task_group_members task_group_members_task_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_group_members
    ADD CONSTRAINT task_group_members_task_group_id_fkey FOREIGN KEY (task_group_id) REFERENCES public.task_groups(id) ON DELETE CASCADE;

--
-- Name: task_group_members task_group_members_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_group_members
    ADD CONSTRAINT task_group_members_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: task_groups task_groups_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_groups
    ADD CONSTRAINT task_groups_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: tasks tasks_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

--
-- Name: tasks tasks_task_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_task_group_id_fkey FOREIGN KEY (task_group_id) REFERENCES public.task_groups(id) ON DELETE SET NULL;

--
-- Name: team_members team_members_reports_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_reports_to_fkey FOREIGN KEY (reports_to) REFERENCES public.team_members(id) ON DELETE SET NULL;

--
-- Name: team_members team_members_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);

--
-- Name: ticket_comments ticket_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: ticket_comments ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: work_contract_change_requests work_contract_change_requests_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_contract_change_requests
    ADD CONSTRAINT work_contract_change_requests_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;

--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles USING ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::text)))));

--
-- Name: customers Admins have full access to customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins have full access to customers" ON public.customers USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

--
-- Name: task_group_members Allow select for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for authenticated users" ON public.task_group_members FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: task_groups Allow select for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select for authenticated users" ON public.task_groups FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: team_members Allow users to insert their own account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to insert their own account" ON public.team_members FOR INSERT WITH CHECK (((auth_user_id = auth.uid()) AND (email = (auth.jwt() ->> 'email'::text))));

--
-- Name: team_members Allow users to link their own account; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to link their own account" ON public.team_members FOR UPDATE USING (((auth_user_id = auth.uid()) OR ((auth_user_id IS NULL) AND (email = (auth.jwt() ->> 'email'::text)))));

--
-- Name: notifications Anyone can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));

--
-- Name: daily_logs Delete daily logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Delete daily logs" ON public.daily_logs FOR DELETE USING ((team_member_id = public.get_current_member_id()));

--
-- Name: daily_logs Insert daily logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Insert daily logs" ON public.daily_logs FOR INSERT WITH CHECK ((team_member_id = public.get_current_member_id()));

--
-- Name: roles Manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Manage roles" ON public.roles USING (public.has_permission('manage_roles'::text));

--
-- Name: team_members Manage team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Manage team members" ON public.team_members USING (public.has_permission('manage_team'::text));

--
-- Name: daily_logs Update daily logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Update daily logs" ON public.daily_logs FOR UPDATE USING ((team_member_id = public.get_current_member_id()));

--
-- Name: notifications Users can read own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));

--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL));

--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));

--
-- Name: daily_logs View daily logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View daily logs" ON public.daily_logs FOR SELECT USING ((public.has_permission('view_reports'::text) OR public.has_permission('manage_team'::text) OR (team_member_id IN ( SELECT public.get_my_hierarchy() AS get_my_hierarchy))));

--
-- Name: leave_requests View leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View leave requests" ON public.leave_requests FOR SELECT USING ((public.has_permission('approve_leave_requests'::text) OR public.has_permission('manage_team'::text) OR (team_member_id IN ( SELECT public.get_my_hierarchy() AS get_my_hierarchy))));

--
-- Name: overtime_requests View overtime requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View overtime requests" ON public.overtime_requests FOR SELECT USING ((public.has_permission('approve_overtime'::text) OR public.has_permission('manage_team'::text) OR (team_member_id IN ( SELECT public.get_my_hierarchy() AS get_my_hierarchy))));

--
-- Name: penalties View penalties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View penalties" ON public.penalties FOR SELECT USING ((public.has_permission('approve_penalties'::text) OR public.has_permission('manage_team'::text) OR (team_member_id IN ( SELECT public.get_my_hierarchy() AS get_my_hierarchy))));

--
-- Name: roles View roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View roles" ON public.roles FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));

--
-- Name: team_members View team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View team members" ON public.team_members FOR SELECT USING (((auth_user_id = auth.uid()) OR public.has_permission('manage_team'::text) OR public.has_permission('manage_projects'::text) OR public.has_permission('create_tasks'::text) OR (id IN ( SELECT public.get_my_hierarchy() AS get_my_hierarchy)) OR (id = public.get_my_manager_id()) OR (EXISTS ( SELECT 1
   FROM (public.project_members pm1
     JOIN public.project_members pm2 ON ((pm1.project_id = pm2.project_id)))
  WHERE ((pm1.team_member_id = public.get_current_member_id()) AND (pm2.team_member_id = team_members.id))))));

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_insert_system; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_insert_system ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

--
-- Name: audit_logs audit_logs_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_select_admin ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_logs daily_logs_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_logs_all_policy ON public.daily_logs USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: daily_logs daily_logs_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_logs_delete_policy_v2 ON public.daily_logs FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: daily_logs daily_logs_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_logs_insert_policy_v2 ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: daily_logs daily_logs_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_logs_select_policy_v2 ON public.daily_logs FOR SELECT TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: daily_logs daily_logs_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_logs_update_policy_v2 ON public.daily_logs FOR UPDATE TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin())) WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: expense_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_claims expense_claims_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_claims_all_policy ON public.expense_claims USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: expense_claims expense_claims_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_claims_delete_policy_v2 ON public.expense_claims FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: expense_claims expense_claims_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_claims_insert_policy_v2 ON public.expense_claims FOR INSERT TO authenticated WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: expense_claims expense_claims_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_claims_select_policy_v2 ON public.expense_claims FOR SELECT TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: expense_claims expense_claims_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expense_claims_update_policy_v2 ON public.expense_claims FOR UPDATE TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin())) WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: freelancer_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freelancer_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: freelancer_contracts freelancer_contracts_all_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_contracts_all_policy_v2 ON public.freelancer_contracts TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: freelancer_contracts freelancer_contracts_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY freelancer_contracts_select_policy_v2 ON public.freelancer_contracts FOR SELECT TO authenticated USING (public.is_admin());

--
-- Name: invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

--
-- Name: invites invites_delete_policy_final; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invites_delete_policy_final ON public.invites FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: invites invites_insert_policy_final; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invites_insert_policy_final ON public.invites FOR INSERT TO authenticated WITH CHECK (public.is_admin());

--
-- Name: invites invites_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invites_insert_policy_v2 ON public.invites FOR INSERT TO authenticated WITH CHECK (public.is_admin());

--
-- Name: invites invites_select_policy_final; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invites_select_policy_final ON public.invites FOR SELECT TO authenticated USING (public.is_admin());

--
-- Name: invites invites_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invites_select_policy_v2 ON public.invites FOR SELECT USING (public.is_admin());

--
-- Name: invites invites_update_policy_final; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invites_update_policy_final ON public.invites FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: invites invites_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invites_update_policy_v2 ON public.invites FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: leave_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_requests leave_requests_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_all_policy ON public.leave_requests USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: leave_requests leave_requests_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_delete_policy_v2 ON public.leave_requests FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: leave_requests leave_requests_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_insert_policy_v2 ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: leave_requests leave_requests_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_select_policy_v2 ON public.leave_requests FOR SELECT TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: leave_requests leave_requests_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_update_policy_v2 ON public.leave_requests FOR UPDATE TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin())) WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: meeting_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_members ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_members meeting_members_all_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_members_all_policy_v2 ON public.meeting_members TO authenticated USING ((public.has_permission('manage_meetings'::text) OR public.is_admin())) WITH CHECK ((public.has_permission('manage_meetings'::text) OR public.is_admin()));

--
-- Name: meeting_members meeting_members_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_members_select_policy_v2 ON public.meeting_members FOR SELECT TO authenticated USING ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT (jsonb_array_elements_text(meetings.members))::integer AS jsonb_array_elements_text
   FROM public.meetings
  WHERE (meetings.id = meeting_members.meeting_id)))));

--
-- Name: meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: meetings meetings_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_delete ON public.meetings FOR DELETE USING ((public.has_permission('manage_meetings'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id())));

--
-- Name: meetings meetings_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_delete_policy_v2 ON public.meetings FOR DELETE TO authenticated USING ((public.has_permission('manage_meetings'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id())));

--
-- Name: meetings meetings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.has_permission('manage_meetings'::text) OR public.is_admin()));

--
-- Name: meetings meetings_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_insert_policy_v2 ON public.meetings FOR INSERT TO authenticated WITH CHECK ((public.has_permission('manage_meetings'::text) OR public.is_admin()));

--
-- Name: meetings meetings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.has_permission('manage_meetings'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id()) OR (members @> ((('['::text || public.get_current_team_member_id()) || ']'::text))::jsonb)));

--
-- Name: meetings meetings_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_select_policy_v2 ON public.meetings FOR SELECT TO authenticated USING ((public.has_permission('manage_meetings'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id()) OR (public.get_current_team_member_id() IN ( SELECT (jsonb_array_elements_text(meetings.members))::integer AS jsonb_array_elements_text))));

--
-- Name: meetings meetings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.has_permission('manage_meetings'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id()) OR (members @> ((('['::text || public.get_current_team_member_id()) || ']'::text))::jsonb)));

--
-- Name: meetings meetings_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meetings_update_policy_v2 ON public.meetings FOR UPDATE TO authenticated USING ((public.has_permission('manage_meetings'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id()))) WITH CHECK ((public.has_permission('manage_meetings'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id())));

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_all_policy ON public.notifications USING (((recipient_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: notifications notifications_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_delete_policy_v2 ON public.notifications FOR DELETE TO authenticated USING (((recipient_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: notifications notifications_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_policy_v2 ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin());

--
-- Name: notifications notifications_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_policy_v2 ON public.notifications FOR SELECT TO authenticated USING (((recipient_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: notifications notifications_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_policy_v2 ON public.notifications FOR UPDATE TO authenticated USING (((recipient_id = public.get_current_team_member_id()) OR public.is_admin())) WITH CHECK (((recipient_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: overtime_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: overtime_requests overtime_requests_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY overtime_requests_all_policy ON public.overtime_requests USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: overtime_requests overtime_requests_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY overtime_requests_delete_policy_v2 ON public.overtime_requests FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: overtime_requests overtime_requests_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY overtime_requests_insert_policy_v2 ON public.overtime_requests FOR INSERT TO authenticated WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: overtime_requests overtime_requests_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY overtime_requests_select_policy_v2 ON public.overtime_requests FOR SELECT TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: overtime_requests overtime_requests_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY overtime_requests_update_policy_v2 ON public.overtime_requests FOR UPDATE TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin())) WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: penalties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

--
-- Name: penalties penalties_all_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY penalties_all_policy_v2 ON public.penalties TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: penalties penalties_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY penalties_select_policy_v2 ON public.penalties FOR SELECT TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members project_members_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_delete_policy_v2 ON public.project_members FOR DELETE TO authenticated USING ((public.has_permission('manage_projects'::text) OR public.is_admin()));

--
-- Name: project_members project_members_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_insert_policy_v2 ON public.project_members FOR INSERT TO authenticated WITH CHECK ((public.has_permission('manage_projects'::text) OR public.is_admin()));

--
-- Name: project_members project_members_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_select_policy_v2 ON public.project_members FOR SELECT TO authenticated USING ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT ((member.value ->> 'team_member_id'::text))::integer AS int4
   FROM public.projects p,
    LATERAL jsonb_array_elements(p.members) member(value)
  WHERE (p.id = project_members.project_id)))));

--
-- Name: project_members project_members_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_update_policy_v2 ON public.project_members FOR UPDATE TO authenticated USING ((public.has_permission('manage_projects'::text) OR public.is_admin())) WITH CHECK ((public.has_permission('manage_projects'::text) OR public.is_admin()));

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_delete ON public.projects FOR DELETE USING ((public.has_permission('manage_projects'::text) OR public.is_admin()));

--
-- Name: projects projects_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_delete_policy_v2 ON public.projects FOR DELETE TO authenticated USING ((public.has_permission('manage_projects'::text) OR public.is_admin()));

--
-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert ON public.projects FOR INSERT WITH CHECK ((public.has_permission('manage_projects'::text) OR public.is_admin()));

--
-- Name: projects projects_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert_policy_v2 ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.has_permission('manage_projects'::text) OR public.is_admin()));

--
-- Name: projects projects_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_select ON public.projects FOR SELECT USING ((public.has_permission('manage_projects'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id()) OR (members @> ((('[{"team_member_id": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb) OR (members @> ((('[{"teamMemberId": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb)));

--
-- Name: projects projects_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_select_policy_v2 ON public.projects FOR SELECT TO authenticated USING ((public.is_admin() OR (creator_id = public.get_current_team_member_id()) OR (public.get_current_team_member_id() IN ( SELECT ((member.value ->> 'team_member_id'::text))::integer AS int4
   FROM jsonb_array_elements(projects.members) member(value)))));

--
-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_update ON public.projects FOR UPDATE USING ((public.has_permission('edit_projects'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id())));

--
-- Name: projects projects_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_update_policy_v2 ON public.projects FOR UPDATE TO authenticated USING ((public.has_permission('edit_projects'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id()))) WITH CHECK ((public.has_permission('edit_projects'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id())));

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_all_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_all_policy_v2 ON public.roles TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: roles roles_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_select_policy_v2 ON public.roles FOR SELECT TO authenticated USING (true);

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings site_settings_all_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY site_settings_all_policy_v2 ON public.site_settings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: site_settings site_settings_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY site_settings_select_policy_v2 ON public.site_settings FOR SELECT USING (true);

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets support_tickets_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_delete_policy_v2 ON public.support_tickets FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: support_tickets support_tickets_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_insert_policy_v2 ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (true);

--
-- Name: support_tickets support_tickets_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_select_policy_v2 ON public.support_tickets FOR SELECT TO authenticated USING (((creator_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: support_tickets support_tickets_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY support_tickets_update_policy_v2 ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: task_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_attachments task_attachments_delete_policy_v3; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_delete_policy_v3 ON public.task_attachments FOR DELETE TO authenticated USING ((public.is_admin() OR (uploader_id = public.get_current_team_member_id())));

--
-- Name: task_attachments task_attachments_insert_policy_v3; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_insert_policy_v3 ON public.task_attachments FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT p.creator_id
   FROM public.projects p
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_attachments.task_id)))
UNION
 SELECT ((member.value ->> 'team_member_id'::text))::integer AS int4
   FROM public.projects p,
    LATERAL jsonb_array_elements(p.members) member(value)
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_attachments.task_id)))))));

--
-- Name: task_attachments task_attachments_select_policy_v3; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_select_policy_v3 ON public.task_attachments FOR SELECT TO authenticated USING ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT p.creator_id
   FROM public.projects p
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_attachments.task_id)))
UNION
 SELECT ((member.value ->> 'team_member_id'::text))::integer AS int4
   FROM public.projects p,
    LATERAL jsonb_array_elements(p.members) member(value)
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_attachments.task_id)))))));

--
-- Name: task_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_comments task_comments_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_delete_policy_v2 ON public.task_comments FOR DELETE TO authenticated USING ((public.is_admin() OR (author_id = public.get_current_team_member_id())));

--
-- Name: task_comments task_comments_insert_policy_v3; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_insert_policy_v3 ON public.task_comments FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT p.creator_id
   FROM public.projects p
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_comments.task_id)))
UNION
 SELECT ((member.value ->> 'team_member_id'::text))::integer AS int4
   FROM public.projects p,
    LATERAL jsonb_array_elements(p.members) member(value)
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_comments.task_id)))))));

--
-- Name: task_comments task_comments_select_policy_v3; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_select_policy_v3 ON public.task_comments FOR SELECT TO authenticated USING ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT p.creator_id
   FROM public.projects p
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_comments.task_id)))
UNION
 SELECT ((member.value ->> 'team_member_id'::text))::integer AS int4
   FROM public.projects p,
    LATERAL jsonb_array_elements(p.members) member(value)
  WHERE (p.id = ( SELECT tasks.project_id
           FROM public.tasks
          WHERE (tasks.id = task_comments.task_id)))))));

--
-- Name: task_group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: task_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_delete ON public.tasks FOR DELETE USING ((public.has_permission('delete_tasks'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id())));

--
-- Name: tasks tasks_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_delete_policy_v2 ON public.tasks FOR DELETE TO authenticated USING ((public.has_permission('delete_tasks'::text) OR public.is_admin() OR (creator_id = public.get_current_team_member_id())));

--
-- Name: tasks tasks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_insert ON public.tasks FOR INSERT WITH CHECK ((public.has_permission('create_tasks'::text) OR public.is_admin() OR (project_id IN ( SELECT p.id
   FROM public.projects p
  WHERE ((p.members @> ((('[{"team_member_id": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb) OR (p.members @> ((('[{"teamMemberId": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb))))));

--
-- Name: tasks tasks_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_insert_policy_v2 ON public.tasks FOR INSERT TO authenticated WITH CHECK ((public.has_permission('create_tasks'::text) OR public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT project_members.team_member_id
   FROM public.project_members
  WHERE (project_members.project_id = tasks.project_id)))));

--
-- Name: tasks tasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_select ON public.tasks FOR SELECT USING ((public.is_admin() OR (creator_id = public.get_current_team_member_id()) OR (assigned_to = public.get_current_team_member_id()) OR (project_id IN ( SELECT p.id
   FROM public.projects p
  WHERE ((p.members @> ((('[{"team_member_id": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb) OR (p.members @> ((('[{"teamMemberId": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb))))));

--
-- Name: tasks tasks_select_policy_v3; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_select_policy_v3 ON public.tasks FOR SELECT TO authenticated USING ((public.is_admin() OR (creator_id = public.get_current_team_member_id()) OR (assigned_to = public.get_current_team_member_id()) OR (public.get_current_team_member_id() IN ( SELECT p.creator_id
   FROM public.projects p
  WHERE (p.id = tasks.project_id)
UNION
 SELECT ((member.value ->> 'team_member_id'::text))::integer AS int4
   FROM public.projects p,
    LATERAL jsonb_array_elements(p.members) member(value)
  WHERE (p.id = tasks.project_id)))));

--
-- Name: tasks tasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_update ON public.tasks FOR UPDATE USING ((public.is_admin() OR public.has_permission('manage_projects'::text) OR (creator_id = public.get_current_team_member_id()) OR (public.has_permission('edit_tasks'::text) AND (assigned_to = public.get_current_team_member_id())) OR (project_id IN ( SELECT p.id
   FROM public.projects p
  WHERE ((p.members @> ((('[{"team_member_id": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb) OR (p.members @> ((('[{"teamMemberId": '::text || public.get_current_team_member_id()) || '}]'::text))::jsonb))))));

--
-- Name: tasks tasks_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_update_policy_v2 ON public.tasks FOR UPDATE TO authenticated USING ((public.is_admin() OR public.has_permission('manage_projects'::text) OR (creator_id = public.get_current_team_member_id()) OR (public.has_permission('edit_tasks'::text) AND (assigned_to = public.get_current_team_member_id())))) WITH CHECK ((public.is_admin() OR public.has_permission('manage_projects'::text) OR (creator_id = public.get_current_team_member_id()) OR (public.has_permission('edit_tasks'::text) AND (assigned_to = public.get_current_team_member_id()))));

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members team_members_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_delete_policy_v2 ON public.team_members FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: team_members team_members_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_insert_policy_v2 ON public.team_members FOR INSERT TO authenticated WITH CHECK (public.is_admin());

--
-- Name: team_members team_members_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_select_policy_v2 ON public.team_members FOR SELECT TO authenticated USING (((auth_user_id = auth.uid()) OR public.is_admin() OR (reports_to = public.get_current_team_member_id())));

--
-- Name: team_members team_members_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_members_update_policy_v2 ON public.team_members FOR UPDATE TO authenticated USING (((auth_user_id = auth.uid()) OR public.is_admin())) WITH CHECK (((auth_user_id = auth.uid()) OR public.is_admin()));

--
-- Name: ticket_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_comments ticket_comments_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ticket_comments_delete_policy_v2 ON public.ticket_comments FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: ticket_comments ticket_comments_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ticket_comments_insert_policy_v2 ON public.ticket_comments FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT support_tickets.creator_id
   FROM public.support_tickets
  WHERE (support_tickets.id = ticket_comments.ticket_id)))));

--
-- Name: ticket_comments ticket_comments_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ticket_comments_select_policy_v2 ON public.ticket_comments FOR SELECT TO authenticated USING ((public.is_admin() OR (public.get_current_team_member_id() IN ( SELECT support_tickets.creator_id
   FROM public.support_tickets
  WHERE (support_tickets.id = ticket_comments.ticket_id)))));

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences user_preferences_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_delete_policy_v2 ON public.user_preferences FOR DELETE TO authenticated USING (((user_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: user_preferences user_preferences_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_insert_policy_v2 ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (((user_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: user_preferences user_preferences_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_select_policy_v2 ON public.user_preferences FOR SELECT TO authenticated USING (((user_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: user_preferences user_preferences_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_update_policy_v2 ON public.user_preferences FOR UPDATE TO authenticated USING (((user_id = public.get_current_team_member_id()) OR public.is_admin())) WITH CHECK (((user_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: work_contract_change_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_contract_change_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: work_contract_change_requests work_contract_delete_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY work_contract_delete_policy_v2 ON public.work_contract_change_requests FOR DELETE TO authenticated USING (public.is_admin());

--
-- Name: work_contract_change_requests work_contract_insert_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY work_contract_insert_policy_v2 ON public.work_contract_change_requests FOR INSERT TO authenticated WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: work_contract_change_requests work_contract_select_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY work_contract_select_policy_v2 ON public.work_contract_change_requests FOR SELECT TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- Name: work_contract_change_requests work_contract_update_policy_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY work_contract_update_policy_v2 ON public.work_contract_change_requests FOR UPDATE TO authenticated USING (((team_member_id = public.get_current_team_member_id()) OR public.is_admin())) WITH CHECK (((team_member_id = public.get_current_team_member_id()) OR public.is_admin()));

--
-- PostgreSQL database dump complete
--

