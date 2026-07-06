import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { Resend } from 'resend'

const CRON_SECRET = process.env.CRON_SECRET

interface PipeOrder {
  order_no: string | null
  vendor: string
  project: string | null
  order_client: string | null
  contact_name: string | null
  contact_phone: string | null
  status: string
}

interface DuctOrder {
  order_no: string | null
  manufacturer: string
  vendor: string | null
  project: string | null
  order_client: string | null
  contact_name: string | null
  contact_phone: string | null
  status: string
}

function todayKst(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusColor(status: string): string {
  const map: Record<string, string> = { '수주': '#6366f1', '발주': '#f59e0b', '납품': '#10b981', '취소': '#ef4444' }
  return map[status] ?? '#888'
}

function tableRows(orders: { no: string; vendor: string; project: string; client: string; contact: string; phone: string; status: string }[]): string {
  return orders.map((o, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">
      <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#6b7280;font-size:12px;">${o.no}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;">${o.vendor}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${o.project || '-'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;color:#6b7280;">${o.client || '-'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${o.contact || '-'}${o.phone ? ` <span style="color:#9ca3af;font-size:11px;">${o.phone}</span>` : ''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">
        <span style="background:${statusColor(o.status)};color:#fff;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;">${o.status}</span>
      </td>
    </tr>`).join('')
}

function section(title: string, color: string, bgColor: string, rows: string): string {
  return `
    <h3 style="color:${color};font-size:14px;margin:20px 0 8px;font-weight:700;">${title}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:${bgColor};">
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;font-size:12px;">번호</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;font-size:12px;">납품처</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;font-size:12px;">현장명</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;font-size:12px;">발주의뢰처</th>
          <th style="padding:8px 10px;text-align:left;color:#555;font-weight:600;font-size:12px;">담당자</th>
          <th style="padding:8px 10px;text-align:center;color:#555;font-weight:600;font-size:12px;">상태</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

async function run(): Promise<{ today: string; pipeCount: number; ductCount: number }> {
  const today = todayKst()

  const [pipeRes, ductRes] = await Promise.all([
    supabaseServer
      .from('pipe_orders')
      .select('order_no,vendor,project,order_client,contact_name,contact_phone,status')
      .eq('delivery_date', today)
      .not('status', 'in', '(납품,취소)')
      .order('order_no', { ascending: true }),
    supabaseServer
      .from('duct_orders')
      .select('order_no,manufacturer,vendor,project,order_client,contact_name,contact_phone,status')
      .eq('delivery_date', today)
      .not('status', 'in', '(납품,취소)')
      .order('order_no', { ascending: true }),
  ])

  const pipeOrders: PipeOrder[] = pipeRes.data ?? []
  const ductOrders: DuctOrder[] = ductRes.data ?? []
  const total = pipeOrders.length + ductOrders.length

  const pipeSection = pipeOrders.length > 0
    ? section(
        `배관 수주 (${pipeOrders.length}건)`,
        '#4f46e5', '#eff0ff',
        tableRows(pipeOrders.map(o => ({
          no: o.order_no || '-',
          vendor: o.vendor,
          project: o.project || '',
          client: o.order_client || '',
          contact: o.contact_name || '',
          phone: o.contact_phone || '',
          status: o.status,
        })))
      )
    : ''

  const ductSection = ductOrders.length > 0
    ? section(
        `덕트 수주 (${ductOrders.length}건)`,
        '#7c3aed', '#f5f0ff',
        tableRows(ductOrders.map(o => ({
          no: o.order_no || '-',
          vendor: o.vendor || o.manufacturer,
          project: o.project || '',
          client: o.order_client || '',
          contact: o.contact_name || '',
          phone: o.contact_phone || '',
          status: o.status,
        })))
      )
    : ''

  const body = pipeSection + ductSection

  const html = `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;">
    <div style="background:#014A99;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="color:#fff;margin:0;font-size:18px;">납품 일정 알림</h2>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;">${today} 납품 예정 — 총 ${total}건</p>
    </div>
    <div style="padding:20px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      ${body}
      <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
        <a href="https://topdignus.co.kr/dashboard/orders" style="color:#014A99;">배관 수주현황</a>
        &nbsp;·&nbsp;
        <a href="https://topdignus.co.kr/dashboard/duct-orders" style="color:#014A99;">덕트 수주현황</a>
      </p>
    </div>
  </div>`

  if (total > 0) {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: '탑디뉴스 <no-reply@topdignus.co.kr>',
      to: 'topdi@topdignus.co.kr',
      subject: `[탑디뉴스] ${today} 납품 일정 — ${total}건`,
      html,
    })
  }

  return { today, pipeCount: pipeOrders.length, ductCount: ductOrders.length }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await run()
  return NextResponse.json({ ok: true, ...result })
}
