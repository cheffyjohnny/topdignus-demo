import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('fire_blanket_quotes')
    .select('id, quote_no, manufacturer, customer_name, project, order_date, delivery_date, author, status, sale_amount, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const saleAmount = (body.items ?? []).reduce(
    (sum: number, it: any) => sum + Math.round((it.unit_price || 0) * (it.quantity || 0)),
    0
  )

  const { data, error } = await supabaseServer
    .from('fire_blanket_quotes')
    .insert({
      manufacturer:      body.manufacturer ?? null,
      customer_name:     body.customerName ?? null,
      project:           body.project ?? null,
      delivery_location: body.deliveryLocation ?? null,
      address:           body.address ?? null,
      delivery_dest:     body.deliveryDest ?? null,
      contact_name:      body.contactName ?? null,
      contact_phone:     body.contactPhone ?? null,
      order_date:        body.orderDate ?? null,
      delivery_date:     body.deliveryDate ?? null,
      author:            body.author ?? null,
      notes:             body.notes ?? null,
      image_url:         body.imageUrl ?? null,
      file_urls:         body.fileUrls ?? [],
      items:             body.items ?? [],
      status:            '검토중',
      status_history:    [{ status: '검토중', changed_at: new Date().toISOString() }],
      sale_amount:       saleAmount,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
