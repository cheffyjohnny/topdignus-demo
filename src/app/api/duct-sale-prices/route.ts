import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('duct_sale_prices')
    .select('id, manufacturer, customer_id, riser_sale_price, wall_sale_price, insul_50t_sale_price, insul_25t_sale_price')
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
    manufacturer: r.manufacturer,
    customer_id: r.customer_id,
    riser_sale_price: r.riser_sale_price ?? 0,
    wall_sale_price: r.wall_sale_price ?? 0,
    insul_50t_sale_price: r.insul_50t_sale_price ?? 0,
    insul_25t_sale_price: r.insul_25t_sale_price ?? 0,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabaseServer
    .from('duct_sale_prices')
    .upsert(rows, { onConflict: 'manufacturer,customer_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
