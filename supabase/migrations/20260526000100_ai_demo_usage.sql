CREATE TABLE IF NOT EXISTS public.ai_demo_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_demo_usage_count_nonnegative CHECK (usage_count >= 0)
);

ALTER TABLE public.ai_demo_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_demo_usage FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_demo_usage FROM PUBLIC;
REVOKE ALL ON public.ai_demo_usage FROM anon;
REVOKE ALL ON public.ai_demo_usage FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_ai_demo_usage_updated_at
  ON public.ai_demo_usage(updated_at DESC);
