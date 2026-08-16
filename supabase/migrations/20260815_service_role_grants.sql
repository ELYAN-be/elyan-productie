-- ELYAN Professionals — service_role BFF grants (idempotent)
--
-- WHY: Vercel BFF uses SUPABASE_SERVICE_ROLE_KEY via createAdminClient() only.
-- Browser / anon / authenticated never receive this key. Postgres still requires
-- explicit table GRANTs for PostgREST; without them acceptInviteForUser fails with
-- "permission denied for table partner_members" (and sometimes partner_invites UPDATE).
--
-- Apply on existing DBs that ran an older Phase A foundation without these GRANTs.
-- Safe to re-run (GRANT is idempotent). Fresh installs also get the same set from
-- 20260814_phase_a_foundation.sql.
--
-- Privilege map (BFF modules → tables):
--   invites.js / auth-password.js
--     partners          SELECT, INSERT (, UPDATE for account_status maintenance)
--     partner_invites   SELECT, INSERT, UPDATE
--     partner_members   SELECT, INSERT (, UPDATE for member_status maintenance)
--   tenancy.js          partner_members SELECT, partner_invites SELECT, partners SELECT,
--                       staff_users SELECT
--   audit.js            audit_logs INSERT
--   profiles            SELECT, INSERT, UPDATE (BFF profile upsert / email sync;
--                       auth trigger also writes via SECURITY DEFINER)
--
-- Intentionally NOT granted to service_role: DELETE on any Phase A table.
-- Intentionally NOT granted here to anon/authenticated (client roles unchanged).

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.profiles
  TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.partners
  TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.partner_members
  TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.partner_invites
  TO service_role;

GRANT SELECT
  ON TABLE public.staff_users
  TO service_role;

GRANT INSERT
  ON TABLE public.audit_logs
  TO service_role;
