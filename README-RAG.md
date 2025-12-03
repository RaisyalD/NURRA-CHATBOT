# NURRA - RAG Chatbot

A comprehensive RAG (Retrieval-Augmented Generation) chatbot system for Islamic guidance, built with Next.js, Supabase, and OpenAI.

## 🚀 Features

- **RAG-powered Chat**: Retrieve relevant Islamic knowledge from your corpus
- **Vector Search**: Fast semantic search using Supabase pgvector
- **Document Ingestion**: Process PDF/text files into searchable chunks
- **Real-time Chat**: Streaming responses with context-aware answers
- **Authentication**: User management with persistent sessions
- **Settings Management**: Configurable chat and appearance settings

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account
- OpenAI API key
- npm or pnpm

## 🛠️ Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp env.example .env.local
```

Update `.env.local` with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mpezevaozsqpirfozcfv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZXpldmFvenNxcGlyZm96Y2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MDM4ODUsImV4cCI6MjA3MjI3OTg4NX0.rOmsa-ua_ErgnXmgzAmyCUYKqN5-lDQSzYLfHOhhsEc

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration (optional)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mpezevaozsqpirfozcfv.supabase.co:5432/postgres
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Database Setup

Run the database setup script to create the necessary tables and functions:

```bash
npm run setup-db
```

This will:
- Enable the pgvector extension
- Create the `islamic_corpus` table
- Create the `match_documents` function for vector similarity search
- Create the necessary indexes

### 4. Document Ingestion

Place your Islamic documents (PDF/text files) in the `documents/` directory, then run:

```bash
npm run ingest
```

The script will:
- Process all files in the `documents/` directory
- Clean and chunk the text (1000 characters with 200 character overlap)
- Generate embeddings using OpenAI's text-embedding-ada-002 model
- Store chunks and embeddings in Supabase

### 5. Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 📚 Usage

### Authentication

1. **Register**: Create a new account with your email and password
2. **Login**: Sign in with your credentials
3. **Dashboard**: Access the main chat interface

### Chat Interface

1. **Ask Questions**: Type your Islamic questions in the chat
2. **RAG Responses**: The system will retrieve relevant knowledge and provide context-aware answers
3. **Chat History**: Your conversations are automatically saved
4. **New Chats**: Start fresh conversations using the "New Chat" button

### Settings

Access settings via the sidebar to configure:
- **Chat Settings**: Auto-save, history, response length
- **Appearance**: Theme and language preferences
- **Notifications**: Enable/disable notifications
- **Profile**: View account information and sign out

## 🔧 API Endpoints

### Chat API
- `POST /api/chat` - Main chat endpoint with RAG functionality

### RAG Management API
- `GET /api/rag?action=stats` - Get document statistics
- `GET /api/rag?action=search&q=query` - Search documents
- `POST /api/rag` - Upload documents or clear corpus

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # RAG-enabled chat API
│   │   └── rag/route.ts           # RAG management API
│   ├── login/page.tsx             # Login page
│   ├── register/page.tsx          # Registration page
│   ├── settings/page.tsx          # Settings page
│   └── page.tsx                   # Main dashboard
├── components/
│   ├── auth-guard.tsx             # Authentication protection
│   ├── chat-interface.tsx         # Chat UI component
│   ├── client-wrapper.tsx         # Hydration wrapper
│   ├── header.tsx                 # App header
│   └── sidebar.tsx                # Navigation sidebar
├── lib/
│   ├── auth.tsx                   # Authentication context
│   ├── chat-store.ts              # Chat state management
│   ├── rag-utils.ts               # RAG utility functions
│   └── supabase.ts                # Supabase client
├── scripts/
│   ├── ingest-pdf.js              # Document ingestion script
│   └── setup-database.js          # Database setup script
├── documents/                     # Place your documents here
│   └── sample-islamic-text.txt    # Sample Islamic text
└── env.example                    # Environment variables template
```

## 🗄️ Database Schema

### islamic_corpus Table

```sql
CREATE TABLE islamic_corpus (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Vector Search Function

```sql
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
```

## 🔍 RAG Pipeline

1. **Document Processing**:
   - Extract text from PDF/text files
   - Clean and preprocess text
   - Split into chunks (1000 chars with 200 char overlap)

2. **Embedding Generation**:
   - Generate embeddings using OpenAI's text-embedding-ada-002
   - Store embeddings in Supabase pgvector column

3. **Query Processing**:
   - Generate embedding for user query
   - Search for similar documents using vector similarity
   - Retrieve top 5 most relevant chunks

4. **Response Generation**:
   - Combine retrieved context with user query
   - Generate response using OpenAI GPT-4
   - Stream response to user

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Ensure these are set in your production environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

## 🔧 Customization

### Adding New Document Types

To support additional document formats:

1. Install the appropriate parser (e.g., `pdf-parse` for PDFs)
2. Update the `processPDFFile` function in `scripts/ingest-pdf.js`
3. Add the file extension to the filter in the ingestion script

### Modifying Chunk Size

Update the chunk parameters in:
- `scripts/ingest-pdf.js` (line 47)
- `lib/rag-utils.ts` (line 108)

### Adjusting Search Parameters

Modify the search threshold and limit in:
- `app/api/chat/route.ts` (lines 35-36)
- `lib/rag-utils.ts` (line 42)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify Supabase URL and API key
   - Check if pgvector extension is enabled

2. **Embedding Generation Fails**:
   - Verify OpenAI API key
   - Check API rate limits

3. **Document Ingestion Fails**:
   - Ensure documents are in the correct format
   - Check file permissions

4. **Chat Not Working**:
   - Verify all environment variables are set
   - Check browser console for errors

### Debug Mode

Enable debug logging by adding to `.env.local`:
```env
DEBUG=true
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the Supabase and OpenAI documentation

---

**Note**: This system is designed for educational purposes. For complex religious matters, always consult with qualified Islamic scholars.
