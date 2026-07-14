'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { statusLabel, ORDER_STATUS_LABEL, DATE_MODE_LABEL } from '@/lib/status-labels'

type Tab = 'orders' | 'purchases'
const TAB_LABEL: Record<Tab, string> = { orders: 'Orders', purchases: 'Purchases' }
type DateMode = '수주일' | '납품일'
const ALL = 'All'

const STATUS_COLORS: Record<string, string> = {
  수주: 'bg-blue-50 text-blue-700',
  발주: 'bg-amber-50 text-amber-700',
  납품: 'bg-green-50 text-green-700',
  취소: 'bg-gray-50 text-gray-500',
}

function fmtWon(v: number) {
  if (v === 0) return '—'
  return '₩' + v.toLocaleString('en-US')
}

export interface MonthOrderItem {
  id: string
  order_no?: string | null
  isDuct: boolean
  vendor: string
  manufacturer: string
  project: string | null
  order_date: string | null
  delivery_date: string | null
  status: string
  no_invoice: boolean
  sale_amount: number
  purchase_amount: number
  freight: number
}

interface Props {
  orderDateOrders: MonthOrderItem[]
  deliveryDateOrders: MonthOrderItem[]
  year: number
  month: number
}

function TypeBadge({ isDuct }: { isDuct: boolean }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${isDuct ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
      {isDuct ? 'Duct' : 'Pipe'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[status] ?? 'bg-gray-50 text-gray-500'}`}>
      {statusLabel(status, ORDER_STATUS_LABEL)}
    </span>
  )
}

export function MonthlyTables({ orderDateOrders, deliveryDateOrders, year, month }: Props) {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('orders')
  const [dateMode, setDateMode] = useState<DateMode>('수주일')
  const [salesVendor, setSalesVendor] = useState(ALL)
  const [purchaseMfr, setPurchaseMfr] = useState(ALL)

  const orders = dateMode === '수주일' ? orderDateOrders : deliveryDateOrders

  const salesVendors = [ALL, ...Array.from(new Set(orders.map(o => o.vendor).filter(Boolean))).sort()]
  const purchaseMfrs = [ALL, ...Array.from(new Set(orders.map(o => o.manufacturer).filter(Boolean))).sort()]

  const filteredSales    = salesVendor === ALL ? orders : orders.filter(o => o.vendor === salesVendor)
  const filteredPurchase = purchaseMfr  === ALL ? orders : orders.filter(o => o.manufacturer === purchaseMfr)

  const saleTotalSupply = filteredSales.reduce((s, o) => s + o.sale_amount + o.freight, 0)
  const saleTotalVat    = Math.round(saleTotalSupply * 1.1)
  const saleInPurchVat  = Math.round(filteredSales.reduce((s, o) => s + o.purchase_amount + o.freight, 0) * 1.1)

  const purchTotalSupply = filteredPurchase.reduce((s, o) => s + o.purchase_amount + o.freight, 0)
  const purchTotalVat    = Math.round(purchTotalSupply * 1.1)

  const activeCount = tab === 'orders' ? filteredSales.length : filteredPurchase.length

  return (
    <div>
      {/* Date basis toggle */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-400">By:</span>
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {(['수주일', '납품일'] as DateMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setDateMode(m); setSalesVendor(ALL); setPurchaseMfr(ALL) }}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                dateMode === m ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {DATE_MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-300">|</span>
        <span className="text-xs text-gray-400">
          {orders.length} by {DATE_MODE_LABEL[dateMode]}
        </span>
      </div>

      {/* Orders/Purchases tab + filter + Excel */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
            {(['orders', 'purchases'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{activeCount}</span>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'orders' ? (
            <select
              value={salesVendor}
              onChange={e => setSalesVendor(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              {salesVendors.map(v => <option key={v} value={v}>{v === ALL ? 'All Vendors' : v}</option>)}
            </select>
          ) : (
            <select
              value={purchaseMfr}
              onChange={e => setPurchaseMfr(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              {purchaseMfrs.map(v => <option key={v} value={v}>{v === ALL ? 'All Manufacturers' : v}</option>)}
            </select>
          )}

          <a
            href={`/api/orders/monthly-export?year=${year}&month=${month}`}
            className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Excel
          </a>
        </div>
      </div>

      {/* ── Orders table ── */}
      {tab === 'orders' && (
        orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
            No orders this month.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium w-16">No.</th>
                    <th className="px-4 py-2.5 text-left font-medium w-14">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium">Vendor</th>
                    <th className="px-4 py-2.5 text-left font-medium">Project</th>
                    <th className="px-4 py-2.5 text-left font-medium w-24">Order Date</th>
                    <th className="px-4 py-2.5 text-left font-medium w-24">Delivery Date</th>
                    <th className="px-4 py-2.5 text-center font-medium w-16">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">Supply Amt</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">Revenue (VAT)</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">Cost (VAT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSales.map(o => {
                    const supply  = o.sale_amount + o.freight
                    const saleVat = Math.round(supply * 1.1)
                    const buyVat  = Math.round((o.purchase_amount + o.freight) * 1.1)
                    const highlight = dateMode === '수주일' ? o.order_date?.slice(0, 10) : o.delivery_date?.slice(0, 10)
                    return (
                      <tr
                        key={o.id}
                        onClick={() => router.push(o.isDuct ? `/dashboard/duct-orders/${o.id}` : `/dashboard/orders/${o.id}`)}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{o.order_no ?? '—'}</td>
                        <td className="px-4 py-2.5"><TypeBadge isDuct={o.isDuct} /></td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{o.vendor || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600"><div className="flex items-center gap-1.5">{o.project || '—'}{o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">No Invoice</span>}</div></td>
                        <td className={`px-4 py-2.5 whitespace-nowrap tabular-nums ${dateMode === '수주일' ? 'font-medium text-[#014A99]' : 'text-gray-500'}`}>{o.order_date?.slice(0, 10) ?? '—'}</td>
                        <td className={`px-4 py-2.5 whitespace-nowrap tabular-nums ${dateMode === '납품일' ? 'font-medium text-[#014A99]' : 'text-gray-500'}`}>{o.delivery_date?.slice(0, 10) ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{fmtWon(supply)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{fmtWon(saleVat)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{fmtWon(buyVat)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={7} className="px-4 py-2.5 text-xs text-gray-500 text-right font-semibold">
                      Total{salesVendor !== ALL && <span className="text-gray-400 font-normal ml-1">— {salesVendor}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-700 tabular-nums">{fmtWon(saleTotalSupply)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-700 tabular-nums">{fmtWon(saleTotalVat)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-orange-600 tabular-nums">{fmtWon(saleInPurchVat)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Purchases table ── */}
      {tab === 'purchases' && (
        orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
            No orders this month.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-orange-50 border-b border-orange-100 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium w-16">No.</th>
                    <th className="px-4 py-2.5 text-left font-medium w-14">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium">Manufacturer</th>
                    <th className="px-4 py-2.5 text-left font-medium">Vendor</th>
                    <th className="px-4 py-2.5 text-left font-medium">Project</th>
                    <th className="px-4 py-2.5 text-left font-medium w-24">Delivery Date</th>
                    <th className="px-4 py-2.5 text-center font-medium w-16">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">Cost (Supply)</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">Cost (VAT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPurchase.map(o => {
                    const purchSupply = o.purchase_amount + o.freight
                    const purchVat    = Math.round(purchSupply * 1.1)
                    return (
                      <tr
                        key={o.id}
                        onClick={() => router.push(o.isDuct ? `/dashboard/duct-orders/${o.id}` : `/dashboard/orders/${o.id}`)}
                        className="hover:bg-orange-50/40 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{o.order_no ?? '—'}</td>
                        <td className="px-4 py-2.5"><TypeBadge isDuct={o.isDuct} /></td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{o.manufacturer || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{o.vendor || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600"><div className="flex items-center gap-1.5">{o.project || '—'}{o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">No Invoice</span>}</div></td>
                        <td className={`px-4 py-2.5 whitespace-nowrap tabular-nums ${dateMode === '납품일' ? 'font-medium text-[#014A99]' : 'text-gray-500'}`}>{o.delivery_date?.slice(0, 10) ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center"><StatusBadge status={o.status} /></td>
                        <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{fmtWon(purchSupply)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{fmtWon(purchVat)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={7} className="px-4 py-2.5 text-xs text-gray-500 text-right font-semibold">
                      Total{purchaseMfr !== ALL && <span className="text-gray-400 font-normal ml-1">— {purchaseMfr}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-700 tabular-nums">{fmtWon(purchTotalSupply)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-orange-600 tabular-nums">{fmtWon(purchTotalVat)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}
