import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// POST /api/users/upsert  { fullName?: string }
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: auth } = await supabase.auth.getUser()
    const me = auth?.user
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { fullName } = await req.json()
    const email = me.email || ""
    const id = me.id

    const { error } = await supabase
      .from("users")
      .upsert({ id, email, full_name: fullName || email.split('@')[0] }, { onConflict: "email" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}


