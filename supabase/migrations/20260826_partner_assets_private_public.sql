-- Private draft originals + public published derivatives for portfolio assets.
-- Additive / non-destructive. Does not delete or rewrite existing Blob objects.
-- Not applied to production by this block — apply later after review.

ALTER TABLE public.partner_profile_assets
  ADD COLUMN IF NOT EXISTS private_storage_key text;

ALTER TABLE public.partner_profile_assets
  ADD COLUMN IF NOT EXISTS public_storage_key text;

COMMENT ON COLUMN public.partner_profile_assets.private_storage_key IS
  'Private Blob store pathname for draft original. Server-only; never expose to clients.';

COMMENT ON COLUMN public.partner_profile_assets.public_storage_key IS
  'Public Blob store pathname for published Marketplace derivative (nullable until publish).';

COMMENT ON COLUMN public.partner_profile_assets.public_url IS
  'Public HTTPS URL for Marketplace/PublicSnapshot only. Null for drafts.';

COMMENT ON COLUMN public.partner_profile_assets.storage_key IS
  'Legacy/compat key. New uploads store the private pathname here as well.';

-- Legacy rows: leave private_storage_key NULL when only a public_url exists.
-- Those remain world-readable until republish migrates them; pause/hide will not
-- delete legacy public blobs without a private original (restoreability).

CREATE INDEX IF NOT EXISTS partner_profile_assets_private_key_idx
  ON public.partner_profile_assets (private_storage_key)
  WHERE private_storage_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_profile_assets_public_key_idx
  ON public.partner_profile_assets (public_storage_key)
  WHERE public_storage_key IS NOT NULL;
