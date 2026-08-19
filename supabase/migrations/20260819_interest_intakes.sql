-- ELYAN Marketplace PRE-LAUNCH — Interest Intake (Phase 1)
-- PII stored server-side only. Partners have NO read access.
-- Public API inserts via service_role BFF only.

CREATE TABLE IF NOT EXISTS public.interest_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_slug text NOT NULL,
  category_id text,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  location_text text NOT NULL,
  description text NOT NULL,
  consent_at timestamptz NOT NULL,
  dedupe_key text NOT NULL,
  ip_hash text,
  user_agent text,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewed', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT interest_intakes_email_lower CHECK (email = lower(email)),
  CONSTRAINT interest_intakes_slug_format CHECK (
    partner_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  CONSTRAINT interest_intakes_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT interest_intakes_email_len CHECK (char_length(email) BETWEEN 3 AND 160),
  CONSTRAINT interest_intakes_location_len CHECK (char_length(location_text) BETWEEN 1 AND 160),
  CONSTRAINT interest_intakes_description_len CHECK (char_length(description) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS interest_intakes_dedupe_created_idx
  ON public.interest_intakes (dedupe_key, created_at DESC);

CREATE INDEX IF NOT EXISTS interest_intakes_partner_id_idx
  ON public.interest_intakes (partner_id);

CREATE INDEX IF NOT EXISTS interest_intakes_created_at_idx
  ON public.interest_intakes (created_at DESC);

ALTER TABLE public.interest_intakes ENABLE ROW LEVEL SECURITY;

-- Fail closed: no policies for anon / authenticated ⇒ no direct client access.
REVOKE ALL ON TABLE public.interest_intakes FROM anon;
REVOKE ALL ON TABLE public.interest_intakes FROM authenticated;
REVOKE ALL ON TABLE public.interest_intakes FROM PUBLIC;

GRANT SELECT, INSERT ON TABLE public.interest_intakes TO service_role;
