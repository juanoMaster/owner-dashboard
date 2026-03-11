import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cabinId = searchParams.get('cabin_id') || "CABIN_001";

  const { data: blocks, error } = await supabase
    .from('calendar_blocks')
    .select('id, date, status')
    .eq('cabin_id', cabinId)
    .or('status.is.null,status.neq.cancelled');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (blocks || []).map(b => ({
    id: b.id,
    start: b.date,
    end: b.date,
    color: '#e63946'
  }));

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  try {
    const { date, cabin_id } = await req.json();
    if (!date || !cabin_id) {
      return NextResponse.json(
        { error: 'date y cabin_id son requeridos' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('calendar_blocks').insert([
      {
        date,
        reason: 'manual',
        cabin_id,
        tenant_id: '11518e5f-6a0b-4bdc-bb6a-a1b9c3d1e2f4',
        status: 'active'
      }
    ]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}