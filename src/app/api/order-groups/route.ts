import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('order_groups')
    .select(`
      id, vendor, order_client, project, order_date, author, created_at,
      pipe_orders(id, order_no, manufacturer, status, sale_amount, purchase_amount, freight),
      duct_orders(id, order_no, manufacturer, status, sale_amount, purchase_amount, freight)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // 그룹 기준 번호 생성 (업체별 이번달 pipe + duct 통합 순번, KST 기준)
  const now    = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const month  = kstNow.getUTCMonth() + 1
  const monthStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - 9 * 3600 * 1000).toISOString()
  const monthEnd   = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() + 1, 1) - 9 * 3600 * 1000).toISOString()

  const [{ count: pipeCount }, { count: ductCount }] = await Promise.all([
    supabaseServer.from('pipe_orders').select('*', { count: 'exact', head: true })
      .eq('vendor', body.vendor).gte('created_at', monthStart).lt('created_at', monthEnd)
      .then(r => ({ count: r.count ?? 0 })),
    supabaseServer.from('duct_orders').select('*', { count: 'exact', head: true })
      .eq('customer_name', body.vendor).gte('created_at', monthStart).lt('created_at', monthEnd)
      .then(r => ({ count: r.count ?? 0 })),
  ])
  const baseNo = `${month}-${pipeCount + ductCount + 1}`

  const { data, error } = await supabaseServer
    .from('order_groups')
    .insert({
      vendor:            body.vendor,
      order_client:      body.orderClient ?? null,
      project:           body.project ?? null,
      address:           body.address ?? null,
      delivery_location: body.deliveryLocation ?? null,
      delivery_dest:     body.deliveryDest ?? null,
      contact_name:      body.contactName ?? null,
      contact_phone:     body.contactPhone ?? null,
      order_date:        body.orderDate || null,
      author:            body.author ?? null,
      notes:             body.notes ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, baseNo }, { status: 201 })
}
