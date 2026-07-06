import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { saveFireBlanketSaleOrder } from '@/lib/ecount'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('fire_blanket_orders')
    .select('id, order_no, manufacturer, customer_name, project, contact_name, order_date, delivery_date, author, status, sale_amount, purchase_amount, freight, no_invoice, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  let orderNo: string | null = body.orderNo ?? null
  if (!orderNo) {
    const now = new Date()
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const year = kstNow.getUTCFullYear()
    const month = kstNow.getUTCMonth() + 1
    const kstOffset = 9 * 60 * 60 * 1000
    const monthStartUTC = new Date(Date.UTC(year, month - 1, 1) - kstOffset).toISOString()
    const monthEndUTC = new Date(Date.UTC(year, month, 1) - kstOffset).toISOString()
    const customerName = body.customerName ?? ''
    if (customerName) {
      const [{ count: pipeCount }, { count: ductCount }, { count: fbCount }] = await Promise.all([
        supabaseServer.from('pipe_orders').select('id', { count: 'exact', head: true })
          .eq('vendor', customerName).gte('created_at', monthStartUTC).lt('created_at', monthEndUTC),
        supabaseServer.from('duct_orders').select('id', { count: 'exact', head: true })
          .eq('customer_name', customerName).gte('created_at', monthStartUTC).lt('created_at', monthEndUTC),
        supabaseServer.from('fire_blanket_orders').select('id', { count: 'exact', head: true })
          .eq('customer_name', customerName).gte('created_at', monthStartUTC).lt('created_at', monthEndUTC),
      ])
      orderNo = `${month}-${(pipeCount ?? 0) + (ductCount ?? 0) + (fbCount ?? 0) + 1}`
    }
  }

  // 매출 금액 계산 (items.amount 합산)
  const items = (body.items ?? []) as any[]
  const saleAmount = items.reduce((sum: number, item: any) => sum + (item.amount ?? 0), 0)

  // 매입 금액 계산 (fire_blanket_prices 기준 — 롤 단가 × 수량)
  const { data: priceRows } = await supabaseServer
    .from('fire_blanket_prices')
    .select('item_name, roll_price')
    .eq('manufacturer', body.manufacturer ?? '')

  const priceByItem = new Map((priceRows ?? []).map((r: any) => [r.item_name as string, Number(r.roll_price)]))
  const defaultRollPrice = priceByItem.get('') ?? priceByItem.values().next().value ?? 0

  let purchaseAmount = 0
  for (const item of items) {
    if ((item.quantity ?? 0) > 0) {
      const price = priceByItem.get(item.name ?? '') ?? defaultRollPrice
      purchaseAmount += Math.round(price * (item.quantity ?? 0))
    }
  }

  const { data: saved, error } = await supabaseServer
    .from('fire_blanket_orders')
    .insert({
      order_no: orderNo,
      manufacturer: body.manufacturer,
      customer_name: body.customerName ?? null,
      project: body.project ?? null,
      delivery_location: body.deliveryLocation ?? null,
      address: body.address ?? null,
      contact_name: body.contactName ?? null,
      contact_phone: body.contactPhone ?? null,
      order_date: body.orderDate || null,
      delivery_date: body.deliveryDate || null,
      author: body.author ?? null,
      notes: body.notes ?? null,
      delivery_dest: body.deliveryDest ?? null,
      items,
      status: '수주',
      status_history: [{ type: 'status', value: '수주', at: new Date().toISOString() }],
      image_url: body.imageUrl ?? null,
      file_urls: body.fileUrls ?? [],
      sale_amount: Math.round(saleAmount),
      purchase_amount: purchaseAmount,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orderId = (saved as { id: string }).id
  let ecountResult: 'ok' | 'skipped' | 'fail' = 'fail'
  let ecountError: string | null = null
  try {
    ecountResult = await saveFireBlanketSaleOrder({
      id: orderId,
      order_no: orderNo,
      customer_name: body.customerName ?? '',
      manufacturer: body.manufacturer ?? '',
      project: body.project ?? null,
      address: body.address ?? null,
      contact_name: body.contactName ?? null,
      contact_phone: body.contactPhone ?? null,
      order_date: body.orderDate ?? null,
      delivery_date: body.deliveryDate ?? null,
      author: body.author ?? null,
      notes: body.notes ?? null,
      delivery_dest: body.deliveryDest ?? null,
      items,
    })
  } catch (e: any) {
    ecountError = e.message ?? 'ECOUNT 오류'
    console.error('[ecount] 방화포 등록 실패 (주문은 저장됨):', ecountError)
  }

  return NextResponse.json({ id: orderId, ecount: ecountResult, ecountError }, { status: 201 })
}
