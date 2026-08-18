-- ELYAN Marketplace Phase 1 Sprint 1
-- PublicSnapshot v1 columns (allowlist public projection).
-- published_snapshot remains Internal/Control projection (Phase B).
-- Public API reads ONLY public_snapshot and fails closed if missing/invalid.

ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS public_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS public_snapshot_version integer NOT NULL DEFAULT 0
    CHECK (public_snapshot_version >= 0);

ALTER TABLE public.partner_profiles
  DROP CONSTRAINT IF EXISTS partner_profiles_public_snapshot_object;

ALTER TABLE public.partner_profiles
  ADD CONSTRAINT partner_profiles_public_snapshot_object
  CHECK (jsonb_typeof(public_snapshot) = 'object');

-- Optional slug alias table for future 301 redirects (no public enumeration of partner ids).
CREATE TABLE IF NOT EXISTS public.partner_profile_slug_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_profile_slug_aliases_slug_format CHECK (
    old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_profile_slug_aliases_old_slug_unique
  ON public.partner_profile_slug_aliases (old_slug);

CREATE INDEX IF NOT EXISTS partner_profile_slug_aliases_partner_id_idx
  ON public.partner_profile_slug_aliases (partner_id);

ALTER TABLE public.partner_profile_slug_aliases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_profile_slug_aliases FROM anon;
REVOKE ALL ON public.partner_profile_slug_aliases FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_profile_slug_aliases TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_profiles TO service_role;
