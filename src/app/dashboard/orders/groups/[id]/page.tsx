'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { statusLabel, ORDER_STATUS_LABEL } from '@/lib/status-labels'

type OrderStatus = '수주' | '발주' | '납품' | '취소'

interface SubOrder {
  id: string; order_no?: string; manufacturer: string; status: OrderStatus
  sale_amount: number; purchase_amount: number; freight: number
  items: any[]; order_date?: string; delivery_date?: string
  notes?: string; image_url?: string
}

interface OrderGroup {
  id: string; vendor: string; order_client?: string; project?: string
  order_date?: string; author?: string; notes?: string
  address?: string; delivery_location?: string; delivery_dest?: string
  contact_name?: string; contact_phone?: string
  pipe_orders: SubOrder[]; duct_orders: SubOrder[]
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  '수주': 'bg-blue-50 text-blue-700 border-blue-200',
  '발주': 'bg-amber-50 text-amber-700 border-amber-200',
  '납품': 'bg-green-50 text-green-700 border-green-200',
  '취소': 'bg-gray-50 text-gray-500 border-gray-200',
}

function fmt(n: number | null | undefined) {
  if (!n) return '—'
  return Math.round(n).toLocaleString('ko-KR') + ' KRW'
}

export default function GroupDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<OrderGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    fetch(`/api/order-groups/${id}`)
      .then(r => r.json())
      .then(data => { setGroup(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20 text-sm text-gray-400">Loading...</div>
  if (!group) return <div className="text-center py-20 text-sm text-gray-400">Group not found.</div>

  // Build tab list: pipe subs + duct subs
  type TabEntry = { type: '배관' | '덕트'; sub: SubOrder }
  const tabs: TabEntry[] = [
    ...group.pipe_orders.map(s => ({ type: '배관' as const, sub: s })),
    ...group.duct_orders.map(s => ({ type: '덕트' as const, sub: s })),
  ]

  // Combined totals
  const allSubs = [...group.pipe_orders, ...group.duct_orders]
  const totalSale     = allSubs.reduce((s, o) => s + (o.sale_amount ?? 0) + (o.freight ?? 0), 0)
  const totalPurchase = allSubs.reduce((s, o) => s + (o.purchase_amount ?? 0) + (o.freight ?? 0), 0)
  const totalProfit   = allSubs.some(o => o.purchase_amount > 0)
    ? allSubs.reduce((s, o) => s + (o.sale_amount ?? 0) - (o.purchase_amount ?? 0), 0)
    : null

  async function changeStatus(subId: string, type: '배관' | '덕트', status: OrderStatus) {
    const url = type === '배관' ? `/api/orders/${subId}` : `/api/duct-orders/${subId}`
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setGroup(prev => {
      if (!prev) return prev
      if (type === '배관') return { ...prev, pipe_orders: prev.pipe_orders.map(o => o.id === subId ? { ...o, status } : o) }
      return { ...prev, duct_orders: prev.duct_orders.map(o => o.id === subId ? { ...o, status } : o) }
    })
    toast.success(`Status changed to "${statusLabel(status, ORDER_STATUS_LABEL)}".`)
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/orders')} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{group.vendor}</h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                {group.pipe_orders.length > 0 && group.duct_orders.length > 0 ? 'Pipe+Duct' : group.pipe_orders.length > 0 ? 'Pipe' : 'Duct'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{group.project || '-'}</p>
          </div>
        </div>
      </div>

      {/* Combined totals cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50/50 rounded-lg border border-blue-100 px-4 py-3">
          <p className="text-xs text-blue-600 font-medium mb-1">Total Sales (VAT)</p>
          <p className="text-lg font-bold text-blue-700">{fmt(Math.round(totalSale * 1.1))}</p>
          <div className="mt-1 space-y-0.5">
            {group.pipe_orders.map(o => (
              <p key={o.id} className="text-xs text-blue-400">Pipe({o.manufacturer}) {fmt((o.sale_amount ?? 0) + (o.freight ?? 0))}</p>
            ))}
            {group.duct_orders.map(o => (
              <p key={o.id} className="text-xs text-blue-400">Duct({o.manufacturer}) {fmt((o.sale_amount ?? 0) + (o.freight ?? 0))}</p>
            ))}
          </div>
        </div>
        <div className="bg-red-50/40 rounded-lg border border-red-100 px-4 py-3">
          <p className="text-xs text-red-500 font-medium mb-1">Total Cost (VAT)</p>
          <p className="text-lg font-bold text-red-600">{totalPurchase > 0 ? fmt(Math.round(totalPurchase * 1.1)) : '—'}</p>
        </div>
        <div className="bg-green-50/50 rounded-lg border border-green-100 px-4 py-3">
          <p className="text-xs text-green-600 font-medium mb-1">Profit</p>
          <p className="text-lg font-bold text-green-700">{totalProfit != null ? fmt(totalProfit) : '—'}</p>
          {totalProfit != null && totalSale > 0 && (
            <p className="text-xs text-green-400 mt-1">{(totalProfit / totalSale * 100).toFixed(1)}%</p>
          )}
        </div>
      </div>

      {/* Common info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'Order Date', value: group.order_date?.slice(0, 10) },
            { label: 'Requesting Party', value: group.order_client },
            { label: 'Author', value: group.author },
            { label: 'Contact Person', value: group.contact_name },
            { label: 'Phone', value: group.contact_phone },
            { label: 'Delivery Recipient', value: group.delivery_dest },
            { label: 'Delivery Location', value: group.delivery_location },
            { label: 'Address', value: group.address },
          ].map(({ label, value }) => value ? (
            <div key={label}>
              <span className="text-xs text-gray-400">{label}</span>
              <p className="font-medium text-gray-800">{value}</p>
            </div>
          ) : null)}
        </div>
        {group.notes && <p className="mt-3 text-sm text-gray-500 border-t border-gray-100 pt-3">{group.notes}</p>}
      </div>

      {/* Sub-order tabs */}
      {tabs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex border-b border-gray-200 px-2 pt-2">
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                  activeTab === i
                    ? t.type === '배관' ? 'border-[#014A99] text-[#014A99]' : 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.type === '배관' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>{t.type === '배관' ? 'Pipe' : 'Duct'}</span>
                <span>{t.sub.manufacturer}</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[t.sub.status]}`}>{statusLabel(t.sub.status, ORDER_STATUS_LABEL)}</span>
              </button>
            ))}
          </div>

          {tabs.map((t, i) => {
            if (i !== activeTab) return null
            const sub = t.sub
            return (
              <div key={i} className="p-5 space-y-4">
                {/* Sub-order header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {sub.order_no && <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{sub.order_no}</span>}
                    <span className="text-sm text-gray-500">Manufacturer: <strong>{sub.manufacturer}</strong></span>
                    {sub.freight > 0 && <span className="text-xs text-gray-400">Freight {sub.freight.toLocaleString()} KRW</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={sub.status} onChange={e => changeStatus(sub.id, t.type, e.target.value as OrderStatus)}
                      className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] cursor-pointer">
                      {(['수주', '발주', '납품', '취소'] as OrderStatus[]).map(s => <option key={s} value={s}>{statusLabel(s, ORDER_STATUS_LABEL)}</option>)}
                    </select>
                    <button onClick={() => router.push(t.type === '배관' ? `/dashboard/orders/${sub.id}` : `/dashboard/duct-orders/${sub.id}`)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                      View Details
                    </button>
                  </div>
                </div>

                {/* Amount cards */}
                {(() => {
                  const sale     = (sub.sale_amount ?? 0) + (sub.freight ?? 0)
                  const purchase = (sub.purchase_amount ?? 0) + (sub.freight ?? 0)
                  const profit   = sub.purchase_amount > 0 ? (sub.sale_amount ?? 0) - (sub.purchase_amount ?? 0) : null
                  const margin   = profit != null && sale > 0 ? Math.round(profit / sale * 100) : null
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50/50 rounded-lg border border-blue-100 px-3 py-2.5 text-center">
                        <p className="text-xs text-blue-400 font-medium mb-1">Sales (VAT)</p>
                        <p className="text-sm font-bold text-blue-700">{sale > 0 ? fmt(Math.round(sale * 1.1)) : <span className="text-gray-300 font-normal text-xs">Not entered</span>}</p>
                      </div>
                      <div className="bg-red-50/40 rounded-lg border border-red-100 px-3 py-2.5 text-center">
                        <p className="text-xs text-red-400 font-medium mb-1">Cost (VAT)</p>
                        {sub.purchase_amount > 0
                          ? <p className="text-sm font-bold text-red-600">{fmt(Math.round(purchase * 1.1))}</p>
                          : <p className="text-sm text-gray-300 text-xs">Not yet purchased</p>}
                      </div>
                      <div className="bg-green-50/50 rounded-lg border border-green-100 px-3 py-2.5 text-center">
                        <p className="text-xs text-green-500 font-medium mb-1">Profit</p>
                        {profit != null
                          ? <p className="text-sm font-bold text-green-700">{fmt(profit)}{margin != null && <span className="text-xs font-normal text-green-400 ml-1">({margin}%)</span>}</p>
                          : <p className="text-sm text-gray-300 text-xs">—</p>}
                      </div>
                    </div>
                  )
                })()}

                {/* Item table (read-only) */}
                {sub.items && sub.items.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left w-8">No.</th>
                          <th className="px-3 py-2 text-left">Item Name</th>
                          <th className="px-3 py-2 text-left">Spec</th>
                          <th className="px-3 py-2 text-center w-16">Unit</th>
                          <th className="px-3 py-2 text-right w-16">Qty</th>
                          {t.type === '덕트' && <>
                            <th className="px-3 py-2 text-right w-20">Width</th>
                            <th className="px-3 py-2 text-right w-20">Height</th>
                          </>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sub.items.map((item: any, idx: number) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{t.type === '덕트' ? (item.type === '입상' ? 'Riser' : item.type === '벽체' ? 'Wall' : item.type) : (item.name || item.displayName || item.internalName || '-')}</td>
                            <td className="px-3 py-2 text-gray-500">{t.type === '덕트' ? '-' : (item.spec || (item.pipeSpec ? `${item.pipeSpec}${item.sleeveSpec ? `×${item.sleeveSpec}` : ''}` : '-'))}</td>
                            <td className="px-3 py-2 text-center text-gray-500">{item.unit || 'ea'}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            {t.type === '덕트' && <>
                              <td className="px-3 py-2 text-right text-gray-500">{item.width ?? '-'}</td>
                              <td className="px-3 py-2 text-right text-gray-500">{item.height ?? '-'}</td>
                            </>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
