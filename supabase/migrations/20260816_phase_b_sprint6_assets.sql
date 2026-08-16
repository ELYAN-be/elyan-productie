-- ELYAN Professionals — Phase B Sprint 6: portfolio asset write grants
-- Upload/delete BFF needs DELETE on partner_profile_assets (metadata cleanup).
-- Storage binaries live in Vercel Blob; DB holds metadata only.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.partner_profile_assets TO service_role;
