import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cabinId = searchParams.get('cabin_id')

  if (!cabinId) {
    return NextResponse.json({ error: 'cabin_id es requerido' }, { status: 400 })
  }

  const { data: cabin } = await supabase
    .from('cabins')
    .select('name')
    .eq('id', cabinId)
    .maybeSingle()

  const { data: blocks, error } = await supabase
    .from('calendar_blocks')
    .select('id, date, status')
    .eq('cabin_id', cabinId)
    .or('status.is.null,status.neq.cancelled')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const events = (blocks || []).map(b => ({
    id: b.id,
    start: b.date,
    end: b.date,
    color: '#e63946',
  }))

  return NextResponse.json({ events, cabin_name: cabin?.name || 'Cabaña' })
}

export async function POST(req: Request) {
  try {
    const { date, cabin_id } = await req.json()
    if (!date || !cabin_id) {
      return NextResponse.json({ error: 'date y cabin_id son requeridos' }, { status: 400 })
    }

    const { data: cabin } = await supabase
      .from('cabins')
      .select('tenant_id')
      .eq('id', cabin_id)
      .maybeSingle()

    if (!cabin) {
      return NextResponse.json({ error: 'Cabaña no encontrada' }, { status: 404 })
    }

    const { error } = await supabase.from('calendar_blocks').insert([{
      date,
      reason: 'manual',
      cabin_id,
      tenant_id: cabin.tenant_id,
      status: 'active',
    }])

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
