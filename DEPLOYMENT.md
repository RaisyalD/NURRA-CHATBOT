# 🚀 Deployment Guide - NURRA Chatbot

Panduan lengkap untuk deploy NURRA Chatbot ke berbagai platform.

## 📋 Prerequisites

Sebelum deploy, pastikan:
- ✅ Code sudah di-push ke GitHub
- ✅ Environment variables sudah disiapkan
- ✅ Database Supabase sudah di-setup
- ✅ OpenAI API key sudah tersedia

## 🌐 Vercel (Recommended)

Vercel adalah platform terbaik untuk deploy Next.js applications.

### Step 1: Import Project

1. Login ke [Vercel](https://vercel.com)
2. Klik **"Add New Project"**
3. Import dari GitHub repository: `RaisyalD/NURRA-CHATBOT`
4. Klik **"Import"**

### Step 2: Configure Environment Variables

Tambahkan environment variables berikut di Vercel dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

**Cara menambahkan:**
1. Di halaman project settings, klik **"Environment Variables"**
2. Tambahkan setiap variable satu per satu
3. Pilih environment: Production, Preview, Development
4. Klik **"Save"**

### Step 3: Deploy

1. Klik **"Deploy"**
2. Tunggu proses build selesai
3. Setelah selesai, dapatkan URL production

### Step 4: Update Supabase Settings

Jika perlu, update Supabase URL redirects:
1. Buka Supabase Dashboard → Authentication → URL Configuration
2. Tambahkan Vercel URL ke **Redirect URLs**

## 🚂 Railway

### Step 1: Create Project

1. Login ke [Railway](https://railway.app)
2. Klik **"New Project"**
3. Pilih **"Deploy from GitHub repo"**
4. Pilih repository `RaisyalD/NURRA-CHATBOT`

### Step 2: Add Environment Variables

1. Klik **"Variables"** tab
2. Tambahkan semua environment variables
3. Railway akan auto-deploy setelah push ke GitHub

## ☁️ Netlify

### Step 1: Import Project

1. Login ke [Netlify](https://netlify.com)
2. Klik **"Add new site"** → **"Import an existing project"**
3. Connect dengan GitHub
4. Pilih repository `RaisyalD/NURRA-CHATBOT`

### Step 2: Build Settings

Netlify akan auto-detect Next.js, tapi pastikan:
- **Build command**: `npm run build`
- **Publish directory**: `.next`

### Step 3: Environment Variables

1. Klik **"Site settings"** → **"Environment variables"**
2. Tambahkan semua environment variables
3. Klik **"Deploy site"**

## 🔧 Environment Variables Checklist

Pastikan semua variable ini sudah di-set di platform deployment:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `DATABASE_URL` (optional)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (optional, untuk Edge Functions)

## 📝 Post-Deployment Checklist

Setelah deploy berhasil:

- [ ] Test login/register functionality
- [ ] Test chat functionality
- [ ] Test RAG search (jika sudah ada documents)
- [ ] Check console untuk errors
- [ ] Verify environment variables
- [ ] Test di mobile device
- [ ] Check analytics (jika menggunakan Vercel Analytics)

## 🔍 Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Pastikan semua required variables sudah di-set
- Check di platform dashboard

**Error: Module not found**
- Pastikan `package.json` dependencies lengkap
- Coba rebuild

### Runtime Errors

**Error: Failed to fetch (Supabase)**
- Check `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Pastikan Supabase project masih aktif
- Check Supabase dashboard untuk errors

**Error: OpenAI API error**
- Check `OPENAI_API_KEY` sudah benar
- Pastikan API key masih valid
- Check quota/billing di OpenAI dashboard

### Database Issues

**Tables not found**
- Run database setup script
- Check Supabase SQL Editor
- Verify RLS policies

## 🔄 Continuous Deployment

Setelah setup, setiap push ke `main` branch akan auto-deploy:

1. Push code ke GitHub
2. Platform akan auto-detect changes
3. Build dan deploy otomatis
4. Dapatkan notification saat selesai

## 📊 Monitoring

### Vercel Analytics
- Built-in analytics di Vercel dashboard
- Real-time monitoring
- Performance metrics

### Custom Monitoring
- Add error tracking (Sentry, etc.)
- Add analytics (Google Analytics, etc.)
- Monitor API usage

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Sudah di `.gitignore`
2. **Use environment variables** - Jangan hardcode secrets
3. **Enable RLS** - Row Level Security di Supabase
4. **Rate limiting** - Consider adding rate limits
5. **HTTPS only** - Semua platform modern sudah HTTPS

## 📚 Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

---

**Need help?** Open an issue di GitHub repository!

