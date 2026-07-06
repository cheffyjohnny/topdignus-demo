import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('pipe_prices')
    .select('prod_key, manufacturer, internal_name, pipe_spec, sleeve_spec, unit_price, heat_type, heat_length_mm, sealant_volume, note')
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

  const ALLOWED_COLS = ['prod_key', 'manufacturer', 'internal_name', 'pipe_spec', 'sleeve_spec', 'unit_price',
    'heat_type', 'heat_length_mm', 'sealant_volume', 'note']

  const rows = body.map((r: any) => {
    const clean: any = { updated_at: new Date().toISOString() }
    for (const col of ALLOWED_COLS) {
      if (col in r) clean[col] = r[col]
    }
    if (!clean.manufacturer) clean.manufacturer = '필립산업'
    return clean
  })

  const { error } = await supabaseServer
    .from('pipe_prices')
    .upsert(rows, { onConflict: 'manufacturer,prod_key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prodKey = req.nextUrl.searchParams.get('prod_key')
  const manufacturer = req.nextUrl.searchParams.get('manufacturer')
  if (!prodKey || !manufacturer) {
    return NextResponse.json({ error: 'prod_key, manufacturer 필요' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('pipe_prices')
    .delete()
    .eq('prod_key', prodKey)
    .eq('manufacturer', manufacturer)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
