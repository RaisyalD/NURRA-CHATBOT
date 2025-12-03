#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Islamic AI Assistant - Supabase Setup')
console.log('========================================\n')

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'pipe' })
    return true
  } catch (error) {
    return false
  }
}

// Check if .env.local exists and has required variables
function checkEnvironment() {
  const envPath = path.join(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!')
    console.error('Please create .env.local with the required environment variables:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL')
    console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('- SUPABASE_SERVICE_ROLE_KEY')
    console.error('- OPENAI_API_KEY')
    return false
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ]

  const missingVars = requiredVars.filter(varName => !envContent.includes(varName))
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables in .env.local:')
    missingVars.forEach(varName => console.error(`  - ${varName}`))
    return false
  }

  console.log('✅ Environment variables check passed')
  return true
}

// Initialize Supabase project
function initSupabase() {
  try {
    console.log('🚀 Initializing Supabase project...')
    
    // Check if supabase directory exists
    const supabaseDir = path.join(__dirname, '../supabase')
    if (!fs.existsSync(supabaseDir)) {
      console.log('📁 Creating supabase directory...')
      fs.mkdirSync(supabaseDir, { recursive: true })
    }

    // Check if config.toml exists
    const configPath = path.join(supabaseDir, 'config.toml')
    if (!fs.existsSync(configPath)) {
      console.log('📝 Creating Supabase config...')
      fs.copyFileSync(
        path.join(__dirname, '../supabase/config.toml'),
        configPath
      )
    }

    console.log('✅ Supabase project initialized')
    return true
  } catch (error) {
    console.error('❌ Failed to initialize Supabase project:', error.message)
    return false
  }
}

// Deploy Edge Function
function deployEdgeFunction() {
  try {
    console.log('🚀 Deploying setup-db Edge Function...')
    
    // Set environment variables for the deployment
    const envPath = path.join(__dirname, '../.env.local')
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    // Extract SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrlMatch = envContent.match(/SUPABASE_URL=(.+)/)
    const serviceRoleKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
    
    if (!supabaseUrlMatch || !serviceRoleKeyMatch) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    }

    const supabaseUrl = supabaseUrlMatch[1].trim()
    const serviceRoleKey = serviceRoleKeyMatch[1].trim()

    // Deploy the function
    execSync(`supabase functions deploy setup-db --project-ref ${supabaseUrl.split('//')[1].split('.')[0]}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey
      }
    })

    console.log('✅ Edge Function deployed successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to deploy Edge Function:', error.message)
    console.log('\n💡 Alternative: You can run the setup manually in Supabase SQL Editor')
    return false
  }
}

// Main setup function
async function main() {
  console.log('🔍 Checking prerequisites...\n')

  // Check Supabase CLI
  if (!checkSupabaseCLI()) {
    console.log('\n📦 Installing Supabase CLI...')
    console.log('Please install Supabase CLI first:')
    console.log('  npm install -g supabase')
    console.log('  or')
    console.log('  brew install supabase/tap/supabase')
    console.log('\nThen run this script again.')
    return
  }

  // Check environment
  if (!checkEnvironment()) {
    return
  }

  // Initialize Supabase
  if (!initSupabase()) {
    return
  }

  // Deploy Edge Function
  if (!deployEdgeFunction()) {
    console.log('\n📋 Manual Setup Instructions:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run the SQL commands from supabase/functions/setup-db/index.ts manually')
    console.log('4. Or use the Node.js script: npm run setup-db')
    return
  }

  console.log('\n🎉 Setup completed successfully!')
  console.log('\n📋 Next steps:')
  console.log('1. Add documents to the documents/ directory')
  console.log('2. Run: npm run ingest')
  console.log('3. Run: npm run dev')
  console.log('\n📖 For detailed instructions, see README-RAG.md')
}

// Run the setup
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main }
