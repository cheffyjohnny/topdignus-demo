import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { oldName, newName } = await req.json()
  if (!oldName || !newName?.trim() || oldName === newName.trim()) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }
  const trimmed = newName.trim()

  const { data: existing } = await supabaseServer
    .from('duct_prices').select('manufacturer').eq('manufacturer', trimmed).single()
  if (existing) {
    return NextResponse.json({ error: '이미 존재하는 제조사명입니다.' }, { status: 409 })
  }

  const { error: e1 } = await supabaseServer
    .from('duct_prices').update({ manufacturer: trimmed }).eq('manufacturer', oldName)
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const { error: e2 } = await supabaseServer
    .from('duct_sale_prices').update({ manufacturer: trimmed }).eq('manufacturer', oldName)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
