-- ELYAN for Professionals — Phase B Sprint 1: onboarding foundation
-- Status domains (V2 frozen):
--   partners.account_status     — Phase A (unchanged)
--   partner_onboarding.*        — wizard lifecycle
--   partner_profiles.*          — marketplace profile lifecycle
--
-- Draft design: jsonb column `draft` on partner_onboarding (NOT a separate drafts table).
-- WHY: onboarding is already 1:1 with partner and owns the wizard lifecycle; a second
-- 1:1 drafts table would duplicate identity and create sync debt. Published/public
-- projection lives on partner_profiles after Control approve/publish. Binary files
-- live in partner_profile_assets (metadata only in Sprint 1 — no upload API yet).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.partner_onboarding (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  onboarding_status text NOT NULL DEFAULT 'not_started'
    CHECK (onboarding_status IN (
      'not_started', 'in_progress', 'submitted', 'changes_requested', 'approved'
    )),
  current_step_id text NOT NULL DEFAULT 'start'
    CHECK (current_step_id IN (
      'start', 'bedrijf_bereik', 'ambacht', 'aanbod', 'verhaal',
      'portfolio', 'controle', 'review_hub'
    )),
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  last_saved_at timestamptz,
  last_saved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes text,
  changes_requested_at timestamptz,
  changes_requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_onboarding_draft_object CHECK (jsonb_typeof(draft) = 'object'),
  CONSTRAINT partner_onboarding_started_consistency CHECK (
    (onboarding_status = 'not_started' AND started_at IS NULL) OR
    (onboarding_status <> 'not_started' AND started_at IS NOT NULL)
  ),
  CONSTRAINT partner_onboarding_submitted_consistency CHECK (
    (onboarding_status IN ('not_started', 'in_progress') AND submitted_at IS NULL) OR
    (onboarding_status IN ('submitted', 'changes_requested', 'approved') AND submitted_at IS NOT NULL)
  )
);

CREATE TABLE public.partner_profiles (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  profile_status text NOT NULL DEFAULT 'not_created'
    CHECK (profile_status IN (
      'not_created', 'draft', 'under_review', 'ready',
      'published', 'paused', 'hidden'
    )),
  slug text,
  primary_category_id text,
  specialty_line text,
  cover_asset_id uuid,
  published_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  paused_at timestamptz,
  hidden_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_profiles_slug_format CHECK (
    slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  CONSTRAINT partner_profiles_snapshot_object CHECK (jsonb_typeof(published_snapshot) = 'object')
);

-- Unique when set; multiple NULLs allowed (slug assigned near publish).
CREATE UNIQUE INDEX partner_profiles_slug_unique
  ON public.partner_profiles (slug)
  WHERE slug IS NOT NULL;

CREATE TABLE public.partner_profile_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  storage_key text,
  public_url text,
  title text,
  content_type text,
  byte_size integer CHECK (byte_size IS NULL OR byte_size >= 0),
  asset_status text NOT NULL DEFAULT 'draft'
    CHECK (asset_status IN (
      'draft', 'submitted', 'in_review', 'approved', 'rejected'
    )),
  is_cover boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partner_profile_assets_partner_id_idx
  ON public.partner_profile_assets (partner_id);

CREATE INDEX partner_profile_assets_partner_sort_idx
  ON public.partner_profile_assets (partner_id, sort_order);

-- Deferred FK: cover_asset_id → partner_profile_assets (nullable until upload sprint).
ALTER TABLE public.partner_profiles
  ADD CONSTRAINT partner_profiles_cover_asset_id_fkey
  FOREIGN KEY (cover_asset_id)
  REFERENCES public.partner_profile_assets(id)
  ON DELETE SET NULL;

CREATE TABLE public.partner_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  step_id text
    CHECK (step_id IS NULL OR step_id IN (
      'start', 'bedrijf_bereik', 'ambacht', 'aanbod', 'verhaal',
      'portfolio', 'controle', 'review_hub'
    )),
  field_key text,
  message text NOT NULL,
  item_status text NOT NULL DEFAULT 'open'
    CHECK (item_status IN ('open', 'resolved')),
  created_by_staff uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_review_items_resolved_consistency CHECK (
    (item_status = 'open' AND resolved_at IS NULL) OR
    (item_status = 'resolved' AND resolved_at IS NOT NULL)
  )
);

