import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('pipe_quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  if (body._full) {
    const { _full, ...payload } = body
    const { error } = await supabaseServer
      .from('pipe_quotes')
      .update(payload)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const VALID = ['검토중', '검토완료', '송부완료', '수주확정', '취소']
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: '잘못된 상태값' }, { status: 400 })
  }

  const { data: current } = await supabaseServer
    .from('pipe_quotes')
    .select('status_history')
    .eq('id', id)
    .single()

  const newHistory = [
    ...((current?.status_history ?? []) as object[]),
    { type: 'status', value: body.status, at: new Date().toISOString() },
  ]

  const update: Record<string, unknown> = { status: body.status, status_history: newHistory }
  if (body.converted_order_id) update.converted_order_id = body.converted_order_id

  const { error } = await supabaseServer
    .from('pipe_quotes')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseServer
    .from('pipe_quotes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
