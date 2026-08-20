-- ELYAN PRE-LAUNCH — Customer Requests / Intake Core
--
-- MODEL
--   interest_intakes  = raw marketplace intake receipt (PII, dedupe, consent)
--   customer_requests = ONE internal Control object per successful intake (1:1)
--
-- Why a separate table (not extending interest_intakes.status):
--   Intake keeps receipt statuses (received/reviewed/closed).
--   Requests use operator CRM statuses (new → contacted → qualified → closed_*).
--   Unique(interest_intake_id) + interest 5-min dedupe ⇒ no duplicate requests.
--
-- Security: fail-closed RLS; anon/authenticated have NO privileges.
-- BFF uses service_role after requireStaff. Partners never read these rows.

CREATE TABLE IF NOT EXISTS public.customer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_intake_id uuid NOT NULL UNIQUE
    REFERENCES public.interest_intakes(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'marketplace_interest'
    CHECK (source IN ('marketplace_interest')),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_slug text NOT NULL,
  category_id text,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  location_text text NOT NULL,
  message text NOT NULL,
  consent_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')),
  status_changed_at timestamptz,
  status_changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_requests_email_lower CHECK (customer_email = lower(customer_email)),
  CONSTRAINT customer_requests_slug_format CHECK (
    partner_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  CONSTRAINT customer_requests_name_len CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  CONSTRAINT customer_requests_email_len CHECK (char_length(customer_email) BETWEEN 3 AND 160),
  CONSTRAINT customer_requests_location_len CHECK (char_length(location_text) BETWEEN 1 AND 160),
  CONSTRAINT customer_requests_message_len CHECK (char_length(message) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS customer_requests_status_created_idx
  ON public.customer_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS customer_requests_created_at_idx
  ON public.customer_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS customer_requests_partner_id_idx
  ON public.customer_requests (partner_id);

CREATE INDEX IF NOT EXISTS customer_requests_category_id_idx
  ON public.customer_requests (category_id);

CREATE INDEX IF NOT EXISTS customer_requests_partner_slug_idx
  ON public.customer_requests (partner_slug);

-- Dedicated status-change audit (staff-only via BFF; no client access).
CREATE TABLE IF NOT EXISTS public.customer_request_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL
    REFERENCES public.customer_requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL
    CHECK (to_status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')),
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_request_status_events_from_check CHECK (
    from_status IS NULL OR from_status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')
  )
);

CREATE INDEX IF NOT EXISTS customer_request_status_events_request_idx
  ON public.customer_request_status_events (request_id, created_at DESC);

ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_request_status_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_requests FROM anon;
REVOKE ALL ON TABLE public.customer_requests FROM authenticated;
REVOKE ALL ON TABLE public.customer_requests FROM PUBLIC;

REVOKE ALL ON TABLE public.customer_request_status_events FROM anon;
REVOKE ALL ON TABLE public.customer_request_status_events FROM authenticated;
REVOKE ALL ON TABLE public.customer_request_status_events FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_requests TO service_role;
GRANT SELECT, INSERT ON TABLE public.customer_request_status_events TO service_role;

-- Also allow service_role to UPDATE interest_intakes if operators later sync receipt status (optional).
-- Intentionally NOT granted to anon/authenticated.
