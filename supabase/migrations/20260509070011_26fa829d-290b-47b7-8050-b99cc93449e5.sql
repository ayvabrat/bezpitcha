
-- materials
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text,
  source_type text,
  original_text text,
  media_paths jsonb DEFAULT '[]'::jsonb,
  relevance_score int,
  interest_score int,
  actuality_score int,
  content_type text,
  platforms jsonb DEFAULT '[]'::jsonb,
  recommendation text,
  reasoning text,
  status text DEFAULT 'new',
  parsed_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_materials_status ON public.materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_parsed_at ON public.materials(parsed_at DESC);

-- author_styles
CREATE TABLE IF NOT EXISTS public.author_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.author_styles ENABLE ROW LEVEL SECURITY;

-- watermark_settings: add missing columns required by backend
ALTER TABLE public.watermark_settings
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS file_path text;

-- No public policies: service_role bypasses RLS, so backend works; no anon access.
