'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { statusLabel, ORDER_STATUS_LABEL, DATE_MODE_LABEL } from '@/lib/status-labels'

type DateMode = '수주일' | '납품일'

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

export interface WeekOrderItem {
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
  orderDateOrders: WeekOrderItem[]
  deliveryDateOrders: WeekOrderItem[]
  from: string
  to: string
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

export function WeeklyTables({ orderDateOrders, deliveryDateOrders, from, to }: Props) {
  const router = useRouter()
  const [dateMode, setDateMode] = useState<DateMode>('수주일')
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const url = `/api/weekly/export?from=${from}&to=${to}&dateMode=${encodeURIComponent(dateMode)}`
      const res = await fetch(url)
      if (!res.ok) { toast.error('Download failed'); return }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `주간현황_${from}_${to}_${dateMode}기준.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { toast.error('Error during download') }
    finally { setDownloading(false) }
  }

  const orders = dateMode === '수주일' ? orderDateOrders : deliveryDateOrders

  const totalSupply  = orders.reduce((s, o) => s + o.sale_amount + o.freight, 0)
  const totalSaleVat = Math.round(totalSupply * 1.1)
  const totalBuyVat  = Math.round(orders.reduce((s, o) => s + o.purchase_amount + o.freight, 0) * 1.1)
  const totalProfit  = orders.reduce((s, o) => s + o.sale_amount - o.purchase_amount, 0)

  const stats = orders.reduce((acc, o) => {
    acc[o.status as keyof typeof acc] = (acc[o.status as keyof typeof acc] ?? 0) + 1
    return acc
  }, { 수주: 0, 발주: 0, 납품: 0, 취소: 0 } as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* Date basis toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">By:</span>
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {(['수주일', '납품일'] as DateMode[]).map(m => (
            <button
              key={m}
              onClick={() => setDateMode(m)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                dateMode === m ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {DATE_MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{orders.length}</span>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 border border-green-300 hover:bg-green-50 disabled:opacity-40 transition-colors cursor-pointer ml-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
          {downloading ? 'Generating...' : 'Excel'}
        </button>
      </div>

      {/* Status count + amount summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['수주', '발주', '납품', '취소'] as const).map(s => (
          <div key={s} className={`rounded-xl border p-3 text-center ${
            s === '수주' ? 'border-blue-200 bg-blue-50/60' :
            s === '발주' ? 'border-amber-200 bg-amber-50/60' :
            s === '납품' ? 'border-green-200 bg-green-50/60' :
            'border-gray-200 bg-gray-50/60'
          }`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${
              s === '수주' ? 'text-blue-600' : s === '발주' ? 'text-amber-600' : s === '납품' ? 'text-green-600' : 'text-gray-400'
            }`}>{statusLabel(s, ORDER_STATUS_LABEL)}</p>
            <p className={`text-2xl font-bold mt-1 ${
              s === '수주' ? 'text-blue-800' : s === '발주' ? 'text-amber-800' : s === '납품' ? 'text-green-800' : 'text-gray-600'
            }`}>{stats[s]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Revenue <span className="text-gray-300">(incl. VAT)</span></p>
          <p className="text-lg font-bold text-blue-700">{fmtWon(totalSaleVat)}</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Cost <span className="text-gray-300">(incl. VAT)</span></p>
          <p className="text-lg font-bold text-orange-600">{fmtWon(totalBuyVat)}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Profit</p>
          <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totalProfit === 0 ? '—' : fmtWon(Math.abs(totalProfit))}
          </p>
        </div>
      </div>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
          No orders this week.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
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
                {orders.map(o => {
                  const supply  = o.sale_amount + o.freight
                  const saleVat = Math.round(supply * 1.1)
                  const buyVat  = Math.round((o.purchase_amount + o.freight) * 1.1)
                  return (
                    <tr
                      key={o.id}
                      onClick={() => router.push(o.isDuct ? `/dashboard/duct-orders/${o.id}` : `/dashboard/orders/${o.id}`)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{o.order_no ?? '—'}</td>
                      <td className="px-4 py-2.5"><TypeBadge isDuct={o.isDuct} /></td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{o.vendor || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          {o.project || '—'}
                          {o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">No Invoice</span>}
                        </div>
                      </td>
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
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 text-xs font-semibold">
                <tr>
                  <td colSpan={7} className="px-4 py-2.5 text-right text-gray-500">Total ({orders.length})</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{fmtWon(totalSupply)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-700 tabular-nums">{fmtWon(totalSaleVat)}</td>
                  <td className="px-4 py-2.5 text-right text-orange-600 tabular-nums">{fmtWon(totalBuyVat)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
