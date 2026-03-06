import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request){

  const body = await req.json()

  const { cabin_id, date } = body

  await supabase
    .from("calendar_blocks")
    .delete()
    .eq("cabin_id", cabin_id)
   .eq("start_date", date)

  return NextResponse.json({ success: true })

}