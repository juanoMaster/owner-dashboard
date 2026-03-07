import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cabin_id, date } = body

    if (!cabin_id || !date) {
      return NextResponse.json(
        {
          success: false,
          message: "cabin_id y date son requeridos"
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("calendar_blocks")
      .delete()
      .eq("cabin_id", cabin_id)
      .eq("start_date", date)
      .eq("tenant_id", "11518e5f-6a0b-4bdc-bb6a-a1b9c3d1e2f4")

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : "Error interno del servidor"

    return NextResponse.json(
      {
        success: false,
        message
      },
      { status: 500 }
    )
  }
}