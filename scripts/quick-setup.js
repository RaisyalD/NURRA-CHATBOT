#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Islamic AI Assistant - Quick Setup')
console.log('=====================================\n')

// Check if .env.local exists
const envPath = path.join(__dirname, '../.env.local')
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...')
  
  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mpezevaozsqpirfozcfv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZXpldmFvenNxcGlyZm96Y2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MDM4ODUsImV4cCI6MjA3MjI3OTg4NX0.rOmsa-ua_ErgnXmgzAmyCUYKqN5-lDQSzYLfHOhhsEc

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration (optional)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mpezevaozsqpirfozcfv.supabase.co:5432/postgres
`
  
  fs.writeFileSync(envPath, envContent)
  console.log('✅ .env.local created')
  console.log('⚠️  Please update OPENAI_API_KEY in .env.local with your actual API key\n')
} else {
  console.log('✅ .env.local already exists\n')
}

// Check if documents directory exists
const documentsDir = path.join(__dirname, '../documents')
if (!fs.existsSync(documentsDir)) {
  console.log('📁 Creating documents directory...')
  fs.mkdirSync(documentsDir, { recursive: true })
  console.log('✅ Documents directory created')
  console.log('📚 Place your Islamic documents (PDF/text files) in the documents/ directory\n')
} else {
  console.log('✅ Documents directory already exists\n')
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '../node_modules')
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...')
  try {
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
    console.log('✅ Dependencies installed\n')
  } catch (error) {
    console.error('❌ Failed to install dependencies')
    console.error('Please run: npm install')
    process.exit(1)
  }
} else {
  console.log('✅ Dependencies already installed\n')
}

console.log('🎯 Setup Steps Remaining:')
console.log('1. Update OPENAI_API_KEY in .env.local')
console.log('2. Run: npm run setup-db')
console.log('3. Add documents to documents/ directory')
console.log('4. Run: npm run ingest')
console.log('5. Run: npm run dev')
console.log('\n📖 For detailed instructions, see README-RAG.md')

console.log('\n🎉 Quick setup completed!')
