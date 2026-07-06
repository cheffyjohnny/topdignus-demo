import { supabaseServer } from '@/lib/supabase-server'
import { YearSelector } from './YearSelector'
import { YearlyChart, ChartMonthData } from './YearlyChart'
import { YearlyContent } from './YearlyContent'

export default async function YearlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = Number(sp.year) || kstNow.getUTCFullYear()

  const yearStart = `${year}-01-01`
  const yearEnd   = `${year + 1}-01-01`

  const [{ data: pipeData }, { data: ductData }] = await Promise.all([
    supabaseServer
      .from('pipe_orders')
      .select('order_date, vendor, sale_amount, purchase_amount, freight, no_invoice')
      .gte('order_date', yearStart)
      .lt('order_date', yearEnd),
    supabaseServer
      .from('duct_orders')
      .select('order_date, customer_name, sale_amount, purchase_amount, freight, no_invoice')
      .gte('order_date', yearStart)
      .lt('order_date', yearEnd),
  ])

  const orders = [
    ...(pipeData ?? []).map(o => ({
      month: o.order_date ? new Date(o.order_date).getMonth() + 1 : null,
      vendor: o.vendor ?? '—',
      sale: o.no_invoice ? 0 : Number(o.sale_amount ?? 0) + Number(o.freight ?? 0),
      purchase: o.no_invoice ? 0 : Number(o.purchase_amount ?? 0) + Number(o.freight ?? 0),
    })),
    ...(ductData ?? []).map(o => ({
      month: o.order_date ? new Date(o.order_date).getMonth() + 1 : null,
      vendor: o.customer_name ?? '—',
      sale: o.no_invoice ? 0 : Number(o.sale_amount ?? 0) + Number(o.freight ?? 0),
      purchase: o.no_invoice ? 0 : Number(o.purchase_amount ?? 0) + Number(o.freight ?? 0),
    })),
  ]

  const monthData: Record<number, Record<string, { sale: number; purchase: number }>> = {}
  for (let m = 1; m <= 12; m++) monthData[m] = {}

  const vendorTotals: Record<string, { sale: number; purchase: number }> = {}

  for (const o of orders) {
    const v = o.vendor
    if (!vendorTotals[v]) vendorTotals[v] = { sale: 0, purchase: 0 }
    vendorTotals[v].sale     += o.sale
    vendorTotals[v].purchase += o.purchase
    if (o.month) {
      if (!monthData[o.month][v]) monthData[o.month][v] = { sale: 0, purchase: 0 }
      monthData[o.month][v].sale     += o.sale
      monthData[o.month][v].purchase += o.purchase
    }
  }

  const vendors = Object.entries(vendorTotals)
    .sort((a, b) => b[1].sale - a[1].sale)
    .map(([v]) => v)

  const chartData: ChartMonthData[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const monthVendors = vendors
      .filter(v => (monthData[m][v]?.sale ?? 0) > 0)
      .map(v => ({ vendor: v, sale: monthData[m][v].sale }))
    const totalSale     = monthVendors.reduce((s, v) => s + v.sale, 0)
    const totalPurchase = vendors.reduce((s, v) => s + (monthData[m][v]?.purchase ?? 0), 0)
    return { month: m, vendors: monthVendors, totalSale, netProfit: totalSale - totalPurchase }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">연별 현황</h1>
        <YearSelector year={year} />
      </div>

      <YearlyContent
        year={year}
        vendors={vendors}
        vendorTotals={vendorTotals}
        monthData={monthData}
        chartData={chartData}
      />
    </div>
  )
}
