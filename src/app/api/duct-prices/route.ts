import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const manufacturer = req.nextUrl.searchParams.get('manufacturer')
  if (!manufacturer) return NextResponse.json({ error: 'manufacturer 필요' }, { status: 400 })
  const { error } = await supabaseServer.from('duct_prices').delete().eq('manufacturer', manufacturer)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { data, error } = await supabaseServer
    .from('duct_prices')
    .select('manufacturer, price_type, riser_price, wall_price, insul_50t_price, insul_25t_price, sort_order')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('manufacturer', { ascending: true })
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
    price_type: r.price_type,
    riser_price: r.riser_price ?? 0,
    wall_price: r.wall_price ?? 0,
    insul_50t_price: r.insul_50t_price ?? 0,
    insul_25t_price: r.insul_25t_price ?? 0,
    sort_order: r.sort_order ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabaseServer
    .from('duct_prices')
    .upsert(rows, { onConflict: 'manufacturer' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
