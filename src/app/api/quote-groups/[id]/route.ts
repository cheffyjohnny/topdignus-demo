import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('quote_groups')
    .select(`*, pipe_quotes(*), duct_quotes(*)`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  if (body.status) {
    const { data: current } = await supabaseServer
      .from('quote_groups').select('status_history').eq('id', id).single()
    const history = [...((current?.status_history ?? []) as object[]),
      { type: 'status', value: body.status, at: new Date().toISOString() }]
    const { error } = await supabaseServer
      .from('quote_groups').update({ status: body.status, status_history: history }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const patch: Record<string, unknown> = {}
  if ('vendor'    in body) patch.vendor     = body.vendor
  if ('project'   in body) patch.project    = body.project ?? null
  if ('orderDate' in body) patch.order_date = body.orderDate || null
  if ('author'    in body) patch.author     = body.author ?? null
  if ('notes'     in body) patch.notes      = body.notes ?? null

  const { error } = await supabaseServer.from('quote_groups').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await Promise.all([
    supabaseServer.from('pipe_quotes').delete().eq('group_id', id),
    supabaseServer.from('duct_quotes').delete().eq('group_id', id),
  ])
  const { error } = await supabaseServer.from('quote_groups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
