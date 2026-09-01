-- ELYAN Partner Autopilot V1 — additive, backward-safe
-- Interest candidates, partner request responses, autopilot audit events.

CREATE TABLE IF NOT EXISTS public.partner_interest_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  email_normalized text NOT NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website text,
  specialty text NOT NULL,
  region text NOT NULL,
  message text,
  consent_at timestamptz NOT NULL,
  category_id text,
  autopilot_status text NOT NULL DEFAULT 'interest_received'
    CHECK (autopilot_status IN (
      'interest_received', 'screening', 'review_required', 'invited',
      'onboarding', 'ready_for_review', 'published', 'blocked'
    )),
  screening_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  invite_id uuid REFERENCES public.partner_invites(id) ON DELETE SET NULL,
  invite_sent_at timestamptz,
  published_at timestamptz,
  publication_source text
    CHECK (publication_source IS NULL OR publication_source IN ('manual', 'automatic')),
  profile_composed_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_interest_candidates_email_lower CHECK (email = lower(email))
);

CREATE INDEX IF NOT EXISTS partner_interest_candidates_status_idx
  ON public.partner_interest_candidates (autopilot_status, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_interest_candidates_email_idx
  ON public.partner_interest_candidates (email_normalized);

CREATE INDEX IF NOT EXISTS partner_interest_candidates_partner_idx
  ON public.partner_interest_candidates (partner_id)
  WHERE partner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.partner_request_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  customer_request_id uuid NOT NULL REFERENCES public.customer_requests(id) ON DELETE CASCADE,
  response_status text NOT NULL DEFAULT 'pending'
    CHECK (response_status IN ('pending', 'interested', 'declined')),
  decline_reason text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, customer_request_id)
);

CREATE INDEX IF NOT EXISTS partner_request_responses_partner_idx
  ON public.partner_request_responses (partner_id, response_status, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_request_responses_request_idx
  ON public.partner_request_responses (customer_request_id);

CREATE TABLE IF NOT EXISTS public.partner_autopilot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.partner_interest_candidates(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_type text NOT NULL DEFAULT 'system'
    CHECK (actor_type IN ('system', 'staff', 'user')),
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_autopilot_events_partner_idx
  ON public.partner_autopilot_events (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS partner_autopilot_events_candidate_idx
  ON public.partner_autopilot_events (candidate_id, created_at DESC);

ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS publication_source text
    CHECK (publication_source IS NULL OR publication_source IN ('manual', 'automatic'));

ALTER TABLE public.partner_interest_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_autopilot_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.partner_interest_candidates FROM anon;
REVOKE ALL ON public.partner_interest_candidates FROM authenticated;
REVOKE ALL ON public.partner_request_responses FROM anon;
REVOKE ALL ON public.partner_request_responses FROM authenticated;
REVOKE ALL ON public.partner_autopilot_events FROM anon;
REVOKE ALL ON public.partner_autopilot_events FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_interest_candidates TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_request_responses TO service_role;
GRANT SELECT, INSERT ON TABLE public.partner_autopilot_events TO service_role;
