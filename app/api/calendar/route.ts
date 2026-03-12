import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = '11518e5f-6a0b-4bdc-bb6a-a1e142544579';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cabinId = searchParams.get('cabin_id');
  if (!cabinId) return NextResponse.json({ error: 'cabin_id requerido' }, { status: 400 });

  const { data: blocks, error } = await supabase
    .from('calendar_blocks')
    .select('id, start_date, end_date, reason')
    .eq('cabin_id', cabinId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (blocks || []).map(b => ({
    id: b.id,
    start: b.start_date,
    end: b.end_date,
    reason: b.reason
  }));

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  try {
    const { start_date, end_date, cabin_id } = await req.json();

    if (!start_date || !end_date || !cabin_id) {
      return NextResponse.json(
        { error: 'start_date, end_date y cabin_id son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que no haya bloques que se superpongan
    const { data: overlapping } = await supabase
      .from('calendar_blocks')
      .select('id')
      .eq('cabin_id', cabin_id)
      .lte('start_date', end_date)
      .gte('end_date', start_date);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un bloqueo en esas fechas' },
        { status: 409 }
      );
    }

    const { error } = await supabase.from('calendar_blocks').insert([{
      start_date,
      end_date,
      reason: 'manual',
      cabin_id,
      tenant_id: TENANT_ID,
    }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}