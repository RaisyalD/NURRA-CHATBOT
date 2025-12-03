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

// GET /api/sessions/:id - Check if session exists
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    console.log('GET /api/sessions/[id] - Session ID:', id)
    
    const supabase = await createRlsClient()
    
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("id", id)
      .single()
    
    if (error) {
      console.log('GET /api/sessions/[id] - Session not found:', error.message)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    
    console.log('GET /api/sessions/[id] - Session found:', data)
    return NextResponse.json({ session: data })
  } catch (err: any) {
    console.error('GET /api/sessions/[id] - Error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

// PATCH /api/sessions/:id  body: { title?: string }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { title } = await req.json()
    const { id } = await ctx.params
    const supabase = await createRlsClient()
    const updates: any = {}
    if (title) updates.title = title
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }
    const { data, error } = await supabase
      .from("chat_sessions")
      .update(updates)
      .eq("id", id)
      .select("id, title, created_at, updated_at")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ session: data })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

// DELETE /api/sessions/:id
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const supabase = await createRlsClient()
    const { error } = await supabase.from("chat_sessions").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}


