# NURRA - Islamic AI Chatbot

<div align="center">

![NURRA Logo](public/placeholder-logo.svg)

**NURRA** - Your intelligent Islamic AI assistant for Quran, Hadith, and Islamic guidance

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39-green)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-orange)](https://openai.com/)

</div>

## 🌟 Features

- **🤖 AI-Powered Chat**: Intelligent responses using OpenAI GPT models
- **📚 RAG System**: Retrieval-Augmented Generation with vector search
- **🌍 Multi-Language**: Supports Indonesian, English, and Arabic
- **💬 Chat History**: Persistent chat sessions with local storage
- **🔐 Authentication**: Secure user authentication with Supabase
- **🌙 Dark Mode**: Beautiful dark/light theme support
- **📱 Responsive**: Works seamlessly on desktop and mobile
- **⚡ Real-time**: Streaming responses for better UX

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Supabase account
- OpenAI API key
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RaisyalD/NURRA-CHATBOT.git
   cd NURRA-CHATBOT
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Setup database**
   ```bash
   npm run setup-db
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📖 Documentation

- **[RAG System Guide](README-RAG.md)** - Complete guide for RAG setup and document ingestion
- **[Supabase Setup](README-SUPABASE-SETUP.md)** - Detailed Supabase configuration
- **[Setup Summary](SETUP-SUMMARY.md)** - Quick setup reference

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run setup-db` | Setup database tables |
| `npm run ingest` | Process documents for RAG |
| `npm run supabase-setup` | Deploy Supabase Edge Function |

## 🏗️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + pgvector)
- **AI**: [OpenAI](https://openai.com/) (GPT-4, Embeddings)
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Auth**: Supabase Auth

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── chat/          # Chat endpoint with RAG
│   │   ├── rag/           # RAG management
│   │   └── sessions/      # Session management
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── settings/          # Settings page
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   └── ...                # Custom components
├── lib/                   # Utilities and stores
│   ├── supabase.ts        # Supabase client
│   ├── auth.tsx           # Authentication
│   ├── chat-store.ts      # Chat state management
│   └── rag-utils.ts       # RAG utilities
├── scripts/               # Setup and utility scripts
├── documents/             # Documents for RAG ingestion
└── supabase/              # Supabase config and functions
```

## 🔒 Environment Variables

Required environment variables (see `env.example`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Optional
DATABASE_URL=your_database_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Other Platforms

This is a standard Next.js application and can be deployed to:
- Vercel
- Netlify
- Railway
- AWS Amplify
- Any Node.js hosting platform

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Raisyal Dwi Prayoga**
- GitHub: [@RaisyalD](https://github.com/RaisyalD)
- Email: radipprayoga2004@gmail.com

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [OpenAI](https://openai.com/)
- Database by [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

<div align="center">

Made with ❤️ for the Muslim community

**NURRA** - Your trusted Islamic AI assistant

</div>

