import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { saveDuctSaleOrder } from '@/lib/ecount'

export async function GET(req: NextRequest) {
  const standalone = req.nextUrl.searchParams.get('standalone') === 'true'

  let query = supabaseServer
    .from('duct_orders')
    .select('id, order_no, manufacturer, customer_name, project, contact_name, order_date, delivery_date, author, status, sale_amount, purchase_amount, freight, group_id, no_invoice, created_at')
    .order('created_at', { ascending: false })

  if (standalone) query = query.is('group_id', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // 그룹에서 직접 번호를 지정한 경우 그대로 사용, 아니면 자동 생성
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
      const [{ count: pipeCount }, { count: ductCount }] = await Promise.all([
        supabaseServer.from('pipe_orders').select('id', { count: 'exact', head: true })
          .eq('vendor', customerName).gte('created_at', monthStartUTC).lt('created_at', monthEndUTC),
        supabaseServer.from('duct_orders').select('id', { count: 'exact', head: true })
          .eq('customer_name', customerName).gte('created_at', monthStartUTC).lt('created_at', monthEndUTC),
      ])
      orderNo = `${month}-${(pipeCount ?? 0) + (ductCount ?? 0) + 1}`
    }
  }

  // 매출 금액 계산 (items.amount 합산)
  const saleAmount = ((body.items ?? []) as any[]).reduce((sum: number, item: any) => sum + (item.amount ?? 0), 0)

  // 매입 금액 계산 (duct_prices 기준)
  const { data: ductPriceRow } = await supabaseServer
    .from('duct_prices')
    .select('price_type, riser_price, wall_price, insul_50t_price, insul_25t_price')
    .eq('manufacturer', body.manufacturer ?? '')
    .single()

  let purchaseAmount = 0
  for (const item of ((body.items ?? []) as any[])) {
    if ((item.type === '입상' || item.type === '벽체') && ((item.width ?? 0) + (item.height ?? 0)) > 0) {
      if (ductPriceRow?.price_type === 'per_item') {
        purchaseAmount += Math.round(Number(item.purchase_price ?? 0) * (item.quantity ?? 0))
      } else {
        const price = item.type === '입상'
          ? Number(ductPriceRow?.riser_price ?? 0)
          : Number(ductPriceRow?.wall_price ?? 0)
        const perimeterM = Math.round(((item.width ?? 0) + (item.height ?? 0)) * 2 / 1000 * 1000) / 1000
        purchaseAmount += Math.round(price * perimeterM * (item.quantity ?? 0))
      }
    } else if (item.type === '차열재' && (item.quantity ?? 0) > 0) {
      const is50T = (item.spec ?? '').includes('50T')
      const price = is50T
        ? Number(ductPriceRow?.insul_50t_price ?? 0)
        : Number(ductPriceRow?.insul_25t_price ?? 0)
      purchaseAmount += Math.round(price * (item.quantity ?? 0))
    }
  }

  const { data: saved, error } = await supabaseServer
    .from('duct_orders')
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
      items: body.items ?? [],
      status: '수주',
      status_history: [{ type: 'status', value: '수주', at: new Date().toISOString() }],
      image_url: body.imageUrl ?? null,
      file_urls: body.fileUrls ?? [],
      sale_amount: Math.round(saleAmount),
      purchase_amount: purchaseAmount,
      group_id: body.groupId ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orderId = (saved as { id: string }).id
  let ecountResult: 'ok' | 'skipped' | 'fail' = 'fail'
  let ecountError: string | null = null
  try {
    ecountResult = await saveDuctSaleOrder({
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
      items: body.items ?? [],
    })
  } catch (e: any) {
    ecountError = e.message ?? 'ECOUNT 오류'
    console.error('[ecount] 덕트 등록 실패 (주문은 저장됨):', ecountError)
  }

  return NextResponse.json({ id: orderId, ecount: ecountResult, ecountError }, { status: 201 })
}
