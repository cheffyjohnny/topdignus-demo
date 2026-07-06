import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { enrichOrderItem, loadPipeSleeveStructure } from '@/lib/order-enrichment'
import { saveSale, savePurchase } from '@/lib/ecount'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('pipe_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  // 전체 필드 업데이트
  if (body._full) {
    const { _full, ...payload } = body
    if (Array.isArray(payload.items)) {
      const ps = await loadPipeSleeveStructure()
      payload.items = payload.items.map((item: Parameters<typeof enrichOrderItem>[0]) => enrichOrderItem(item, ps))
    }
    const { error } = await supabaseServer
      .from('pipe_orders')
      .update(payload)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // no_invoice 토글 단독 업데이트
  if (typeof body.no_invoice === 'boolean' && !body.status) {
    const { error } = await supabaseServer
      .from('pipe_orders')
      .update({ no_invoice: body.no_invoice })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 상태만 업데이트
  const VALID = ['수주', '발주', '납품', '취소']
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: '잘못된 상태값' }, { status: 400 })
  }

  const { data: current } = await supabaseServer
    .from('pipe_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })

  // 납품 전환: 발주 상태에서만 가능 + 운임비 필수
  if (body.status === '납품') {
    if (current.status !== '발주') {
      return NextResponse.json({ error: '발주 상태에서만 납품 전환이 가능합니다.' }, { status: 400 })
    }
    const freight = Number(body.freight)
    if (!freight || freight <= 0) {
      return NextResponse.json({ error: '운임비를 입력해주세요.' }, { status: 400 })
    }

    const newHistory = [
      ...((current.status_history ?? []) as object[]),
      { type: 'status', value: '납품', at: new Date().toISOString() },
    ]
    await supabaseServer
      .from('pipe_orders')
      .update({ status: '납품', freight, status_history: newHistory })
      .eq('id', id)

    const [priceRows, customerRow] = await Promise.all([
      supabaseServer.from('pipe_prices').select('prod_key, unit_price, manufacturer')
        .then(({ data }) => data ?? []),
      supabaseServer.from('customers').select('sale_pct').eq('name', current.vendor).single(),
    ])

    const orderData = {
      id: current.id,
      order_no: current.order_no ?? undefined,
      vendor: current.vendor,
      manufacturer: current.manufacturer ?? '필립산업',
      sale_pct: customerRow.data?.sale_pct ?? undefined,
      order_client: current.order_client ?? null,
      delivery_dest: current.delivery_dest ?? null,
      project: current.project ?? '',
      address: current.address ?? '',
      contact_name: current.contact_name ?? '',
      contact_phone: current.contact_phone ?? '',
      order_date: current.order_date ?? '',
      delivery_date: current.delivery_date ?? '',
      author: current.author ?? '',
      notes: current.notes ?? null,
      items: current.items as any,
      priceMap: new Map((priceRows as any[]).map(r => [r.prod_key as string, Number(r.unit_price)])),
      pricesByMfr: (() => {
        const byMfr = new Map<string, Map<string, number>>()
        for (const r of priceRows as any[]) {
          const mfr = r.manufacturer ?? '필립산업'
          if (!byMfr.has(mfr)) byMfr.set(mfr, new Map())
          byMfr.get(mfr)!.set(r.prod_key as string, Number(r.unit_price))
        }
        return byMfr
      })(),
      freight,
      no_invoice: current.no_invoice ?? false,
    }

    let saleResult: 'ok' | 'skipped' | 'fail' = 'fail'
    let purchaseResult: 'ok' | 'skipped' | 'fail' = 'fail'
    let ecountError: string | null = null
    try { saleResult = await saveSale(orderData) } catch (e: any) {
      ecountError = e.message ?? 'ECOUNT 오류'
      console.error('[ecount] 판매입력 실패:', ecountError)
    }
    try { purchaseResult = await savePurchase(orderData) } catch (e: any) {
      if (!ecountError) ecountError = e.message ?? 'ECOUNT 오류'
      console.error('[ecount] 구매입력 실패:', e.message)
    }

    const ecountResult: 'ok' | 'skipped' | 'fail' =
      (saleResult === 'fail' || purchaseResult === 'fail') ? 'fail'
      : (saleResult === 'skipped' || purchaseResult === 'skipped') ? 'skipped'
      : 'ok'

    return NextResponse.json({ ok: true, ecount: ecountResult, ecountError })
  }

  // 그 외 상태 변경 (수주, 발주, 취소)
  const newHistory = [
    ...((current.status_history ?? []) as object[]),
    { type: 'status', value: body.status, at: new Date().toISOString() },
  ]

  const { error } = await supabaseServer
    .from('pipe_orders')
    .update({ status: body.status, status_history: newHistory })
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
    .from('pipe_orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
