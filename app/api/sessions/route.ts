import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const createRlsClient = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token
      ? { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, detectSessionInUrl: false } }
      : { auth: { persistSession: false, detectSessionInUrl: false } }
  )
}

// GET /api/sessions?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const supabase = await createRlsClient()
    // userId may be an email (from custom auth) or a UUID (from Supabase Auth)
    let ownerId = userId
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
      // treat as email → resolve to user's UUID if exists
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("email", userId)
        .maybeSingle()
      ownerId = userRow?.id || "00000000-0000-0000-0000-000000000000" // dummy that yields 0 rows
    }

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

// POST /api/sessions
// body: { userId: string, title?: string }
export async function POST(req: NextRequest) {
  try {
    const { userId, title } = await req.json()
    console.log('POST /api/sessions - Request body:', { userId, title })
    
    if (!userId) {
      console.error('POST /api/sessions - Missing userId')
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const supabase = await createRlsClient()
    
    // For Supabase Auth, userId should be the auth.uid()
    let ownerId = userId
    
    // If userId is not a UUID, try to find the user by email
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
      console.log('POST /api/sessions - Looking up user by email:', userId)
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", userId)
        .maybeSingle()
      
      if (userError) {
        console.error('POST /api/sessions - Error looking up user:', userError)
        return NextResponse.json({ error: "User lookup failed" }, { status: 500 })
      }
      
      ownerId = userRow?.id || null
    }
    
    if (!ownerId) {
      console.error('POST /api/sessions - No valid owner ID found')
      return NextResponse.json({ error: "Invalid user" }, { status: 400 })
    }
    
    console.log('POST /api/sessions - Creating session for owner:', ownerId)
    
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: ownerId, title: title || "New Chat" })
      .select("id, title, created_at, updated_at")
      .single()

    if (error) {
      console.error('POST /api/sessions - Database error:', {
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

    console.log('POST /api/sessions - Session created successfully:', data)
    return NextResponse.json({ session: data })
  } catch (err: any) {
    console.error('POST /api/sessions - Catch error:', {
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


