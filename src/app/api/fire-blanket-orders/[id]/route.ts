import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { saveFireBlanketSale, saveFireBlanketPurchase } from '@/lib/ecount'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('fire_blanket_orders')
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

  if (body._full) {
    // vendor는 프론트 정규화 필드 (실제 컬럼명: customer_name), order_client/id/created_at은 fire_blanket_orders에 없는 컬럼
    const { _full, vendor, order_client, id: _id, created_at, ...payload } = body
    const { error } = await supabaseServer
      .from('fire_blanket_orders')
      .update(payload)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // no_invoice 토글 단독 업데이트
  if (typeof body.no_invoice === 'boolean' && !body.status) {
    const { error } = await supabaseServer
      .from('fire_blanket_orders')
      .update({ no_invoice: body.no_invoice })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const VALID = ['수주', '발주', '납품', '취소']
  if (!VALID.includes(body.status)) {
    return NextResponse.json({ error: '잘못된 상태값' }, { status: 400 })
  }

  const { data: current } = await supabaseServer
    .from('fire_blanket_orders')
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
      .from('fire_blanket_orders')
      .update({ status: '납품', freight, status_history: newHistory })
      .eq('id', id)

    const { data: priceRow } = await supabaseServer
      .from('fire_blanket_prices')
      .select('roll_price')
      .eq('manufacturer', current.manufacturer ?? '')
      .single()

    const orderData = {
      id:            current.id,
      order_no:      current.order_no ?? null,
      customer_name: current.customer_name ?? '',
      manufacturer:  current.manufacturer ?? '',
      project:       current.project ?? '',
      address:       current.address ?? '',
      contact_name:  current.contact_name ?? '',
      contact_phone: current.contact_phone ?? '',
      order_date:    current.order_date ?? '',
      delivery_date: current.delivery_date ?? '',
      author:        current.author ?? '',
      notes:         current.notes ?? null,
      delivery_dest: current.delivery_dest ?? null,
      items:         current.items as any,
      roll_purchase_price: priceRow?.roll_price ?? undefined,
      freight,
      no_invoice: current.no_invoice ?? false,
    }

    let saleResult: 'ok' | 'skipped' | 'fail' = 'fail'
    let purchaseResult: 'ok' | 'skipped' | 'fail' = 'fail'
    let ecountError: string | null = null
    try { saleResult = await saveFireBlanketSale(orderData) } catch (e: any) {
      ecountError = e.message ?? 'ECOUNT 오류'
      console.error('[ecount] 방화포 판매입력 실패:', ecountError)
    }
    try { purchaseResult = await saveFireBlanketPurchase(orderData) } catch (e: any) {
      if (!ecountError) ecountError = e.message ?? 'ECOUNT 오류'
      console.error('[ecount] 방화포 구매입력 실패:', e.message)
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
    .from('fire_blanket_orders')
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
    .from('fire_blanket_orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
