# NURRA - Setup Summary

## 🎯 Overview

Proyek ini menyediakan **3 opsi setup** untuk database RAG chatbot:

1. **Supabase Edge Function** (Recommended) - Otomatis & Modern
2. **Manual SQL Setup** - Manual tapi reliable
3. **Node.js Script** (Legacy) - Fallback option

## 🚀 Quick Start

### Prerequisites
```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env.local

# Update .env.local with your keys
```

### Option 1: Supabase Edge Function (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Run setup
npm run supabase-setup

# Test if it worked
npm run test-edge-function
```

### Option 2: Manual SQL Setup
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `scripts/setup-database-manual.sql`
3. Run the SQL script

### Option 3: Node.js Script (Legacy)
```bash
npm run setup-db
```

## 📋 Environment Variables

**Required in `.env.local`:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For Edge Function

# OpenAI
OPENAI_API_KEY=your_openai_key
```

## 🔧 Available Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run supabase-setup` | Deploy Edge Function | Modern setup, automated |
| `npm run test-edge-function` | Test Edge Function | Verify deployment |
| `npm run setup-db` | Legacy Node.js setup | Fallback option |
| `npm run ingest` | Process documents | After database setup |
| `npm run quick-setup` | Basic setup | Initial project setup |

## 📁 File Structure

```
├── supabase/
│   ├── functions/
│   │   └── setup-db/
│   │       └── index.ts          # Edge Function
│   └── config.toml               # Supabase config
├── scripts/
│   ├── supabase-setup.js         # Edge Function setup
│   ├── run-edge-function.js      # Test Edge Function
│   ├── setup-database-manual.sql # Manual SQL setup
│   └── setup-database.js         # Legacy Node.js setup
└── README-SUPABASE-SETUP.md      # Detailed setup guide
```

## 🎯 What Gets Created

### Database Objects
- ✅ `pgvector` extension
- ✅ `islamic_corpus` table
- ✅ Vector index for similarity search
- ✅ `match_documents()` function
- ✅ Row Level Security (RLS)

### API Endpoints
- ✅ `/api/chat` - RAG-enabled chat
- ✅ `/api/rag` - Document management

## 🚨 Troubleshooting

### Edge Function Issues
```bash
# Check if CLI is installed
supabase --version

# Test the function
npm run test-edge-function

# Use manual setup if needed
# Copy SQL from setup-database-manual.sql
```

### Common Errors
- **Missing Service Role Key**: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- **pgvector not enabled**: Contact Supabase support or use manual setup
- **Permission denied**: Ensure you have admin access to the project

## 📚 Next Steps

After successful setup:

1. **Add documents** to `documents/` directory
2. **Run ingestion**: `npm run ingest`
3. **Start development**: `npm run dev`
4. **Test chat**: Ask questions about Islamic topics

## 🔍 Verification

Check if setup was successful:

```sql
-- Check table
SELECT * FROM information_schema.tables 
WHERE table_name = 'islamic_corpus';

-- Check function
SELECT * FROM information_schema.routines 
WHERE routine_name = 'match_documents';

-- Check extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## 📖 Documentation

- **Main Setup**: `README-SUPABASE-SETUP.md`
- **RAG System**: `README-RAG.md`
- **Quick Setup**: `README.md`

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review the detailed README files
3. Check Supabase documentation
4. Verify environment variables are correct

---

**Recommendation**: Start with Option 1 (Edge Function) for the most modern and automated experience!
