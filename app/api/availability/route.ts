import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TENANT_ID = "11518e5f-6a0b-4bdc-bb6a-a1e142544579"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cabin_id = searchParams.get("cabin_id")
  const check_in = searchParams.get("check_in")
  const check_out = searchParams.get("check_out")

  if (!cabin_id || !check_in || !check_out) {
    return NextResponse.json({ available: false, error: "Faltan parámetros" }, { status: 400 })
  }

  const { data: bloques } = await supabase
    .from("calendar_blocks")
    .select("id, start_date, end_date")
    .eq("cabin_id", cabin_id)
    .eq("tenant_id", TENANT_ID)
    .lt("start_date", check_out)
    .gt("end_date", check_in)

  if (bloques && bloques.length > 0) {
    return NextResponse.json({ available: false })
  }

  return NextResponse.json({ available: true })
}