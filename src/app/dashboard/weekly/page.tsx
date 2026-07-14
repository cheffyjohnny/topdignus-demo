import { supabaseServer } from '@/lib/supabase-server'
import { WeekSelector } from './WeekSelector'
import { WeeklyTables, WeekOrderItem } from './WeeklyTables'

function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const PIPE_SEL = 'id, order_no, vendor, manufacturer, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice'
const DUCT_SEL = 'id, order_no, customer_name, manufacturer, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice'

function toItem(o: any, isDuct: boolean): WeekOrderItem {
  const ni = Boolean(o.no_invoice)
  return {
    id: o.id, order_no: o.order_no,
    isDuct,
    vendor: (isDuct ? o.customer_name : o.vendor) ?? '',
    manufacturer: o.manufacturer ?? (isDuct ? '' : '필립산업'),
    project: o.project,
    order_date: o.order_date,
    delivery_date: o.delivery_date,
    status: o.status,
    no_invoice: ni,
    sale_amount: ni ? 0 : Number(o.sale_amount ?? 0),
    purchase_amount: ni ? 0 : Number(o.purchase_amount ?? 0),
    freight: ni ? 0 : Number(o.freight ?? 0),
  }
}

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  // from이 없으면 이번 주 월요일
  const from = sp.from ?? getMondayOf(kstNow)
  const to   = sp.to   ?? addDays(from, 6)
  const toExclusive = addDays(to, 1) // DB 필터용 (< 기준)

  const [
    { data: pipeByOrder },
    { data: ductByOrder },
    { data: pipeByDelivery },
    { data: ductByDelivery },
  ] = await Promise.all([
    supabaseServer.from('pipe_orders').select(PIPE_SEL)
      .gte('order_date', from).lt('order_date', toExclusive)
      .order('order_date', { ascending: false }),
    supabaseServer.from('duct_orders').select(DUCT_SEL)
      .gte('order_date', from).lt('order_date', toExclusive)
      .order('order_date', { ascending: false }),
    supabaseServer.from('pipe_orders').select(PIPE_SEL)
      .gte('delivery_date', from).lt('delivery_date', toExclusive)
      .order('delivery_date', { ascending: false }),
    supabaseServer.from('duct_orders').select(DUCT_SEL)
      .gte('delivery_date', from).lt('delivery_date', toExclusive)
      .order('delivery_date', { ascending: false }),
  ])

  const orderDateOrders: WeekOrderItem[] = [
    ...(pipeByOrder    ?? []).map(o => toItem(o, false)),
    ...(ductByOrder    ?? []).map(o => toItem(o, true)),
  ]
  const deliveryDateOrders: WeekOrderItem[] = [
    ...(pipeByDelivery ?? []).map(o => toItem(o, false)),
    ...(ductByDelivery ?? []).map(o => toItem(o, true)),
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">Weekly Report</h1>
        <WeekSelector from={from} to={to} />
      </div>

      <WeeklyTables
        orderDateOrders={orderDateOrders}
        deliveryDateOrders={deliveryDateOrders}
        from={from}
        to={to}
      />
    </div>
  )
}
