import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cabin_id, id } = body

    if (!cabin_id || !id) {
      return NextResponse.json({ success: false, message: "cabin_id e id son requeridos" }, { status: 400 })
    }

    const { error } = await supabase
      .from("calendar_blocks")
      .delete()
      .eq("id", id)
      .eq("cabin_id", cabin_id)

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Error interno del servidor",
    }, { status: 500 })
  }
}
