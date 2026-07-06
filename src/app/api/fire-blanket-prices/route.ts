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
  const item_name    = req.nextUrl.searchParams.get('item_name')
  if (!manufacturer) return NextResponse.json({ error: 'manufacturer 필요' }, { status: 400 })

  let query = supabaseServer.from('fire_blanket_prices').delete().eq('manufacturer', manufacturer)
  if (item_name !== null) query = query.eq('item_name', item_name)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { data, error } = await supabaseServer
    .from('fire_blanket_prices')
    .select('manufacturer, item_name, spec, roll_price, sort_order')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('manufacturer', { ascending: true })
    .order('item_name',    { ascending: true })
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

  const now = new Date().toISOString()

  // item_name이 변경된 경우 → UPDATE (ON UPDATE CASCADE로 sale_prices도 자동 갱신)
  const renames = body.filter((r: any) => r.originalItemName !== undefined && r.originalItemName !== r.item_name)
  for (const r of renames) {
    const { error } = await supabaseServer
      .from('fire_blanket_prices')
      .update({ item_name: r.item_name, spec: r.spec ?? '', roll_price: r.roll_price ?? 0, sort_order: r.sort_order ?? null, updated_at: now })
      .eq('manufacturer', r.manufacturer)
      .eq('item_name', r.originalItemName)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 나머지 → 일반 upsert
  const upserts = body.filter((r: any) => r.originalItemName === undefined || r.originalItemName === r.item_name)
  if (upserts.length > 0) {
    const rows = upserts.map((r: any) => ({
      manufacturer: r.manufacturer,
      item_name:    r.item_name ?? '',
      spec:         r.spec ?? '',
      roll_price:   r.roll_price ?? 0,
      sort_order:   r.sort_order ?? null,
      updated_at:   now,
    }))
    const { error } = await supabaseServer
      .from('fire_blanket_prices')
      .upsert(rows, { onConflict: 'manufacturer,item_name' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
