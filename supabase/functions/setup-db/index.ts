// supabase/functions/setup-db/index.ts
// ------------------------------------------------------------
// Edge Function to bootstrap the "islamic_corpus" table, its vector index,
// the similarity search function, and a simple RLS policy.
// ------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2.39.5";

// ---------------------------------------------------------------------
// Initialise Supabase client with the Service Role key – this key bypasses RLS
// and is required for DDL statements.
// ---------------------------------------------------------------------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

/**
 * Execute a SQL snippet via the built‑in `exec_sql` RPC.
 * Prints a friendly status line so the logs are easy to read.
 */
async function runSQL(sql: string, description: string) {
  console.log(`🚀 ${description} …`);
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.warn(`⚠️  ${description} failed – you may need to run it manually.`);
    console.warn(error.message);
    console.warn("SQL:\n", sql);
  } else {
    console.log(`✅ ${description} succeeded`);
  }
}

// ---------------------------------------------------------------------
// 1️⃣  Ensure pgvector extension exists (required for VECTOR columns)
// ---------------------------------------------------------------------
await runSQL(
  `CREATE EXTENSION IF NOT EXISTS vector;`,
  "Install pgvector extension"
);

// ---------------------------------------------------------------------
// 2️⃣  Create the public.islamic_corpus table + an UPDATE trigger that
//     keeps `updated_at` in sync automatically.
// ---------------------------------------------------------------------
await runSQL(
  `
  CREATE TABLE IF NOT EXISTS public.islamic_corpus (
    id          BIGSERIAL PRIMARY KEY,
    content     TEXT      NOT NULL,
    embedding   VECTOR(1536),
    metadata    JSONB     DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- Trigger function to refresh updated_at on every UPDATE
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS set_updated_at ON public.islamic_corpus;
  CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.islamic_corpus
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  `,
  "Create islamic_corpus table + updated_at trigger"
);

// ---------------------------------------------------------------------
// 3️⃣  Create the IVFFLAT cosine similarity index.
//     Tune `lists = ceil(sqrt(N))` after you know the row count – start with 100.
// ---------------------------------------------------------------------
await runSQL(
  `
  CREATE INDEX IF NOT EXISTS islamic_corpus_embedding_idx
  ON public.islamic_corpus
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  `,
  "Create IVFFLAT vector index"
);

// ---------------------------------------------------------------------
// 4️⃣  SQL‑only similarity function.
//     Returns the top‑N most similar rows above a threshold.
// ---------------------------------------------------------------------
await runSQL(
  `
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
  `,
  "Create match_documents SQL function"
);

// ---------------------------------------------------------------------
// 5️⃣  Optional: enable Row‑Level Security and a permissive read policy.
//     Adjust or remove the policy to match your security model.
// ---------------------------------------------------------------------
await runSQL(
  `
  ALTER TABLE public.islamic_corpus ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "authenticated_can_read"
    ON public.islamic_corpus
    FOR SELECT
    TO authenticated
    USING (TRUE);
  `,
  "Enable RLS + read‑only policy for authenticated users"
);

console.log("\n🎉 Database bootstrap finished – you can now run the ingest script.");

// ---------------------------------------------------------------------
// Helper for debugging the similarity query (run manually if you need a plan).
// ---------------------------------------------------------------------
export async function debugMatchQuery(
  queryEmbedding: number[],
  threshold = 0.78,
  limit = 5
) {
  const vecLiteral = `'[${queryEmbedding.join(',')}]'::vector`;
  const sql = `
    EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
    SELECT
      id,
      content,
      1 - (embedding <=> ${vecLiteral}) AS similarity
    FROM public.islamic_corpus
    WHERE 1 - (embedding <=> ${vecLiteral}) > ${threshold}
    ORDER BY embedding <=> ${vecLiteral}
    LIMIT ${limit};
  `;
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.error("🔎 Debug query failed:", error);
    return;
  }
  console.log("🔎 Query plan:\n", (data as any)[0]?.explain || data);
}

// ---------------------------------------------------------------------
// Example usage (uncomment to test after deployment):
// ---------------------------------------------------------------------
// (async () => {
//   await debugMatchQuery(Array(1536).fill(0));
// })();
