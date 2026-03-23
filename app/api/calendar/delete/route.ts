import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { cabin_id, id } = await req.json()
    if (!cabin_id || !id) {
      return NextResponse.json({ success: false, message: "cabin_id e id son requeridos" }, { status: 400 })
    }

    const { data: block } = await supabase
      .from("calendar_blocks")
      .select("booking_id, tenant_id")
      .eq("id", id)
      .eq("cabin_id", cabin_id)
      .single()

    const { error } = await supabase
      .from("calendar_blocks")
      .delete()
      .eq("id", id)
      .eq("cabin_id", cabin_id)

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    if (block?.booking_id && block?.tenant_id) {
      await supabase
        .from("bookings")
        .delete()
        .eq("id", block.booking_id)
        .eq("tenant_id", block.tenant_id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
