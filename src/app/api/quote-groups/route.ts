import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  const { data, error } = await supabaseServer
    .from('quote_groups')
    .select(`
      id, vendor, project, order_date, author, notes, status, status_history, created_at,
      pipe_quotes(id, manufacturer, status, items),
      duct_quotes(id, manufacturer, status, items)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabaseServer
    .from('quote_groups')
    .insert({
      vendor:     body.vendor     ?? '',
      project:    body.project    ?? null,
      order_date: body.orderDate  ?? null,
      author:     body.author     ?? null,
      notes:      body.notes      ?? null,
      status:     '검토중',
      status_history: [{ type: 'status', value: '검토중', at: new Date().toISOString() }],
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
