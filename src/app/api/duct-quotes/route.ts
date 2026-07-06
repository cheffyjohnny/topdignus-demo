import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { saveQuotation } from '@/lib/ecount'

export async function GET(req: NextRequest) {
  const manufacturer = req.nextUrl.searchParams.get('manufacturer') ?? ''
  const standalone   = req.nextUrl.searchParams.get('standalone') === 'true'
  let query = supabaseServer
    .from('duct_quotes')
    .select('id, manufacturer, customer_name, project, contact_name, order_date, delivery_date, author, status, created_at, converted_duct_order_id, group_id')
    .order('created_at', { ascending: false })

  if (manufacturer) query = query.eq('manufacturer', manufacturer)
  if (standalone)   query = (query as any).is('group_id', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = kstNow.getUTCFullYear(); const month = kstNow.getUTCMonth() + 1
  const kstOff = 9 * 60 * 60 * 1000
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - kstOff).toISOString()
  const monthEnd   = new Date(Date.UTC(year, month, 1)     - kstOff).toISOString()
  const [{ count: pCount }, { count: dCount }] = await Promise.all([
    supabaseServer.from('pipe_quotes').select('id', { count: 'exact', head: true }).gte('created_at', monthStart).lt('created_at', monthEnd),
    supabaseServer.from('duct_quotes').select('id', { count: 'exact', head: true }).gte('created_at', monthStart).lt('created_at', monthEnd),
  ])
  const quoteNo = `Q${month}-${(pCount ?? 0) + (dCount ?? 0) + 1}`

  const { data: saved, error } = await supabaseServer
    .from('duct_quotes')
    .insert({
      quote_no: quoteNo,
      manufacturer: body.manufacturer,
      customer_name: body.customerName ?? null,
      project: body.project ?? null,
      delivery_location: body.deliveryLocation ?? null,
      address: body.address ?? null,
      delivery_dest: body.deliveryDest ?? null,
      contact_name: body.contactName ?? null,
      contact_phone: body.contactPhone ?? null,
      order_date: body.orderDate || null,
      delivery_date: body.agreeDate || body.deliveryDate || null,
      author: body.author ?? null,
      notes: body.notes ?? null,
      items: body.items ?? [],
      status: '검토중',
      status_history: [{ type: 'status', value: '검토중', at: new Date().toISOString() }],
      image_url: body.imageUrl ?? null,
      file_urls: body.fileUrls ?? [],
      group_id: body.groupId ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const savedId = (saved as { id: string }).id

  const ecountItems = (body.items ?? []).map((it: any) => {
    const isManual = it.type === '수기 금액 추가'
    const isInsul = it.type === '차열재'
    const prodCd = isManual ? 'Z02' : isInsul ? 'B01' : 'SD01'
    const name = it.type === '입상' ? '입상_사각덕트'
      : it.type === '벽체' ? '벽체_사각덕트'
      : it.type === '차열재' ? '차열재'
      : isManual ? '수기 금액 추가'
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

  const ecountResult = await saveQuotation({
    id: savedId,
    quote_no: quoteNo,
    vendor: body.customerName ?? '',
    manufacturer: body.manufacturer,
    project: body.project ?? null,
    address: body.address ?? null,
    contact_name: body.contactName ?? null,
    contact_phone: body.contactPhone ?? null,
    order_date: body.orderDate ?? null,
    agree_date: body.agreeDate ?? null,
    author: body.author ?? null,
    notes: body.notes ?? null,
    items: ecountItems,
  })

  return NextResponse.json({ id: savedId, ecount: ecountResult.result, ecountError: ecountResult.error }, { status: 201 })
}
