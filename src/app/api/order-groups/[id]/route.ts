import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('order_groups')
    .select(`*, pipe_orders(*), duct_orders(*)`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const patch: Record<string, unknown> = {}
  if ('vendor'           in body) patch.vendor            = body.vendor
  if ('orderClient'      in body) patch.order_client      = body.orderClient ?? null
  if ('project'          in body) patch.project           = body.project ?? null
  if ('address'          in body) patch.address           = body.address ?? null
  if ('deliveryLocation' in body) patch.delivery_location = body.deliveryLocation ?? null
  if ('deliveryDest'     in body) patch.delivery_dest     = body.deliveryDest ?? null
  if ('contactName'      in body) patch.contact_name      = body.contactName ?? null
  if ('contactPhone'     in body) patch.contact_phone     = body.contactPhone ?? null
  if ('orderDate'        in body) patch.order_date        = body.orderDate || null
  if ('author'           in body) patch.author            = body.author ?? null
  if ('notes'            in body) patch.notes             = body.notes ?? null

  const { error } = await supabaseServer.from('order_groups').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await Promise.all([
    supabaseServer.from('pipe_orders').update({ group_id: null }).eq('group_id', id),
    supabaseServer.from('duct_orders').update({ group_id: null }).eq('group_id', id),
  ])
  const { error } = await supabaseServer.from('order_groups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
