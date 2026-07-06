import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateProfireDuctExcel, buildDuctExcelFilename } from '@/lib/duct-excel-generator'
import type { DuctOrderFormData } from '@/lib/duct-excel-generator'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: quote, error } = await supabaseServer
    .from('duct_quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !quote) {
    return NextResponse.json({ error: '견적서를 찾을 수 없습니다.' }, { status: 404 })
  }

  const formData: DuctOrderFormData = {
    orderNo:          null,
    manufacturer:     quote.manufacturer      ?? '프로화이어',
    customerName:     quote.customer_name     ?? null,
    project:          quote.project           ?? null,
    deliveryLocation: null,
    address:          null,
    deliveryDest:     null,
    contactName:      null,
    contactPhone:     null,
    orderDate:        quote.order_date        ?? null,
    deliveryDate:     quote.delivery_date     ?? null,
    author:           quote.author            ?? null,
    notes:            quote.notes             ?? null,
    items:            quote.items             ?? [],
  }

  try {
    const buffer   = await generateProfireDuctExcel(formData)
    const filename = buildDuctExcelFilename(formData).replace('수주서', '견적서')
    const encoded  = encodeURIComponent(filename)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      },
    })
  } catch (err) {
    console.error('[duct-quote-excel]', err)
    return NextResponse.json(
      { error: `Excel 생성 오류: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
