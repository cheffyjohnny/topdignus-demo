import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateOrderExcel, buildExcelFilename } from '@/lib/excel-generator'
import type { OrderFormData, PriceRow } from '@/lib/excel-generator'

const QUOTE_SHEETS = [0, 1, 2, 21, 3, 4] // 발주서(5) 제외

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const manufacturer = req.nextUrl.searchParams.get('manufacturer')

  const { data: quote, error } = await supabaseServer
    .from('pipe_quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
  }

  const [{ data: prices }, { data: customers }] = await Promise.all([
    supabaseServer.from('pipe_prices').select('prod_key,unit_price,heat_type,heat_length_mm,sealant_volume'),
    supabaseServer.from('customers').select('name,sale_pct').eq('name', quote.vendor ?? ''),
  ])

  const priceRows   = (prices  ?? []) as PriceRow[]
  const discountPct = customers?.[0]?.sale_pct ?? null

  const mfr = manufacturer ?? quote.manufacturer ?? '필립산업'
  const formData: OrderFormData = {
    vendor:           quote.vendor          ?? '',
    orderClient:      '',
    author:           quote.author          ?? '',
    orderDate:        quote.order_date      ?? '',
    deliveryDate:     quote.delivery_date   ?? '',
    project:          quote.project         ?? '',
    deliveryLocation: '',
    address:          '',
    contactName:      '',
    contactPhone:     '',
    notes:            quote.notes           ?? '',
    deliveryDest:     '',
    orderNo:          '',
    manufacturer:     mfr,
    items:            manufacturer
      ? (quote.items ?? []).filter((it: any) => (it.manufacturer ?? quote.manufacturer ?? '') === manufacturer)
      : quote.items ?? [],
  }

  try {
    const buffer   = await generateOrderExcel(formData, priceRows, discountPct, QUOTE_SHEETS)
    const filename = buildExcelFilename(formData).replace('수발거인 ^^ ', '견적서 ^^ ')
    const encoded  = encodeURIComponent(filename)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      },
    })
  } catch (err) {
    console.error('[pipe-quote-excel]', err)
    return NextResponse.json(
      { error: `Excel 생성 오류: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
