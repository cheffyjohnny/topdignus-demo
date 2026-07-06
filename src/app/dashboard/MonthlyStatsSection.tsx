'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type OrderStatus = '수주' | '발주' | '납품' | '취소'
type DateMode = '수주일' | '납품일'

interface MonthOrder {
  id: string
  order_no?: string | null
  vendor: string
  project: string | null
  order_date: string | null
  delivery_date: string | null
  status: string
  isDuct: boolean
  no_invoice: boolean
  sale_amount: number
  purchase_amount: number
  freight: number
}

interface CalcResult {
  stats: Record<OrderStatus, number>
  pipeCount: number
  ductCount: number
  totalSale: number
  totalPurchase: number
}

interface Props {
  year: number
  month: number
  orderDateOrders: MonthOrder[]
  deliveryDateOrders: MonthOrder[]
  orderDateCalc: CalcResult
  deliveryDateCalc: CalcResult
}

const STAT_CARDS: {
  label: OrderStatus
  border: string
  bg: string
  activeBg: string
  labelCls: string
  numCls: string
  ringCls: string
}[] = [
  { label: '수주', border: 'border-blue-200',  bg: 'bg-blue-50/60',  activeBg: 'bg-blue-50',  labelCls: 'text-blue-600',  numCls: 'text-blue-800',  ringCls: 'ring-2 ring-blue-400'  },
  { label: '발주', border: 'border-amber-200', bg: 'bg-amber-50/60', activeBg: 'bg-amber-50', labelCls: 'text-amber-600', numCls: 'text-amber-800', ringCls: 'ring-2 ring-amber-400' },
  { label: '납품', border: 'border-green-200', bg: 'bg-green-50/60', activeBg: 'bg-green-50', labelCls: 'text-green-600', numCls: 'text-green-800', ringCls: 'ring-2 ring-green-400' },
  { label: '취소', border: 'border-gray-200',  bg: 'bg-gray-50/60',  activeBg: 'bg-gray-50',  labelCls: 'text-gray-400',  numCls: 'text-gray-600',  ringCls: 'ring-2 ring-gray-400'  },
]

const STATUS_COLORS: Record<string, string> = {
  수주: 'bg-blue-50 text-blue-700',
  발주: 'bg-amber-50 text-amber-700',
  납품: 'bg-green-50 text-green-700',
  취소: 'bg-gray-50 text-gray-500',
}

function MonthOrderTable({ orders, dateMode }: { orders: MonthOrder[]; dateMode: DateMode }) {
  const router = useRouter()
  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">해당 상태의 수주서가 없습니다.</p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[580px]">
        <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium w-16">번호</th>
            <th className="px-4 py-2.5 text-left font-medium w-14">유형</th>
            <th className="px-4 py-2.5 text-left font-medium">업체</th>
            <th className="px-4 py-2.5 text-left font-medium">현장명</th>
            <th className="px-4 py-2.5 text-left font-medium w-24">수주일</th>
            <th className="px-4 py-2.5 text-left font-medium w-24">납품일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map(o => (
            <tr
              key={o.id}
              onClick={() => router.push(o.isDuct ? `/dashboard/duct-orders/${o.id}` : `/dashboard/orders/${o.id}`)}
              className="hover:bg-blue-50/30 cursor-pointer transition-colors"
            >
              <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{o.order_no ?? '—'}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${o.isDuct ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {o.isDuct ? '덕트' : '배관'}
                </span>
              </td>
              <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{o.vendor || '—'}</td>
              <td className="px-4 py-2.5 text-gray-600"><div className="flex items-center gap-1.5">{o.project || '—'}{o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">계산서 미발행</span>}</div></td>
              <td className={`px-4 py-2.5 whitespace-nowrap tabular-nums ${dateMode === '수주일' ? 'font-medium text-[#014A99]' : 'text-gray-500'}`}>{o.order_date?.slice(0, 10) ?? '—'}</td>
              <td className={`px-4 py-2.5 whitespace-nowrap tabular-nums ${dateMode === '납품일' ? 'font-medium text-[#014A99]' : 'text-gray-500'}`}>{o.delivery_date?.slice(0, 10) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmtWon(v: number): string {
  if (v === 0) return '—'
  return v.toLocaleString('ko-KR') + '원'
}

export function MonthlyStatsSection({ year, month, orderDateOrders, deliveryDateOrders, orderDateCalc, deliveryDateCalc }: Props) {
  const [dateMode, setDateMode] = useState<DateMode>('수주일')
  const [activeStatus, setActiveStatus] = useState<OrderStatus | null>(null)

  const calc   = dateMode === '수주일' ? orderDateCalc   : deliveryDateCalc
  const orders = dateMode === '수주일' ? orderDateOrders : deliveryDateOrders

  function handleCardClick(label: OrderStatus) {
    setActiveStatus(prev => prev === label ? null : label)
  }

  const filteredOrders = activeStatus ? orders.filter(o => o.status === activeStatus) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            {year}년 {month}월 현황
          </h2>
          {/* 수주일 / 납품일 토글 */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
            {(['수주일', '납품일'] as DateMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setDateMode(m); setActiveStatus(null) }}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  dateMode === m ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400">
          배관 {calc.pipeCount}건 &middot; 덕트 {calc.ductCount}건
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {STAT_CARDS.map(({ label, border, bg, activeBg, labelCls, numCls, ringCls }) => {
          const isActive = activeStatus === label
          return (
            <button
              key={label}
              onClick={() => handleCardClick(label)}
              className={`rounded-xl border ${border} ${isActive ? `${activeBg} ${ringCls}` : bg} p-3 sm:p-5 text-left transition-all duration-150 cursor-pointer hover:brightness-95`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wider ${labelCls}`}>{label}</p>
              <p className={`text-2xl sm:text-3xl font-bold mt-2 ${numCls}`}>
                {calc.stats[label]}
                <span className="text-sm font-normal ml-1 opacity-70">건</span>
              </p>
              {isActive && (
                <p className="text-xs mt-1.5 opacity-60">▲ 클릭하여 닫기</p>
              )}
            </button>
          )
        })}
      </div>

      {/* 매출 / 매입 / 영업이익 */}
      {(() => {
        const sale = Math.round(calc.totalSale * 1.1)
        const purchase = Math.round(calc.totalPurchase * 1.1)
        const profit = sale - purchase
        const margin = sale > 0 ? Math.round(profit / sale * 100) : null
        return (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">매출 <span className="text-gray-300">(VAT포함)</span></p>
              <p className="text-lg font-bold text-blue-700">{fmtWon(sale)}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">매입 <span className="text-gray-300">(VAT포함)</span></p>
              <p className="text-lg font-bold text-orange-600">{fmtWon(purchase)}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${profit >= 0 ? 'border-green-100 bg-white' : 'border-red-100 bg-white'}`}>
              <p className="text-xs text-gray-400 mb-1">
                영업이익{margin !== null && <span className="ml-1 text-gray-300">({margin}%)</span>}
              </p>
              <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {profit === 0 ? '—' : (profit > 0 ? '' : '-') + fmtWon(Math.abs(profit))}
              </p>
            </div>
          </div>
        )
      })()}

      {/* 상세 테이블 */}
      {activeStatus && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[activeStatus]}`}>
                {activeStatus}
              </span>
              <span className="text-sm text-gray-600">
                {year}년 {month}월 · {filteredOrders.length}건 ({dateMode} 기준)
              </span>
            </div>
            <button
              onClick={() => setActiveStatus(null)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="닫기"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <MonthOrderTable orders={filteredOrders} dateMode={dateMode} />
        </div>
      )}
    </div>
  )
}
