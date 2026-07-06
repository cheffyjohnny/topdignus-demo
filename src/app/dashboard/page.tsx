import { supabaseServer } from '@/lib/supabase-server'
import { UpcomingDeliveriesSection } from './UpcomingDeliveriesSection'
import { MonthlyStatsSection } from './MonthlyStatsSection'
import { MonthlySalesTrend, type MonthStat } from './MonthlySalesTrend'

const PIPE_SEL = 'id, order_no, vendor, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice'
const DUCT_SEL = 'id, order_no, customer_name, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice'

export default async function DashboardHome() {
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = kstNow.getUTCFullYear()
  const month = kstNow.getUTCMonth() + 1
  const todayKST = kstNow.toISOString().slice(0, 10)
  const past3KST = new Date(kstNow.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const future30KST = new Date(kstNow.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStart = `${year}-${pad(month)}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthEnd = `${nextYear}-${pad(nextMonth)}-01`

  // 최근 6개월 시작 (납품일 기준)
  const trendM = month - 5
  const trendStartDate = trendM > 0
    ? `${year}-${pad(trendM)}-01`
    : `${year - 1}-${pad(trendM + 12)}-01`

  const [
    { data: pipeByOrder },
    { data: ductByOrder },
    { data: pipeByDelivery },
    { data: ductByDelivery },
    { data: pipeUpcoming },
    { data: ductUpcoming },
    { data: pipeTrend },
    { data: ductTrend },
  ] = await Promise.all([
    // 수주일 기준
    supabaseServer.from('pipe_orders').select(PIPE_SEL)
      .gte('order_date', monthStart).lt('order_date', monthEnd)
      .order('order_date', { ascending: false }),
    supabaseServer.from('duct_orders').select(DUCT_SEL)
      .gte('order_date', monthStart).lt('order_date', monthEnd)
      .order('order_date', { ascending: false }),
    // 납품일 기준
    supabaseServer.from('pipe_orders').select(PIPE_SEL)
      .gte('delivery_date', monthStart).lt('delivery_date', monthEnd)
      .order('delivery_date', { ascending: false }),
    supabaseServer.from('duct_orders').select(DUCT_SEL)
      .gte('delivery_date', monthStart).lt('delivery_date', monthEnd)
      .order('delivery_date', { ascending: false }),
    // 다가오는 납품일정
    supabaseServer.from('pipe_orders')
      .select('id, order_no, vendor, project, manufacturer, delivery_date, status')
      .in('status', ['수주', '발주'])
      .not('delivery_date', 'is', null)
      .gte('delivery_date', past3KST)
      .lte('delivery_date', future30KST)
      .order('delivery_date', { ascending: true })
      .limit(15),
    supabaseServer.from('duct_orders')
      .select('id, order_no, customer_name, project, manufacturer, delivery_date, status')
      .in('status', ['수주', '발주'])
      .not('delivery_date', 'is', null)
      .gte('delivery_date', past3KST)
      .lte('delivery_date', future30KST)
      .order('delivery_date', { ascending: true })
      .limit(15),
    // 6개월 추이 (납품일 기준, 납품 상태만)
    supabaseServer.from('pipe_orders')
      .select('delivery_date, sale_amount, purchase_amount, freight, no_invoice')
      .eq('status', '납품')
      .gte('delivery_date', trendStartDate)
      .lt('delivery_date', monthEnd),
    supabaseServer.from('duct_orders')
      .select('delivery_date, sale_amount, purchase_amount, freight, no_invoice')
      .eq('status', '납품')
      .gte('delivery_date', trendStartDate)
      .lt('delivery_date', monthEnd),
  ])

  function toOrderItem(o: any, isDuct: boolean) {
    const ni = Boolean(o.no_invoice)
    return {
      id: o.id, order_no: o.order_no,
      vendor: (isDuct ? o.customer_name : o.vendor) ?? '',
      project: o.project,
      order_date: o.order_date,
      delivery_date: o.delivery_date,
      status: o.status,
      isDuct,
      no_invoice: ni,
      sale_amount: ni ? 0 : Number(o.sale_amount ?? 0),
      purchase_amount: ni ? 0 : Number(o.purchase_amount ?? 0),
      freight: ni ? 0 : Number(o.freight ?? 0),
    }
  }

  const orderDateOrders = [
    ...(pipeByOrder ?? []).map(o => toOrderItem(o, false)),
    ...(ductByOrder ?? []).map(o => toOrderItem(o, true)),
  ]
  const deliveryDateOrders = [
    ...(pipeByDelivery ?? []).map(o => toOrderItem(o, false)),
    ...(ductByDelivery ?? []).map(o => toOrderItem(o, true)),
  ]

  function calcStats(orders: ReturnType<typeof toOrderItem>[]) {
    const stats = { 수주: 0, 발주: 0, 납품: 0, 취소: 0 }
    let pipeCount = 0, ductCount = 0, totalSale = 0, totalPurchase = 0
    for (const o of orders) {
      const s = o.status as keyof typeof stats
      if (s in stats) stats[s]++
      if (o.isDuct) ductCount++; else pipeCount++
      totalSale += o.sale_amount + o.freight
      totalPurchase += o.purchase_amount + o.freight
    }
    return { stats, pipeCount, ductCount, totalSale, totalPurchase }
  }

  const orderDateCalc   = calcStats(orderDateOrders)
  const deliveryDateCalc = calcStats(deliveryDateOrders)

  // 6개월 추이
  const trendMap = new Map<string, MonthStat>()
  for (let i = 5; i >= 0; i--) {
    const y = month - i <= 0 ? year - 1 : year
    const m = ((month - i - 1 + 12) % 12) + 1
    trendMap.set(`${y}-${m}`, { year: y, month: m, sale: 0, purchase: 0 })
  }
  for (const o of [...(pipeTrend ?? []), ...(ductTrend ?? [])]) {
    if (!o.delivery_date || o.no_invoice) continue
    const [y, m] = (o.delivery_date as string).split('-').map(Number)
    const cur = trendMap.get(`${y}-${m}`)
    if (cur) {
      cur.sale += Number(o.sale_amount ?? 0) + Number(o.freight ?? 0)
      cur.purchase += Number(o.purchase_amount ?? 0) + Number(o.freight ?? 0)
    }
  }
  const trendData = Array.from(trendMap.values())

  const upcoming = [
    ...(pipeUpcoming ?? []).map(o => ({ ...o, vendor: o.vendor, isDuct: false })),
    ...(ductUpcoming ?? []).map(o => ({ ...o, vendor: o.customer_name, isDuct: true })),
  ].sort((a, b) => (a.delivery_date ?? '').localeCompare(b.delivery_date ?? ''))
    .slice(0, 15)
    .map(o => ({ ...o, dDay: dDay(o.delivery_date!) }))

  function dDay(date: string): { label: string; cls: string } {
    const diff = Math.round((new Date(date).getTime() - new Date(todayKST).getTime()) / 86400000)
    if (diff === 0) return { label: 'D-0', cls: 'bg-red-100 text-red-700 font-bold' }
    if (diff > 0) return {
      label: `D-${diff}`,
      cls: diff <= 3 ? 'bg-orange-100 text-orange-700 font-semibold' : 'bg-gray-100 text-gray-500',
    }
    return { label: `D+${Math.abs(diff)}`, cls: 'bg-red-100 text-red-700 font-bold' }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <MonthlyStatsSection
        year={year}
        month={month}
        orderDateOrders={orderDateOrders}
        deliveryDateOrders={deliveryDateOrders}
        orderDateCalc={orderDateCalc}
        deliveryDateCalc={deliveryDateCalc}
      />
      <UpcomingDeliveriesSection items={upcoming} />
    </div>
  )
}
