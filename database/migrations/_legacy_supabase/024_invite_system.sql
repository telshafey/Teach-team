-- 024_invite_system.sql
-- Create invites table and RLS policies

CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role_id uuid REFERENCES public.roles(id),
  created_by integer REFERENCES public.team_members(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  token text UNIQUE NOT NULL,
  used boolean DEFAULT false
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can insert invites
CREATE POLICY "Admins can insert invites" 
ON public.invites
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.roles r ON tm.role_id = r.id
    WHERE tm.auth_user_id = auth.uid() 
    AND (r.name = 'General Manager' OR r.name = 'admin')
  )
);

-- Token owners or admins can select invites
CREATE POLICY "Token owners or admins can read invites" 
ON public.invites
FOR SELECT 
USING (
  true -- Open for reading to allow verification by token, can be restricted further if needed
);

-- Admins can update invites
CREATE POLICY "Admins can update invites"
ON public.invites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.roles r ON tm.role_id = r.id
    WHERE tm.auth_user_id = auth.uid() 
    AND (r.name = 'General Manager' OR r.name = 'admin')
  )
);
