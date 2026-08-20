-- ELYAN PRE-LAUNCH — Customer Requests Automation V1
-- Extends Requests Core (20260819_customer_requests.sql).
--
-- Adds (staff-only via BFF + service_role; fail-closed RLS):
--   • optional owner_user_id (staff)
--   • next_follow_up_at
--   • closed_lost reason (+ detail when other)
--   • append-only internal notes
--   • chronological activity events
--
-- Security: anon/authenticated have NO privileges. Partners never read these rows.

-- ---------------------------------------------------------------------------
-- Columns on customer_requests
-- ---------------------------------------------------------------------------

ALTER TABLE public.customer_requests
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_lost_reason text,
  ADD COLUMN IF NOT EXISTS closed_lost_detail text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.customer_requests
  DROP CONSTRAINT IF EXISTS customer_requests_closed_lost_reason_check;

ALTER TABLE public.customer_requests
  ADD CONSTRAINT customer_requests_closed_lost_reason_check CHECK (
    closed_lost_reason IS NULL
    OR closed_lost_reason IN (
      'no_response',
      'not_qualified',
      'no_suitable_professional',
      'customer_cancelled',
      'duplicate',
      'out_of_scope',
      'other'
    )
  );

ALTER TABLE public.customer_requests
  DROP CONSTRAINT IF EXISTS customer_requests_closed_lost_detail_check;

ALTER TABLE public.customer_requests
  ADD CONSTRAINT customer_requests_closed_lost_detail_check CHECK (
    closed_lost_detail IS NULL
    OR char_length(closed_lost_detail) BETWEEN 1 AND 500
  );

-- Backfill any pre-automation closed rows before enforcing consistency.
UPDATE public.customer_requests
SET closed_at = COALESCE(status_changed_at, updated_at, created_at),
    closed_by = status_changed_by
WHERE status IN ('closed_won', 'closed_lost')
  AND closed_at IS NULL;

ALTER TABLE public.customer_requests
  DROP CONSTRAINT IF EXISTS customer_requests_close_consistency;

ALTER TABLE public.customer_requests
  ADD CONSTRAINT customer_requests_close_consistency CHECK (
    (
      status NOT IN ('closed_won', 'closed_lost')
      AND closed_lost_reason IS NULL
      AND closed_lost_detail IS NULL
      AND closed_at IS NULL
    )
    OR (
      status = 'closed_won'
      AND closed_lost_reason IS NULL
      AND closed_lost_detail IS NULL
      AND closed_at IS NOT NULL
    )
    OR (
      status = 'closed_lost'
      AND closed_lost_reason IS NOT NULL
      AND closed_at IS NOT NULL
      AND (
        (closed_lost_reason = 'other' AND closed_lost_detail IS NOT NULL)
        OR (closed_lost_reason <> 'other')
      )
    )
  );

CREATE INDEX IF NOT EXISTS customer_requests_owner_user_id_idx
  ON public.customer_requests (owner_user_id);

CREATE INDEX IF NOT EXISTS customer_requests_next_follow_up_at_idx
  ON public.customer_requests (next_follow_up_at);

CREATE INDEX IF NOT EXISTS customer_requests_status_owner_idx
  ON public.customer_requests (status, owner_user_id);

-- ---------------------------------------------------------------------------
-- Internal notes (staff-only append)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_request_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL
    REFERENCES public.customer_requests(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_request_notes_content_len CHECK (
    char_length(content) BETWEEN 1 AND 4000
  )
);

CREATE INDEX IF NOT EXISTS customer_request_notes_request_idx
  ON public.customer_request_notes (request_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- Activity / audit trail (chronological, staff-only)
-- meta: safe ids/status keys only — no customer PII
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_request_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL
    REFERENCES public.customer_requests(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN (
      'created',
      'owner_changed',
      'status_changed',
      'follow_up_changed',
      'follow_up_cleared',
      'note_added',
      'closed'
    )),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_request_activity_events_request_idx
  ON public.customer_request_activity_events (request_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS fail-closed + service_role only
-- ---------------------------------------------------------------------------

ALTER TABLE public.customer_request_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_request_activity_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_request_notes FROM anon;
REVOKE ALL ON TABLE public.customer_request_notes FROM authenticated;
REVOKE ALL ON TABLE public.customer_request_notes FROM PUBLIC;

REVOKE ALL ON TABLE public.customer_request_activity_events FROM anon;
REVOKE ALL ON TABLE public.customer_request_activity_events FROM authenticated;
REVOKE ALL ON TABLE public.customer_request_activity_events FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_requests TO service_role;
GRANT SELECT, INSERT ON TABLE public.customer_request_status_events TO service_role;
GRANT SELECT, INSERT ON TABLE public.customer_request_notes TO service_role;
GRANT SELECT, INSERT ON TABLE public.customer_request_activity_events TO service_role;
