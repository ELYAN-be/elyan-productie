-- ELYAN — anonymous aggregate product analytics (no PII, no raw events)
-- Counts only. Public clients write via service_role BFF only.

CREATE TABLE IF NOT EXISTS public.analytics_daily_counts (
  event_date date NOT NULL,
  event_name text NOT NULL,
  dimension_1 text NOT NULL DEFAULT '',
  dimension_2 text NOT NULL DEFAULT '',
  count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_date, event_name, dimension_1, dimension_2),
  CONSTRAINT analytics_event_name_len CHECK (char_length(event_name) BETWEEN 1 AND 64),
  CONSTRAINT analytics_dim1_len CHECK (char_length(dimension_1) <= 64),
  CONSTRAINT analytics_dim2_len CHECK (char_length(dimension_2) <= 64),
  CONSTRAINT analytics_count_nonneg CHECK (count >= 0)
);

CREATE INDEX IF NOT EXISTS analytics_daily_counts_event_date_idx
  ON public.analytics_daily_counts (event_date DESC);

ALTER TABLE public.analytics_daily_counts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analytics_daily_counts FROM anon;
REVOKE ALL ON TABLE public.analytics_daily_counts FROM authenticated;
REVOKE ALL ON TABLE public.analytics_daily_counts FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE public.analytics_daily_counts TO service_role;

CREATE OR REPLACE FUNCTION public.increment_analytics_daily_count(
  p_event_date date,
  p_event_name text,
  p_dimension_1 text DEFAULT '',
  p_dimension_2 text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_daily_counts (event_date, event_name, dimension_1, dimension_2, count)
  VALUES (
    p_event_date,
    p_event_name,
    COALESCE(p_dimension_1, ''),
    COALESCE(p_dimension_2, ''),
    1
  )
  ON CONFLICT (event_date, event_name, dimension_1, dimension_2)
  DO UPDATE SET
    count = public.analytics_daily_counts.count + 1,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_analytics_daily_count(date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_analytics_daily_count(date, text, text, text) TO service_role;
