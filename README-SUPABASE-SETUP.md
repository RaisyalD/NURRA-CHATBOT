# NURRA - Supabase Edge Function Setup

Setup guide untuk menggunakan Supabase Edge Function untuk konfigurasi database otomatis.

## 🚀 Setup Options

### Option 1: Supabase Edge Function (Recommended)

#### Prerequisites
1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   # atau
   brew install supabase/tap/supabase
   ```

2. **Update .env.local**:
   ```env
   # Tambahkan SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

#### Setup Steps
1. **Run the setup script**:
   ```bash
   npm run supabase-setup
   ```

2. **Script akan**:
   - Check prerequisites
   - Initialize Supabase project
   - Deploy setup-db Edge Function
   - Run database setup automatically

### Option 2: Manual SQL Setup

Jika Edge Function deployment gagal, gunakan SQL script manual:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Copy dan paste** isi dari `scripts/setup-database-manual.sql`
3. **Run the script**

### Option 3: Node.js Script (Legacy)

```bash
npm run setup-db
```

## 🔑 Environment Variables

Pastikan `.env.local` memiliki semua variable yang diperlukan:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mpezevaozsqpirfozcfv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## 📋 What Gets Created

### 1. pgvector Extension
- Enables vector operations in PostgreSQL

### 2. islamic_corpus Table
```sql
CREATE TABLE islamic_corpus (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Vector Index
- IVFFLAT index for fast similarity search
- Optimized for cosine similarity

### 4. match_documents Function
- SQL function for vector similarity search
- Returns top-N most similar documents
- Configurable threshold and limit

### 5. Row Level Security (RLS)
- Enables RLS on the table
- Creates policy for authenticated users

## 🚨 Troubleshooting

### Edge Function Deployment Fails
1. Check if Supabase CLI is installed
2. Verify environment variables
3. Use manual SQL setup instead

### Permission Errors
1. Ensure you have Service Role key (not anon key)
2. Check if your account has admin privileges

### pgvector Extension Error
1. Contact Supabase support to enable pgvector
2. Or use manual SQL setup

## 📚 Next Steps

After successful setup:

1. **Add documents** to `documents/` directory
2. **Run ingestion**: `npm run ingest`
3. **Start development**: `npm run dev`

## 🔍 Verification

Check if setup was successful:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'islamic_corpus';

-- Check if function exists
SELECT * FROM information_schema.routines 
WHERE routine_name = 'match_documents';

-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## 📖 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase CLI Installation](https://supabase.com/docs/guides/cli)
