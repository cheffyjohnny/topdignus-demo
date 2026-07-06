import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { enrichOrderItem, loadPipePriceRows } from '@/lib/order-enrichment'
import { buildPriceMap, buildPipeSleeveStructure, buildManufacturerMaps } from '@/lib/price-utils'
import {
  saveSaleOrder, savePurchase, saveSale,
  saveDuctSaleOrder, saveDuctPurchase, saveDuctSale,
  saveFireBlanketSaleOrder, saveFireBlanketPurchase, saveFireBlanketSale,
} from '@/lib/ecount'

type Action = 'sale_order' | 'purchase' | 'sale'

export async function POST(req: NextRequest) {
  const { order_no, action } = await req.json() as { order_no: string; action: Action }

  if (!order_no || !action) {
    return NextResponse.json({ error: 'order_no, action 필수' }, { status: 400 })
  }

  // ── 배관 수주서 조회 ──
  const { data: pipeOrder } = await supabaseServer
    .from('pipe_orders')
    .select('*')
    .eq('order_no', order_no)
    .single()

  if (pipeOrder) {
    const [priceRows, customerRow] = await Promise.all([
      loadPipePriceRows(),
      supabaseServer.from('customers').select('sale_pct').eq('name', pipeOrder.vendor).single(),
    ])
    const priceMap = buildPriceMap(priceRows)
    const ps = buildPipeSleeveStructure(priceRows)
    const { priceMapByMfr } = buildManufacturerMaps(priceRows)
    const sale_pct: number | undefined = customerRow.data?.sale_pct ?? undefined
    const enrichedItems = (pipeOrder.items as any[]).map(item => enrichOrderItem(item, ps))

    const orderData = {
      id:            pipeOrder.id,
      order_no:      pipeOrder.order_no ?? undefined,
      vendor:        pipeOrder.vendor,
      manufacturer:  pipeOrder.manufacturer ?? '필립산업',
      sale_pct,
      order_client:  pipeOrder.order_client ?? null,
      delivery_dest: pipeOrder.delivery_dest ?? null,
      project:       pipeOrder.project ?? '',
      address:       pipeOrder.address ?? '',
      contact_name:  pipeOrder.contact_name ?? '',
      contact_phone: pipeOrder.contact_phone ?? '',
      order_date:    pipeOrder.order_date ?? '',
      delivery_date: pipeOrder.delivery_date ?? '',
      author:        pipeOrder.author ?? '',
      notes:         pipeOrder.notes ?? null,
      items:         enrichedItems,
      priceMap,
      pricesByMfr:   priceMapByMfr,
      freight:       pipeOrder.freight ?? 0,
      no_invoice:    pipeOrder.no_invoice ?? false,
    }

    try {
      let result: 'ok' | 'skipped'
      if (action === 'sale_order') result = await saveSaleOrder(orderData)
      else if (action === 'purchase') result = await savePurchase(orderData)
      else result = await saveSale(orderData)

      if (result === 'skipped') {
        return NextResponse.json({ ok: true, skipped: true, message: `${order_no} (배관) → 매핑 가능한 품목이 없어 ECOUNT ${ACTION_LABEL[action]}을 건너뛰었습니다.` })
      }
      return NextResponse.json({ ok: true, message: `${order_no} (배관) → ECOUNT ${ACTION_LABEL[action]} 완료` })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message ?? 'ECOUNT 오류' }, { status: 500 })
    }
  }

  // ── 덕트 수주서 조회 ──
  const { data: ductOrder } = await supabaseServer
    .from('duct_orders')
    .select('*')
    .eq('order_no', order_no)
    .single()

  if (ductOrder) {
    const { data: ductPriceRow } = await supabaseServer
      .from('duct_prices')
      .select('riser_price, wall_price, insul_50t_price, insul_25t_price')
      .eq('manufacturer', ductOrder.manufacturer ?? '')
      .single()

    const orderData = {
      id:            ductOrder.id,
      order_no:      ductOrder.order_no ?? null,
      customer_name: ductOrder.customer_name ?? '',
      manufacturer:  ductOrder.manufacturer ?? '',
      project:       ductOrder.project ?? '',
      address:       ductOrder.address ?? '',
      contact_name:  ductOrder.contact_name ?? '',
      contact_phone: ductOrder.contact_phone ?? '',
      order_date:    ductOrder.order_date ?? '',
      delivery_date: ductOrder.delivery_date ?? '',
      author:        ductOrder.author ?? '',
      notes:         ductOrder.notes ?? null,
      delivery_dest: ductOrder.delivery_dest ?? null,
      items:         ductOrder.items as any,
      riser_purchase_price:     ductPriceRow?.riser_price ?? undefined,
      wall_purchase_price:      ductPriceRow?.wall_price ?? undefined,
      insul_50t_purchase_price: ductPriceRow?.insul_50t_price ?? undefined,
      insul_25t_purchase_price: ductPriceRow?.insul_25t_price ?? undefined,
      freight:       ductOrder.freight ?? 0,
      no_invoice:    ductOrder.no_invoice ?? false,
    }

    try {
      let result: 'ok' | 'skipped'
      if (action === 'sale_order') result = await saveDuctSaleOrder(orderData)
      else if (action === 'purchase') result = await saveDuctPurchase(orderData)
      else result = await saveDuctSale(orderData)

      if (result === 'skipped') {
        return NextResponse.json({ ok: true, skipped: true, message: `${order_no} (덕트) → 매핑 가능한 품목이 없어 ECOUNT ${ACTION_LABEL[action]}을 건너뛰었습니다.` })
      }
      return NextResponse.json({ ok: true, message: `${order_no} (덕트) → ECOUNT ${ACTION_LABEL[action]} 완료` })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message ?? 'ECOUNT 오류' }, { status: 500 })
    }
  }

  // ── 방화포 수주서 조회 ──
  const { data: fbOrder } = await supabaseServer
    .from('fire_blanket_orders')
    .select('*')
    .eq('order_no', order_no)
    .single()

  if (fbOrder) {
    const { data: priceRow } = await supabaseServer
      .from('fire_blanket_prices')
      .select('roll_price')
      .eq('manufacturer', fbOrder.manufacturer ?? '')
      .single()

    const orderData = {
      id:            fbOrder.id,
      order_no:      fbOrder.order_no ?? null,
      customer_name: fbOrder.customer_name ?? '',
      manufacturer:  fbOrder.manufacturer ?? '',
      project:       fbOrder.project ?? '',
      address:       fbOrder.address ?? '',
      contact_name:  fbOrder.contact_name ?? '',
      contact_phone: fbOrder.contact_phone ?? '',
      order_date:    fbOrder.order_date ?? '',
      delivery_date: fbOrder.delivery_date ?? '',
      author:        fbOrder.author ?? '',
      notes:         fbOrder.notes ?? null,
      delivery_dest: fbOrder.delivery_dest ?? null,
      items:         fbOrder.items as any,
      roll_purchase_price: priceRow?.roll_price ?? undefined,
      freight:       fbOrder.freight ?? 0,
      no_invoice:    fbOrder.no_invoice ?? false,
    }

    try {
      let result: 'ok' | 'skipped'
      if (action === 'sale_order') result = await saveFireBlanketSaleOrder(orderData)
      else if (action === 'purchase') result = await saveFireBlanketPurchase(orderData)
      else result = await saveFireBlanketSale(orderData)

      if (result === 'skipped') {
        return NextResponse.json({ ok: true, skipped: true, message: `${order_no} (방화포) → 매핑 가능한 품목이 없어 ECOUNT ${ACTION_LABEL[action]}을 건너뛰었습니다.` })
      }
      return NextResponse.json({ ok: true, message: `${order_no} (방화포) → ECOUNT ${ACTION_LABEL[action]} 완료` })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message ?? 'ECOUNT 오류' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: `수주서 "${order_no}" 를 찾을 수 없습니다. (배관·덕트·방화포 모두 조회)` }, { status: 404 })
}

const ACTION_LABEL: Record<Action, string> = {
  sale_order: '주문서 입력',
  purchase:   '구매입력',
  sale:       '판매입력',
}
