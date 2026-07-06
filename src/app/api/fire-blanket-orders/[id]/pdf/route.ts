import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateFireBlanketExcel, buildFireBlanketExcelFilename } from '@/lib/fire-blanket-excel-generator'
import type { FireBlanketOrderFormData } from '@/lib/fire-blanket-excel-generator'
import { excelSheetToPdf } from '@/lib/google-drive'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: order, error } = await supabaseServer
    .from('fire_blanket_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: '수주서를 찾을 수 없습니다.' }, { status: 404 })
  }

  const formData: FireBlanketOrderFormData = {
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

  try {
    // Sheet 5 (발주서) only → Google Drive PDF
    const excelBuffer = await generateFireBlanketExcel(formData, [5])
    const pdfBuffer   = await excelSheetToPdf(excelBuffer)

    const filename = encodeURIComponent(
      `발주서_${order.project ?? '방화포'}_${order.order_date?.slice(0, 10) ?? ''}.pdf`
    )
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    console.error('[fire-blanket-pdf]', err)
    return NextResponse.json(
      { error: `PDF 생성 오류: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
