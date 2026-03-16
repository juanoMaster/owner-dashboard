import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TENANT_ID = "11518e5f-6a0b-4bdc-bb6a-a1e142544579";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cabinId = searchParams.get('cabin_id');
  if (!cabinId) return NextResponse.json({ error: 'cabin_id requerido' }, { status: 400 });

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('calendar_blocks')
    .delete()
    .eq('cabin_id', cabinId)
    .eq('reason', 'transfer_pending')
    .lt('created_at', hace24h);

  const { data: blocks, error } = await supabase
    .from('calendar_blocks')
    .select('id, start_date, end_date, reason, created_at')
    .eq('cabin_id', cabinId)
    .eq('tenant_id', TENANT_ID);

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
      return NextResponse.json({ error: 'start_date, end_date y cabin_id son requeridos' }, { status: 400 });
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