import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('sales_leads')
    .select('*, account:account_id(id, name, contact_name, contact_phone)')
    .eq('id', id)
    .single()
  if (error || !data) return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}
  const fields = ['dealership', 'project_name', 'address',
    'construction_company', 'facility_company', 'contact_name',
    'contact_phone', 'scale', 'notes', 'source_url', 'status', 'account_id'] as const
  for (const f of fields) {
    if (f in body) update[f] = body[f] ?? null
  }
  update.last_update = new Date().toISOString()

  if ('status' in body) {
    const { data: current } = await supabaseServer
      .from('sales_leads').select('status, status_history').eq('id', id).single()
    if (current && current.status !== body.status) {
      const entry = { from_status: current.status, to_status: body.status, changed_at: new Date().toISOString() }
      update.status_history = [...(current.status_history ?? []), entry]
    }
  }

  const { data, error } = await supabaseServer
    .from('sales_leads')
    .update(update)
    .eq('id', id)
    .select('*, account:account_id(id, name, contact_name, contact_phone)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseServer.from('sales_leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
