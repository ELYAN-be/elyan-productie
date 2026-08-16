-- ELYAN Professionals — Phase B service_role grants (idempotent repair)
-- Mirrors GRANTs from 20260816_phase_b_onboarding_foundation.sql.
-- Safe to re-run. Does not change anon/authenticated privileges.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.partner_onboarding
  TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.partner_profiles
  TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.partner_profile_assets
  TO service_role;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.partner_review_items
  TO service_role;
