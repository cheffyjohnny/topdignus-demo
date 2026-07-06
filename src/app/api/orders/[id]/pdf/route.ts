import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateOrderExcel } from '@/lib/excel-generator'
import type { OrderFormData, PriceRow } from '@/lib/excel-generator'
import { excelSheetToPdf } from '@/lib/google-drive'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const manufacturer = req.nextUrl.searchParams.get('manufacturer')

  const { data: order, error } = await supabaseServer
    .from('pipe_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
  }

  // Fetch prices + customer sale_pct in parallel
  const [{ data: prices }, { data: customers }] = await Promise.all([
    supabaseServer.from('pipe_prices').select('prod_key,unit_price,heat_type,heat_length_mm,sealant_volume'),
    supabaseServer.from('customers').select('name,sale_pct').eq('name', order.vendor),
  ])

  const priceRows   = (prices  ?? []) as PriceRow[]
  const discountPct = customers?.[0]?.sale_pct ?? null

  const formData: OrderFormData = {
    vendor:           order.vendor,
    orderClient:      order.order_client   ?? '',
    author:           order.author         ?? '',
    orderDate:        order.order_date     ?? '',
    deliveryDate:     order.delivery_date  ?? '',
    project:          order.project        ?? '',
    deliveryLocation: order.delivery_location ?? '',
    address:          order.address        ?? '',
    contactName:      order.contact_name   ?? '',
    contactPhone:     order.contact_phone  ?? '',
    notes:            order.notes          ?? '',
    deliveryDest:     order.delivery_dest  ?? '',
    orderNo:          order.order_no       ?? '',
    manufacturer:     manufacturer ?? order.manufacturer ?? '필립산업',
    items:            manufacturer
      ? (order.items ?? []).filter((it: any) => (it.manufacturer ?? order.manufacturer ?? '') === manufacturer)
      : order.items ?? [],
  }

  try {
    // Sheet 5 (발주서) only → Google Drive PDF
    const excelBuffer = await generateOrderExcel(formData, priceRows, discountPct, [5])
    const pdfBuffer   = await excelSheetToPdf(excelBuffer)

    const filename = encodeURIComponent(
      `발주서_${order.project ?? '탑디뉴스'}_${order.order_date?.slice(0, 10) ?? ''}.pdf`
    )
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    console.error('[pdf]', err)
    return NextResponse.json(
      { error: `PDF 생성 오류: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
