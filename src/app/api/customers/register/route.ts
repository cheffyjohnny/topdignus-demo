import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { registerEcountCustomer } from '@/lib/ecount'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = (body.name ?? '').trim()
  const salePct = Number(body.sale_pct)
  if (!name || isNaN(salePct) || salePct <= 0 || salePct > 100) {
    return NextResponse.json({ error: '업체명과 판매가 비율(1~100)은 필수입니다.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('customers')
    .upsert({ name, sale_pct: salePct }, { onConflict: 'name', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ductSalePrices = Array.isArray(body.ductSalePrices) ? body.ductSalePrices : []
  if (ductSalePrices.length > 0) {
    const { data: customer, error: custErr } = await supabaseServer
      .from('customers').select('id').eq('name', name).single()
    if (!custErr && customer) {
      type DspRow = { manufacturer: string; riser_sale_price: number; wall_sale_price: number }
      const rows = (ductSalePrices as DspRow[])
        .filter(r => r.manufacturer && ((Number(r.riser_sale_price) || 0) > 0 || (Number(r.wall_sale_price) || 0) > 0))
        .map(r => ({
          manufacturer: r.manufacturer,
          customer_id: customer.id,
          riser_sale_price: Number(r.riser_sale_price) || 0,
          wall_sale_price: Number(r.wall_sale_price) || 0,
        }))
      if (rows.length > 0) {
        const { error: dspErr } = await supabaseServer
          .from('duct_sale_prices')
          .upsert(rows, { onConflict: 'manufacturer,customer_id' })
        if (dspErr) console.error('[duct_sale_prices] 등록 실패:', dspErr.message)
      }
    }
  }

  let ecountOk = false
  try {
    await registerEcountCustomer(name)
    ecountOk = true
  } catch (e: any) {
    console.error('[ecount] 거래처 등록 실패:', e.message)
  }

  return NextResponse.json({ ok: true, ecount: ecountOk ? 'ok' : 'fail' })
}
