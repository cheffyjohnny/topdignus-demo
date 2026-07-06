import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('sales_leads')
    .select('*, account:account_id(id, name, contact_name, contact_phone)')
    .order('seq', { ascending: true, nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data: maxRow } = await supabaseServer
    .from('sales_leads')
    .select('seq')
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextSeq = (maxRow?.seq ?? 0) + 1

  const { data, error } = await supabaseServer
    .from('sales_leads')
    .insert({
      seq: nextSeq,
      dealership: body.dealership ?? null,
      project_name: body.project_name ?? null,
      address: body.address ?? null,
      construction_company: body.construction_company ?? null,
      facility_company: body.facility_company ?? null,
      contact_name: body.contact_name ?? null,
      contact_phone: body.contact_phone ?? null,
      scale: body.scale ?? null,
      notes: body.notes ?? null,
      source_url: body.source_url ?? null,
      status: body.status ?? '등록',
      account_id: body.account_id ?? null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })
  const { error } = await supabaseServer.from('sales_leads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
