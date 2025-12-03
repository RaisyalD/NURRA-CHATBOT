-- Manual Database Setup Script for Islamic AI Assistant
-- Run this in your Supabase SQL Editor if the Edge Function deployment fails

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the islamic_corpus table with updated_at trigger
CREATE TABLE IF NOT EXISTS public.islamic_corpus (
  id          BIGSERIAL PRIMARY KEY,
  content     TEXT      NOT NULL,
  embedding   VECTOR(1536),
  metadata    JSONB     DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.islamic_corpus;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.islamic_corpus
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Create vector index
CREATE INDEX IF NOT EXISTS islamic_corpus_embedding_idx
ON public.islamic_corpus
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 6. Create similarity search function
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id         BIGINT,
  content    TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.islamic_corpus
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 7. Enable RLS and create policy
ALTER TABLE public.islamic_corpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read"
  ON public.islamic_corpus
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.islamic_corpus TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.islamic_corpus_id_seq TO anon, authenticated;

-- Success message
SELECT 'Database setup completed successfully!' as status;
