import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseServer
    .from('fire_blanket_quotes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Fetch current record to update status_history
  const { data: current } = await supabaseServer
    .from('fire_blanket_quotes')
    .select('status, status_history')
    .eq('id', id)
    .single()

  const patch: Record<string, any> = {}

  if (body.status !== undefined) {
    patch.status = body.status
    if (current && body.status !== current.status) {
      const history = Array.isArray(current.status_history) ? current.status_history : []
      patch.status_history = [...history, { status: body.status, changed_at: new Date().toISOString() }]
    }
  }

  const fields = [
    'customer_name', 'manufacturer', 'project', 'delivery_location', 'address',
    'delivery_dest', 'contact_name', 'contact_phone', 'order_date', 'delivery_date',
    'author', 'notes', 'items', 'image_url', 'file_urls',
  ] as const

  for (const f of fields) {
    if (body[f] !== undefined) patch[f] = body[f]
  }

  if (body.items !== undefined) {
    patch.sale_amount = (body.items as any[]).reduce(
      (sum, it) => sum + Math.round((it.unit_price || 0) * (it.quantity || 0)), 0
    )
  }

  const { data, error } = await supabaseServer
    .from('fire_blanket_quotes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabaseServer
    .from('fire_blanket_quotes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
