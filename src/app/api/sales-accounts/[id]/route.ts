import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('sales_accounts')
    .select('*')
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
  const fields = ['name', 'contact_name', 'contact_phone', 'email', 'notes'] as const
  for (const f of fields) {
    if (f in body) update[f] = body[f] ?? null
  }

  const { data, error } = await supabaseServer
    .from('sales_accounts')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseServer.from('sales_accounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
