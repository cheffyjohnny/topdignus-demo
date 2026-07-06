import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateProfireDuctExcel, buildDuctExcelFilename } from '@/lib/duct-excel-generator'
import type { DuctOrderFormData } from '@/lib/duct-excel-generator'
import { generateKingsasiaDuctExcel, buildKingsasiaDuctExcelFilename } from '@/lib/kingsasia-duct-excel-generator'

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
    let buffer: Buffer
    let filename: string

    if (isKingsasia) {
      const { data: dp } = await supabaseServer
        .from('duct_prices').select('riser_price,wall_price').eq('manufacturer', formData.manufacturer).single()
      buffer   = await generateKingsasiaDuctExcel({ ...formData, riserPurchasePrice: dp?.riser_price ?? 0, wallPurchasePrice: dp?.wall_price ?? 0 })
      filename = buildKingsasiaDuctExcelFilename(formData)
    } else {
      // Fetch sale prices for 적용단가 계산식 sheet (2-2)
      const mfr = formData.manufacturer
      const [{ data: dp }, { data: cust }] = await Promise.all([
        supabaseServer.from('duct_prices').select('riser_price,wall_price,insul_50t_price,insul_25t_price').eq('manufacturer', mfr).maybeSingle(),
        supabaseServer.from('customers').select('id').eq('name', order.customer_name ?? '').maybeSingle(),
      ])
      let riserSalePrice = 0
      let wallSalePrice = 0
      if (cust?.id) {
        const { data: sp } = await supabaseServer
          .from('duct_sale_prices')
          .select('riser_sale_price,wall_sale_price')
          .eq('manufacturer', mfr)
          .eq('customer_id', cust.id)
          .maybeSingle()
        riserSalePrice = sp?.riser_sale_price ?? 0
        wallSalePrice  = sp?.wall_sale_price  ?? 0
      }
      buffer   = await generateProfireDuctExcel({
        ...formData,
        riserSalePrice: riserSalePrice || undefined,
        wallSalePrice:  wallSalePrice  || undefined,
        insul50Price:   dp?.insul_50t_price ?? undefined,
        insul25Price:   dp?.insul_25t_price ?? undefined,
      })
      filename = buildDuctExcelFilename(formData)
    }
    const encoded  = encodeURIComponent(filename)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      },
    })
  } catch (err) {
    console.error('[duct-excel]', err)
    return NextResponse.json(
      { error: `Excel 생성 오류: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
