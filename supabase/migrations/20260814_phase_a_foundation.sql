-- ELYAN for Professionals — Phase A foundation
-- Account status only on partners. Onboarding/profile statuses arrive in Phase B.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_lower CHECK (email = lower(email))
);

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text NOT NULL,
  account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  member_status text NOT NULL DEFAULT 'active'
    CHECK (member_status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_members_unique UNIQUE (partner_id, user_id)
);

CREATE TABLE public.partner_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin', 'member')),
  token_hash text NOT NULL,
  invite_status text NOT NULL DEFAULT 'pending'
    CHECK (invite_status IN ('pending', 'accepted', 'revoked')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  revoked_at timestamptz,
  invited_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_invites_email_lower CHECK (email = lower(email)),
  CONSTRAINT partner_invites_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT partner_invites_status_consistency CHECK (
    (invite_status = 'pending'  AND accepted_at IS NULL AND revoked_at IS NULL) OR
    (invite_status = 'accepted' AND accepted_at IS NOT NULL AND revoked_at IS NULL) OR
    (invite_status = 'revoked'  AND revoked_at IS NOT NULL AND accepted_at IS NULL)
  )
);

CREATE UNIQUE INDEX partner_invites_pending_partner_email
  ON public.partner_invites (partner_id, email)
  WHERE invite_status = 'pending';

CREATE TABLE public.staff_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('elyan_admin', 'elyan_ops')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'staff', 'system')),
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partner_members_user_id_idx ON public.partner_members (user_id);
CREATE INDEX partner_members_partner_id_idx ON public.partner_members (partner_id);
CREATE INDEX partner_invites_email_idx ON public.partner_invites (email);
CREATE INDEX audit_logs_partner_id_idx ON public.audit_logs (partner_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Profile bootstrap on auth.users insert
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- partners: members may read their partners only
CREATE POLICY partners_select_member ON public.partners
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_members pm
      WHERE pm.partner_id = partners.id
        AND pm.user_id = auth.uid()
        AND pm.member_status = 'active'
    )
  );

-- partner_members: users see only their own membership rows
CREATE POLICY partner_members_select_own ON public.partner_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- partner_invites: no client access (BFF/service role only)
-- (intentionally no policies for authenticated/anon)

-- staff_users: no partner self-elevation; no client writes
-- (intentionally no INSERT/UPDATE/DELETE policies)
-- Optional: staff can read own row
CREATE POLICY staff_users_select_own ON public.staff_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- audit_logs: no client access
-- (intentionally no policies)

-- Explicit revoke defaults for anon
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.partners FROM anon;
REVOKE ALL ON public.partner_members FROM anon;
REVOKE ALL ON public.partner_invites FROM anon;
REVOKE ALL ON public.staff_users FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;

GRANT SELECT, UPDATE, INSERT ON public.profiles TO authenticated;
GRANT SELECT ON public.partners TO authenticated;
GRANT SELECT ON public.partner_members TO authenticated;
GRANT SELECT ON public.staff_users TO authenticated;

-- BFF (Vercel serverless) uses the Supabase service_role key. Without these
-- GRANTs, acceptInviteForUser fails with:
--   membership_create_failed permission denied for table partner_members
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partners TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_members TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_invites TO service_role;
GRANT SELECT ON TABLE public.staff_users TO service_role;
GRANT INSERT ON TABLE public.audit_logs TO service_role;
