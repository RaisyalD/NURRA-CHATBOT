#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🚀 Islamic AI Assistant - Edge Function Test')
console.log('===========================================\n')

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease check your .env.local file')
  process.exit(1)
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

async function testEdgeFunction() {
  try {
    console.log('🔍 Testing Edge Function...')
    
    // Get the function URL
    const projectRef = supabaseUrl.split('//')[1].split('.')[0]
    const functionUrl = `${supabaseUrl}/functions/v1/setup-db`
    
    console.log(`📍 Function URL: ${functionUrl}`)
    console.log(`🔑 Project Ref: ${projectRef}`)
    
    // Test the function by calling it
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    })
    
    if (response.ok) {
      const result = await response.text()
      console.log('✅ Edge Function is working!')
      console.log('📝 Response:', result)
    } else {
      console.error('❌ Edge Function failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('📝 Error details:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Error testing Edge Function:', error.message)
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Note: fetch is not available in Node.js < 18')
      console.log('Please use Node.js 18+ or install node-fetch')
    }
  }
}

async function checkDatabaseSetup() {
  try {
    console.log('\n🔍 Checking database setup...')
    
    // Check if table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'islamic_corpus')
      .eq('table_schema', 'public')
    
    if (tableError) {
      console.error('❌ Error checking tables:', tableError.message)
      return
    }
    
    if (tables && tables.length > 0) {
      console.log('✅ islamic_corpus table exists')
    } else {
      console.log('❌ islamic_corpus table not found')
    }
    
    // Check if function exists
    const { data: functions, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'match_documents')
      .eq('routine_schema', 'public')
    
    if (functionError) {
      console.error('❌ Error checking functions:', functionError.message)
      return
    }
    
    if (functions && functions.length > 0) {
      console.log('✅ match_documents function exists')
    } else {
      console.log('❌ match_documents function not found')
    }
    
    // Check if extension is enabled
    const { data: extensions, error: extensionError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'vector')
    
    if (extensionError) {
      console.error('❌ Error checking extensions:', extensionError.message)
      return
    }
    
    if (extensions && extensions.length > 0) {
      console.log('✅ pgvector extension is enabled')
    } else {
      console.log('❌ pgvector extension not found')
    }
    
  } catch (error) {
    console.error('❌ Error checking database setup:', error.message)
  }
}

async function main() {
  console.log('🔍 Checking environment...')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log(`🔑 Service Role Key: ${serviceRoleKey ? '✅ Set' : '❌ Missing'}`)
  
  if (!serviceRoleKey) {
    console.log('\n❌ SUPABASE_SERVICE_ROLE_KEY is required')
    console.log('Please add it to your .env.local file')
    return
  }
  
  // Test Edge Function
  await testEdgeFunction()
  
  // Check database setup
  await checkDatabaseSetup()
  
  console.log('\n📋 Summary:')
  console.log('- If Edge Function works: Database setup should be automatic')
  console.log('- If Edge Function fails: Use manual SQL setup')
  console.log('- Check README-SUPABASE-SETUP.md for detailed instructions')
}

// Run the test
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { testEdgeFunction, checkDatabaseSetup }
