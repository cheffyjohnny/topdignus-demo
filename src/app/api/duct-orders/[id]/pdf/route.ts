import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateProfireDuctExcel } from '@/lib/duct-excel-generator'
import type { DuctOrderFormData } from '@/lib/duct-excel-generator'
import { generateKingsasiaDuctExcel } from '@/lib/kingsasia-duct-excel-generator'
import { excelSheetToPdf } from '@/lib/google-drive'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: order, error } = await supabaseServer
    .from('duct_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: '수주서을 찾을 수 없습니다.' }, { status: 404 })
  }

  const formData: DuctOrderFormData = {
    orderNo:          order.order_no          ?? null,
    manufacturer:     order.manufacturer      ?? '프로화이어',
    customerName:     order.customer_name     ?? null,
    project:          order.project           ?? null,
    deliveryLocation: order.delivery_location ?? null,
    address:          order.address           ?? null,
    deliveryDest:     order.delivery_dest     ?? null,
    contactName:      order.contact_name      ?? null,
    contactPhone:     order.contact_phone     ?? null,
    orderDate:        order.order_date        ?? null,
    deliveryDate:     order.delivery_date     ?? null,
    author:           order.author            ?? null,
    notes:            order.notes             ?? null,
    items:            order.items             ?? [],
  }

  const isKingsasia = formData.manufacturer.includes('킹스아시아')

  try {
    let excelBuffer: Buffer
    if (isKingsasia) {
      const { data: dp } = await supabaseServer
        .from('duct_prices').select('riser_price,wall_price').eq('manufacturer', formData.manufacturer).single()
      excelBuffer = await generateKingsasiaDuctExcel({ ...formData, riserPurchasePrice: dp?.riser_price ?? 0, wallPurchasePrice: dp?.wall_price ?? 0 }, [5])
    } else {
      excelBuffer = await generateProfireDuctExcel(formData, [5])  // Sheet 5 only for PDF
    }
    const pdfBuffer   = await excelSheetToPdf(excelBuffer)

    const filename = encodeURIComponent(
      `발주서_${order.project ?? '덕트'}_${order.order_date?.slice(0, 10) ?? ''}.pdf`
    )
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    console.error('[duct-pdf]', err)
    return NextResponse.json(
      { error: `PDF 생성 오류: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