CREATE INDEX partner_review_items_partner_id_idx
  ON public.partner_review_items (partner_id);

CREATE INDEX partner_review_items_partner_open_idx
  ON public.partner_review_items (partner_id)
  WHERE item_status = 'open';

-- ---------------------------------------------------------------------------
-- Bootstrap: every partner always has onboarding + profile rows (1:1)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_partner_onboarding_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.partner_onboarding (partner_id)
  VALUES (NEW.id)
  ON CONFLICT (partner_id) DO NOTHING;

  INSERT INTO public.partner_profiles (partner_id)
  VALUES (NEW.id)
  ON CONFLICT (partner_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partners_ensure_onboarding_profile ON public.partners;
CREATE TRIGGER partners_ensure_onboarding_profile
  AFTER INSERT ON public.partners
  FOR EACH ROW EXECUTE PROCEDURE public.ensure_partner_onboarding_profile();

-- Backfill existing Phase A partners
INSERT INTO public.partner_onboarding (partner_id)
SELECT id FROM public.partners
ON CONFLICT (partner_id) DO NOTHING;

INSERT INTO public.partner_profiles (partner_id)
SELECT id FROM public.partners
ON CONFLICT (partner_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- updated_at helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partner_onboarding_set_updated_at ON public.partner_onboarding;
CREATE TRIGGER partner_onboarding_set_updated_at
  BEFORE UPDATE ON public.partner_onboarding
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS partner_profiles_set_updated_at ON public.partner_profiles;
CREATE TRIGGER partner_profiles_set_updated_at
  BEFORE UPDATE ON public.partner_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS partner_profile_assets_set_updated_at ON public.partner_profile_assets;
CREATE TRIGGER partner_profile_assets_set_updated_at
  BEFORE UPDATE ON public.partner_profile_assets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS partner_review_items_set_updated_at ON public.partner_review_items;
CREATE TRIGGER partner_review_items_set_updated_at
  BEFORE UPDATE ON public.partner_review_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (defense-in-depth; BFF uses service_role)
-- ---------------------------------------------------------------------------

ALTER TABLE public.partner_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_profile_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_review_items ENABLE ROW LEVEL SECURITY;

-- Members may read their partner's onboarding / profile / assets / review items.
-- Writes stay BFF/service_role only (same pattern as partner_invites).

CREATE POLICY partner_onboarding_select_member ON public.partner_onboarding
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_members pm
      WHERE pm.partner_id = partner_onboarding.partner_id
        AND pm.user_id = auth.uid()
        AND pm.member_status = 'active'
    )
  );

CREATE POLICY partner_profiles_select_member ON public.partner_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_members pm
      WHERE pm.partner_id = partner_profiles.partner_id
        AND pm.user_id = auth.uid()
        AND pm.member_status = 'active'
    )
  );

CREATE POLICY partner_profile_assets_select_member ON public.partner_profile_assets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_members pm
      WHERE pm.partner_id = partner_profile_assets.partner_id
        AND pm.user_id = auth.uid()
        AND pm.member_status = 'active'
    )
  );

CREATE POLICY partner_review_items_select_member ON public.partner_review_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_members pm
      WHERE pm.partner_id = partner_review_items.partner_id
        AND pm.user_id = auth.uid()
        AND pm.member_status = 'active'
    )
  );

REVOKE ALL ON public.partner_onboarding FROM anon;
REVOKE ALL ON public.partner_profiles FROM anon;
REVOKE ALL ON public.partner_profile_assets FROM anon;
REVOKE ALL ON public.partner_review_items FROM anon;

GRANT SELECT ON public.partner_onboarding TO authenticated;
GRANT SELECT ON public.partner_profiles TO authenticated;
GRANT SELECT ON public.partner_profile_assets TO authenticated;
GRANT SELECT ON public.partner_review_items TO authenticated;

-- service_role: BFF onboarding module (SELECT/INSERT/UPDATE). No DELETE.
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_onboarding TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_profile_assets TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_review_items TO service_role;
