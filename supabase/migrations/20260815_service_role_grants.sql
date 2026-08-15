-- ELYAN Professionals — service_role BFF grants (idempotent)
-- Root cause fix: acceptInviteForUser INSERT into partner_members failed with
-- "permission denied for table partner_members" because Phase A migration
-- never GRANTed service_role table privileges (only authenticated SELECT).

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
