import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('fire_blanket_sale_prices')
    .select('id, manufacturer, item_name, customer_id, roll_sale_price')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  if (!Array.isArray(body)) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const rows = body.map((r: any) => ({
    manufacturer:   r.manufacturer,
    item_name:      r.item_name ?? '',
    customer_id:    r.customer_id,
    roll_sale_price: r.roll_sale_price ?? 0,
    updated_at:     new Date().toISOString(),
  }))

  const { error } = await supabaseServer
    .from('fire_blanket_sale_prices')
    .upsert(rows, { onConflict: 'manufacturer,item_name,customer_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
