'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { statusLabel, ORDER_STATUS_LABEL } from '@/lib/status-labels'

type OrderStatus = '수주' | '발주' | '납품' | '취소'
type StatusTab = '전체' | OrderStatus

interface FireBlanketOrder {
  id: string
  order_no?: string
  manufacturer: string
  customer_name: string
  project: string
  contact_name: string
  order_date: string
  delivery_date: string
  author: string
  status: OrderStatus
  sale_amount: number
  purchase_amount: number
  freight: number
  no_invoice: boolean
  created_at: string
}

const STATUS_TABS: StatusTab[] = ['전체', '수주', '발주', '납품', '취소']
const STATUS_TAB_LABEL: Record<StatusTab, string> = { '전체': 'All', '수주': 'Ordered', '발주': 'Purchased', '납품': 'Delivered', '취소': 'Cancelled' }
const STATUS_COLORS: Record<OrderStatus, string> = {
  '수주': 'bg-blue-50 text-blue-700 border-blue-200',
  '발주': 'bg-amber-50 text-amber-700 border-amber-200',
  '납품': 'bg-green-50 text-green-700 border-green-200',
  '취소': 'bg-gray-50 text-gray-500 border-gray-200',
}

function fmtDate(d?: string) { return d ? d.slice(0, 10) : '-' }
function fmtNum(n?: number | null) { return n ? n.toLocaleString('ko-KR') : '0' }
function vatOf(n: number) { return Math.round(n * 1.1) }

export default function FireBlanketOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<FireBlanketOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusTab, setStatusTab] = useState<StatusTab>('전체')
  const [sortKey, setSortKey] = useState<'order_date' | 'delivery_date' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/fire-blanket-orders')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setOrders(d) })
      .finally(() => setLoading(false))
  }, [])

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let rows = statusTab === '전체' ? orders : orders.filter(o => o.status === statusTab)
    return [...rows].sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [orders, statusTab, sortKey, sortDir])

  const totalSale = useMemo(() => filtered.reduce((s, o) => s + (o.no_invoice ? 0 : (o.sale_amount ?? 0)), 0), [filtered])
  const totalBuy  = useMemo(() => filtered.reduce((s, o) => s + (o.no_invoice ? 0 : (o.purchase_amount ?? 0)), 0), [filtered])

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-0.5">↕</span>
    return <span className="text-[#014A99] ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { '전체': orders.length }
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fire Blanket Order List</h1>
          <p className="text-sm text-gray-400 mt-0.5">List of fire blanket orders</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/fire-blanket-orders/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#014A99] text-white text-sm font-medium rounded-lg hover:bg-[#013a7a] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Fire Blanket Order
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              statusTab === tab
                ? 'bg-[#014A99] text-white font-medium'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {STATUS_TAB_LABEL[tab]}
            {counts[tab] ? <span className="ml-1 text-xs opacity-70">({counts[tab]})</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No orders.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Order No.</th>
                <th
                  className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('order_date')}
                >
                  Order Date <SortIcon col="order_date" />
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap cursor-pointer hover:text-gray-700"
                  onClick={() => toggleSort('delivery_date')}
                >
                  Delivery Date <SortIcon col="delivery_date" />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Requesting Party</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Project</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">Manufacturer</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 whitespace-nowrap">Supply Amount</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 whitespace-nowrap">Sales (VAT)</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 whitespace-nowrap">Cost (VAT)</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 whitespace-nowrap">Profit</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(order => {
                const saleVat  = order.no_invoice ? 0 : vatOf(order.sale_amount ?? 0)
                const buyVat   = order.no_invoice ? 0 : vatOf(order.purchase_amount ?? 0)
                const profit   = saleVat - buyVat - (order.no_invoice ? 0 : (order.freight ?? 0))
                return (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/dashboard/fire-blanket-orders/${order.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600">{order.order_no ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(order.order_date)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(order.delivery_date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{order.customer_name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600"><div className="flex items-center gap-1.5">{order.project ?? '-'}{order.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">No Invoice</span>}</div></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{order.manufacturer ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{order.no_invoice ? '—' : fmtNum(order.sale_amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{order.no_invoice ? '—' : fmtNum(saleVat)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtNum(buyVat)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {fmtNum(profit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${STATUS_COLORS[order.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {statusLabel(order.status, ORDER_STATUS_LABEL)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-medium text-gray-700">
                <td colSpan={6} className="px-4 py-3 text-sm text-gray-500">Total ({filtered.length})</td>
                <td className="px-4 py-3 text-right">{fmtNum(totalSale)}</td>
                <td className="px-4 py-3 text-right">{fmtNum(vatOf(totalSale))}</td>
                <td className="px-4 py-3 text-right">{fmtNum(vatOf(totalBuy))}</td>
                <td className={`px-4 py-3 text-right ${vatOf(totalSale) - vatOf(totalBuy) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {fmtNum(vatOf(totalSale) - vatOf(totalBuy))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
