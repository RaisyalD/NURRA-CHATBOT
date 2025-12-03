const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('Setting up database...')

    // Enable the pgvector extension
    const { error: extensionError } = await supabase.rpc('create_extension_if_not_exists', {
      extension_name: 'vector'
    })

    if (extensionError) {
      console.log('pgvector extension might already exist or need manual setup')
    } else {
      console.log('✅ pgvector extension enabled')
    }

    // Create the islamic_corpus table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS islamic_corpus (
          id BIGSERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          embedding VECTOR(1536),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (tableError) {
      console.log('Table might already exist or need manual creation')
      console.log('Please run this SQL manually in your Supabase SQL editor:')
      console.log(`
        CREATE TABLE IF NOT EXISTS islamic_corpus (
          id BIGSERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          embedding VECTOR(1536),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `)
    } else {
      console.log('✅ islamic_corpus table created')
    }

    // Create vector similarity search function
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION match_documents(
          query_embedding VECTOR(1536),
          match_threshold FLOAT DEFAULT 0.78,
          match_count INT DEFAULT 5
        )
        RETURNS TABLE (
          id BIGINT,
          content TEXT,
          similarity FLOAT
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT
            islamic_corpus.id,
            islamic_corpus.content,
            1 - (islamic_corpus.embedding <=> query_embedding) AS similarity
          FROM islamic_corpus
          WHERE 1 - (islamic_corpus.embedding <=> query_embedding) > match_threshold
          ORDER BY islamic_corpus.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $$;
      `
    })

    if (functionError) {
      console.log('Function might already exist or need manual creation')
      console.log('Please run this SQL manually in your Supabase SQL editor:')
      console.log(`
        CREATE OR REPLACE FUNCTION match_documents(
          query_embedding VECTOR(1536),
          match_threshold FLOAT DEFAULT 0.78,
          match_count INT DEFAULT 5
        )
        RETURNS TABLE (
          id BIGINT,
          content TEXT,
          similarity FLOAT
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT
            islamic_corpus.id,
            islamic_corpus.content,
            1 - (islamic_corpus.embedding <=> query_embedding) AS similarity
          FROM islamic_corpus
          WHERE 1 - (islamic_corpus.embedding <=> query_embedding) > match_threshold
          ORDER BY islamic_corpus.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $$;
      `)
    } else {
      console.log('✅ match_documents function created')
    }

    // Create index for vector similarity search
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS islamic_corpus_embedding_idx 
        ON islamic_corpus 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `
    })

    if (indexError) {
      console.log('Index might already exist or need manual creation')
      console.log('Please run this SQL manually in your Supabase SQL editor:')
      console.log(`
        CREATE INDEX IF NOT EXISTS islamic_corpus_embedding_idx 
        ON islamic_corpus 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `)
    } else {
      console.log('✅ Vector index created')
    }

    console.log('✅ Database setup completed!')
    console.log('You can now run: npm run ingest')

  } catch (error) {
    console.error('Error setting up database:', error)
    console.log('\nIf you encounter issues, please run the SQL commands manually in your Supabase SQL editor.')
  }
}

setupDatabase()
