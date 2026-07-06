import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { saveQuotation } from '@/lib/ecount'

type QuoteType = 'pipe' | 'duct'

export async function POST(req: NextRequest) {
  const { quote_id, quote_type } = await req.json() as { quote_id: string; quote_type: QuoteType }

  if (!quote_id || !quote_type) {
    return NextResponse.json({ error: 'quote_id, quote_type 필수' }, { status: 400 })
  }

  // ── 배관 견적서 ──
  if (quote_type === 'pipe') {
    const { data: quote, error } = await supabaseServer
      .from('pipe_quotes')
      .select('*')
      .eq('id', quote_id)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: `배관 견적서 "${quote_id}" 를 찾을 수 없습니다.` }, { status: 404 })
    }

    const ecountItems = (quote.items as any[]).map((it: any) => ({
      name: it.name || it.displayName || '',
      internalName: it.internalName || '',
      spec: it.spec || '',
      quantity: it.quantity ?? 1,
      unit_price: it.unitPrice ?? 0,
    }))

    try {
      const result = await saveQuotation({
        id: quote.id,
        vendor: quote.vendor,
        manufacturer: quote.manufacturer ?? '필립산업',
        project: quote.project ?? null,
        address: quote.address ?? null,
        contact_name: quote.contact_name ?? null,
        contact_phone: quote.contact_phone ?? null,
        order_date: quote.order_date ?? null,
        agree_date: quote.delivery_date ?? null,
        author: quote.author ?? null,
        notes: quote.notes ?? null,
        items: ecountItems,
      })

      if (result.result === 'skipped') {
        return NextResponse.json({ ok: true, skipped: true, message: `배관 견적서 → 매핑 가능한 품목이 없어 건너뛰었습니다.` })
      }
      if (result.result === 'fail') {
        return NextResponse.json({ ok: false, error: result.error ?? 'ECOUNT 견적서 등록 실패' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, message: `배관 견적서 → ECOUNT 견적서 등록 완료` })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message ?? 'ECOUNT 오류' }, { status: 500 })
    }
  }

  // ── 덕트 견적서 ──
  if (quote_type === 'duct') {
    const { data: quote, error } = await supabaseServer
      .from('duct_quotes')
      .select('*')
      .eq('id', quote_id)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: `덕트 견적서 "${quote_id}" 를 찾을 수 없습니다.` }, { status: 404 })
    }

    const ecountItems = (quote.items as any[]).map((it: any) => {
      const isInsul = it.type === '차열재'
      const prodCd = isInsul ? 'B01' : 'SD01'
      const name = it.type === '입상' ? '입상_사각덕트'
        : it.type === '벽체' ? '벽체_사각덕트'
        : it.type === '차열재' ? '차열재'
        : String(it.type ?? '')
      const amount = it.amount ?? Math.round((it.unit_price ?? 0) * (it.quantity ?? 1))
      const qty = it.quantity ?? 1
      const effectivePrice = qty > 0 ? Math.round(amount / qty) : 0
      return {
        prodCd,
        name,
        spec: it.spec ?? (it.width && it.height ? `${it.width}×${it.height}mm` : ''),
        quantity: qty,
        unit_price: effectivePrice,
        supply_amt: amount,
      }
    })

    try {
      const result = await saveQuotation({
        id: quote.id,
        vendor: quote.customer_name ?? '',
        manufacturer: quote.manufacturer ?? '',
        project: quote.project ?? null,
        address: quote.address ?? null,
        contact_name: quote.contact_name ?? null,
        contact_phone: quote.contact_phone ?? null,
        order_date: quote.order_date ?? null,
        agree_date: quote.delivery_date ?? null,
        author: quote.author ?? null,
        notes: quote.notes ?? null,
        items: ecountItems,
      })

      if (result.result === 'skipped') {
        return NextResponse.json({ ok: true, skipped: true, message: `덕트 견적서 → 매핑 가능한 품목이 없어 건너뛰었습니다.` })
      }
      if (result.result === 'fail') {
        return NextResponse.json({ ok: false, error: result.error ?? 'ECOUNT 견적서 등록 실패' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, message: `덕트 견적서 → ECOUNT 견적서 등록 완료` })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e.message ?? 'ECOUNT 오류' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: '유효하지 않은 quote_type' }, { status: 400 })
}
