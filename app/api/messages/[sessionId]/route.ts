import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const createRlsClient = async () => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value
    console.log('createRlsClient - Token found:', !!token)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('createRlsClient - Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    })
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    return createClient(
      supabaseUrl,
      supabaseKey,
      token
        ? { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, detectSessionInUrl: false } }
        : { auth: { persistSession: false, detectSessionInUrl: false } }
    )
  } catch (error) {
    console.error('createRlsClient error:', error)
    throw error
  }
}

// GET /api/messages/:sessionId
export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await ctx.params
    const supabase = await createRlsClient()
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ messages: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

// POST /api/messages/:sessionId  body: { role: 'user'|'assistant', content: string }
export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const { role, content } = await req.json()
    console.log('POST /api/messages - Request body:', { role, content })
    
    if (!role || !content) {
      console.error('POST /api/messages - Missing role or content')
      return NextResponse.json({ error: "Missing role or content" }, { status: 400 })
    }
    
    const { sessionId } = await ctx.params
    console.log('POST /api/messages - Session ID:', sessionId)
    
    // Validate session ID format
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('POST /api/messages - Invalid session ID:', sessionId)
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 })
    }
    
    const supabase = await createRlsClient()
    console.log('POST /api/messages - Supabase client created')
    
    // First check if the session exists
    const { data: sessionCheck, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .single()
    
    if (sessionError || !sessionCheck) {
      console.error('POST /api/messages - Session not found:', sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    
    console.log('POST /api/messages - Session exists, inserting message')
    
    const { data, error } = await supabase
      .from("messages")
      .insert({ session_id: sessionId, role, content })
      .select("id, role, content, created_at")
      .single()
      
    console.log('POST /api/messages - Database response:', { data, error })
    
    if (error) {
      console.error('POST /api/messages - Database error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        code: error.code
      }, { status: 500 })
    }
    
    return NextResponse.json({ message: data })
  } catch (err: any) {
    console.error('POST /api/messages - Catch error:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name
    })
    return NextResponse.json({ 
      error: String(err?.message || err),
      type: 'server_error'
    }, { status: 500 })
  }
}


