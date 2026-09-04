-- ELYAN retention policy — additive grants + hold registry + partner closed_at.
-- No mass purge. Enforcement is BFF/service_role maintenance (dry-run by default).

-- ---------------------------------------------------------------------------
-- Partner termination clock
-- ---------------------------------------------------------------------------

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

COMMENT ON COLUMN public.partners.closed_at IS
  'Set when account_status becomes closed. Retention clock for operational data (24 months).';

CREATE INDEX IF NOT EXISTS partners_closed_at_idx
  ON public.partners (closed_at)
  WHERE account_status = 'closed' AND closed_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Exception holds (complaint / investigation / legal / statutory)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.retention_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL
    CHECK (subject_type IN (
      'customer_request',
      'interest_intake',
      'partner',
      'partner_interest_candidate',
      'audit_log',
      'analytics_day',
      'security_incident'
    )),
  subject_id text NOT NULL,
  reason text NOT NULL
    CHECK (reason IN (
      'active_complaint',
      'security_investigation',
      'fraud_investigation',
      'legal_dispute',
      'statutory_retention'
    )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cleared_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS retention_holds_active_unique
  ON public.retention_holds (subject_type, subject_id)
  WHERE cleared_at IS NULL;

CREATE INDEX IF NOT EXISTS retention_holds_active_idx
  ON public.retention_holds (subject_type, subject_id)
  WHERE cleared_at IS NULL;

ALTER TABLE public.retention_holds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.retention_holds FROM anon;
REVOKE ALL ON public.retention_holds FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.retention_holds TO service_role;

-- ---------------------------------------------------------------------------
-- Service-role DELETE grants required for retention apply (BFF only)
-- Intentionally not granted to anon/authenticated.
-- ---------------------------------------------------------------------------

GRANT DELETE ON TABLE public.interest_intakes TO service_role;
GRANT DELETE ON TABLE public.customer_requests TO service_role;
GRANT DELETE ON TABLE public.customer_request_status_events TO service_role;
GRANT DELETE ON TABLE public.customer_request_notes TO service_role;
GRANT DELETE ON TABLE public.customer_request_activity_events TO service_role;
GRANT DELETE ON TABLE public.partner_interest_candidates TO service_role;
GRANT DELETE ON TABLE public.partner_request_responses TO service_role;
GRANT DELETE ON TABLE public.partner_autopilot_events TO service_role;
GRANT DELETE ON TABLE public.partner_onboarding TO service_role;
GRANT DELETE ON TABLE public.partner_profiles TO service_role;
GRANT DELETE ON TABLE public.partner_review_items TO service_role;
GRANT DELETE ON TABLE public.partner_profile_slug_aliases TO service_role;
GRANT DELETE ON TABLE public.partner_members TO service_role;
GRANT DELETE ON TABLE public.partner_invites TO service_role;
GRANT DELETE ON TABLE public.partners TO service_role;
GRANT DELETE ON TABLE public.audit_logs TO service_role;
GRANT DELETE ON TABLE public.analytics_daily_counts TO service_role;

-- partner_profile_assets already has DELETE (sprint6).
