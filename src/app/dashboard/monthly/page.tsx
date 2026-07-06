import { supabaseServer } from '@/lib/supabase-server'
import { MonthlyStatsSection } from '../MonthlyStatsSection'
import { MonthSelector } from './MonthSelector'
import { MonthlyTables, MonthOrderItem } from './MonthlyTables'

const SELECT = 'id, order_no, vendor, manufacturer, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice'
const SELECT_DUCT = 'id, order_no, customer_name, manufacturer, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice'

function toItem(o: any, isDuct: boolean): MonthOrderItem {
  const ni = Boolean(o.no_invoice)
  return {
    id: o.id, order_no: o.order_no,
    isDuct: isDuct as any,
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

type StatKey = '수주' | '발주' | '납품' | '취소'

function calcStats(orders: MonthOrderItem[]) {
  const stats: Record<StatKey, number> = { 수주: 0, 발주: 0, 납품: 0, 취소: 0 }
  let pipeCount = 0, ductCount = 0, totalSale = 0, totalPurchase = 0
  for (const o of orders) {
    const s = o.status as StatKey
    if (s in stats) stats[s]++
    if (o.isDuct) ductCount++; else pipeCount++
    totalSale     += o.sale_amount     + o.freight
    totalPurchase += o.purchase_amount + o.freight
  }
  return { stats, pipeCount, ductCount, totalSale, totalPurchase }
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  const year  = Number(sp.year)  || kstNow.getUTCFullYear()
  const month = Number(sp.month) || (kstNow.getUTCMonth() + 1)

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextYear   = month === 12 ? year + 1 : year
  const nextMonth  = month === 12 ? 1 : month + 1
  const monthEnd   = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const [
    { data: pipeByOrder },
    { data: ductByOrder },
    { data: pipeByDelivery },
    { data: ductByDelivery },
  ] = await Promise.all([
    supabaseServer.from('pipe_orders').select(SELECT)
      .gte('order_date', monthStart).lt('order_date', monthEnd)
      .order('order_date', { ascending: false }),
    supabaseServer.from('duct_orders').select(SELECT_DUCT)
      .gte('order_date', monthStart).lt('order_date', monthEnd)
      .order('order_date', { ascending: false }),
    supabaseServer.from('pipe_orders').select(SELECT)
      .gte('delivery_date', monthStart).lt('delivery_date', monthEnd)
      .order('delivery_date', { ascending: false }),
    supabaseServer.from('duct_orders').select(SELECT_DUCT)
      .gte('delivery_date', monthStart).lt('delivery_date', monthEnd)
      .order('delivery_date', { ascending: false }),
  ])

  const orderDateOrders:   MonthOrderItem[] = [
    ...(pipeByOrder    ?? []).map(o => toItem(o, false)),
    ...(ductByOrder    ?? []).map(o => toItem(o, true)),
  ]
  const deliveryDateOrders: MonthOrderItem[] = [
    ...(pipeByDelivery ?? []).map(o => toItem(o, false)),
    ...(ductByDelivery ?? []).map(o => toItem(o, true)),
  ]

  const orderDateCalc    = calcStats(orderDateOrders)
  const deliveryDateCalc = calcStats(deliveryDateOrders)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">월별 현황</h1>
        <MonthSelector year={year} month={month} />
      </div>

      <MonthlyStatsSection
        year={year}
        month={month}
        orderDateOrders={orderDateOrders}
        deliveryDateOrders={deliveryDateOrders}
        orderDateCalc={orderDateCalc}
        deliveryDateCalc={deliveryDateCalc}
      />

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          주문 목록
        </h2>
        <MonthlyTables
          orderDateOrders={orderDateOrders}
          deliveryDateOrders={deliveryDateOrders}
          year={year}
          month={month}
        />
      </div>
    </div>
  )
}
