import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import type { OrderFormData } from '@/lib/excel-generator'
import { enrichOrderItem, loadPipePriceRows } from '@/lib/order-enrichment'
import { buildPriceMap, buildPipeSleeveStructure, buildManufacturerMaps } from '@/lib/price-utils'
import { saveSaleOrder } from '@/lib/ecount'

export async function GET(req: NextRequest) {
  const vendor        = req.nextUrl.searchParams.get('vendor') ?? ''
  const standalone    = req.nextUrl.searchParams.get('standalone') === 'true'
  const manufacturers = req.nextUrl.searchParams.get('manufacturers') === 'true'

  // 배관 제조사 목록만 반환
  if (manufacturers) {
    const { data, error } = await supabaseServer
      .from('pipe_orders')
      .select('manufacturer')
      .order('manufacturer')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const unique = [...new Set((data ?? []).map((r: any) => r.manufacturer).filter(Boolean))]
    return NextResponse.json(unique)
  }

  let query = supabaseServer
    .from('pipe_orders')
    .select('id, order_no, vendor, project, contact_name, order_date, delivery_date, author, status, sale_amount, purchase_amount, freight, manufacturer, group_id, no_invoice, created_at')
    .order('created_at', { ascending: false })

  if (vendor)     query = query.eq('vendor', vendor)
  if (standalone) query = query.is('group_id', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as OrderFormData & { imageUrl?: string; fileUrls?: string[]; groupId?: string; orderNo?: string }

  // 그룹에서 직접 번호를 지정한 경우 그대로 사용, 아니면 자동 생성
  let orderNo = body.orderNo ?? ''
  if (!orderNo) {
    const now = new Date()
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const year = kstNow.getUTCFullYear()
    const month = kstNow.getUTCMonth() + 1
    const kstOffset = 9 * 60 * 60 * 1000
    const monthStartUTC = new Date(Date.UTC(year, month - 1, 1) - kstOffset).toISOString()
    const monthEndUTC = new Date(Date.UTC(year, month, 1) - kstOffset).toISOString()
    const customerName = body.vendor
    const [{ count: pipeCount }, { count: ductCount }] = await Promise.all([
      supabaseServer.from('pipe_orders').select('id', { count: 'exact', head: true })
        .eq('vendor', customerName).gte('created_at', monthStartUTC).lt('created_at', monthEndUTC),
      supabaseServer.from('duct_orders').select('id', { count: 'exact', head: true })
        .eq('customer_name', customerName).gte('created_at', monthStartUTC).lt('created_at', monthEndUTC),
    ])
    orderNo = `${month}-${(pipeCount ?? 0) + (ductCount ?? 0) + 1}`
  }

  // 단가표(ps·priceMap 생성용) + 거래처 병렬 조회 → enrichOrderItem에 ps 필요
  const [priceRows, customerRow] = await Promise.all([
    loadPipePriceRows(),
    supabaseServer.from('customers').select('sale_pct').eq('name', body.vendor).single(),
  ])
  const priceMap = buildPriceMap(priceRows)
  const ps = buildPipeSleeveStructure(priceRows)
  const { priceMapByMfr } = buildManufacturerMaps(priceRows)
  const sale_pct: number | undefined = customerRow.data?.sale_pct ?? undefined
  const enrichedItems = body.items.map(item => enrichOrderItem(item, ps))

  const { data: saved, error } = await supabaseServer
    .from('pipe_orders')
    .insert({
      order_no: orderNo,
      vendor: body.vendor,
      order_client: body.orderClient ?? null,
      project: body.project,
      delivery_location: body.deliveryLocation,
      address: body.address,
      contact_name: body.contactName,
      contact_phone: body.contactPhone,
      order_date: body.orderDate || null,
      delivery_date: body.deliveryDate || null,
      author: body.author,
      notes: body.notes,
      manufacturer: body.manufacturer ?? '필립산업',
      delivery_dest: body.deliveryDest,
      items: enrichedItems,
      status: '수주',
      status_history: [{ type: 'status', value: '수주', at: new Date().toISOString() }],
      image_url: body.imageUrl ?? null,
      file_urls: body.fileUrls ?? [],
      group_id: body.groupId ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orderId = (saved as { id: string }).id

  // 매출/매입 금액 계산 → 최초 저장 시 함께 기록
  const salePct = sale_pct ?? 100
  let saleAmount = 0
  let purchaseAmount = 0
  for (const item of enrichedItems) {
    const prodKey = item.internalName
      ? item.pipeSpec && item.sleeveSpec
        ? `${item.internalName}_${item.pipeSpec}_${item.sleeveSpec}`
        : item.pipeSpec
          ? `${item.internalName}_${item.pipeSpec}`
          : `${item.internalName}_${item.spec ?? ''}`
      : ''
    const itemMfr = (item as any).manufacturer ?? body.manufacturer ?? '필립산업'
    const mfrMap = priceMapByMfr.get(itemMfr) ?? priceMapByMfr.get('필립산업') ?? priceMap
    const unitPrice = mfrMap.get(prodKey) ?? 0
    const salePrice = Math.floor(unitPrice * 2 * salePct / 100 / 10) * 10
    saleAmount += salePrice * (item.quantity ?? 0)
    purchaseAmount += unitPrice * (item.quantity ?? 0)
  }
  await supabaseServer.from('pipe_orders').update({ sale_amount: saleAmount, purchase_amount: purchaseAmount }).eq('id', orderId)

  let ecountResult: 'ok' | 'skipped' | 'fail' = 'fail'
  let ecountError: string | null = null
  try {
    ecountResult = await saveSaleOrder({
      id: orderId,
      order_no: orderNo,
      vendor: body.vendor,
      manufacturer: body.manufacturer ?? '필립산업',
      sale_pct,
      order_client: body.orderClient ?? null,
      delivery_dest: body.deliveryDest ?? null,
      project: body.project,
      address: body.address ?? '',
      contact_name: body.contactName ?? '',
      contact_phone: body.contactPhone ?? '',
      order_date: body.orderDate ?? '',
      delivery_date: body.deliveryDate ?? '',
      author: body.author ?? '',
      notes: body.notes ?? null,
      items: enrichedItems,
      priceMap,
      pricesByMfr: priceMapByMfr,
    })
  } catch (e: any) {
    ecountError = e.message ?? 'ECOUNT 오류'
    console.error('[ecount] 등록 실패 (주문은 저장됨):', ecountError)
  }

  return NextResponse.json({ id: orderId, ecount: ecountResult, ecountError }, { status: 201 })
}
