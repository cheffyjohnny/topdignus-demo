'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = '주문' | '매입'
type DateMode = '수주일' | '납품일'

const STATUS_COLORS: Record<string, string> = {
  수주: 'bg-blue-50 text-blue-700',
  발주: 'bg-amber-50 text-amber-700',
  납품: 'bg-green-50 text-green-700',
  취소: 'bg-gray-50 text-gray-500',
}

function fmtWon(v: number) {
  if (v === 0) return '—'
  return v.toLocaleString('ko-KR') + '원'
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
      {isDuct ? '덕트' : '배관'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[status] ?? 'bg-gray-50 text-gray-500'}`}>
      {status}
    </span>
  )
}

export function MonthlyTables({ orderDateOrders, deliveryDateOrders, year, month }: Props) {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('주문')
  const [dateMode, setDateMode] = useState<DateMode>('수주일')
  const [salesVendor, setSalesVendor] = useState('전체')
  const [purchaseMfr, setPurchaseMfr] = useState('전체')

  const orders = dateMode === '수주일' ? orderDateOrders : deliveryDateOrders

  const salesVendors = ['전체', ...Array.from(new Set(orders.map(o => o.vendor).filter(Boolean))).sort()]
  const purchaseMfrs = ['전체', ...Array.from(new Set(orders.map(o => o.manufacturer).filter(Boolean))).sort()]

  const filteredSales    = salesVendor === '전체' ? orders : orders.filter(o => o.vendor === salesVendor)
  const filteredPurchase = purchaseMfr  === '전체' ? orders : orders.filter(o => o.manufacturer === purchaseMfr)

  const saleTotalSupply = filteredSales.reduce((s, o) => s + o.sale_amount + o.freight, 0)
  const saleTotalVat    = Math.round(saleTotalSupply * 1.1)
  const saleInPurchVat  = Math.round(filteredSales.reduce((s, o) => s + o.purchase_amount + o.freight, 0) * 1.1)

  const purchTotalSupply = filteredPurchase.reduce((s, o) => s + o.purchase_amount + o.freight, 0)
  const purchTotalVat    = Math.round(purchTotalSupply * 1.1)

  const activeCount = tab === '주문' ? filteredSales.length : filteredPurchase.length

  return (
    <div>
      {/* 날짜 기준 토글 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-400">기준:</span>
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {(['수주일', '납품일'] as DateMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setDateMode(m); setSalesVendor('전체'); setPurchaseMfr('전체') }}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                dateMode === m ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m} 기준
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-300">|</span>
        <span className="text-xs text-gray-400">
          {dateMode === '수주일' ? `수주일 기준 ${orders.length}건` : `납품일 기준 ${orders.length}건`}
        </span>
      </div>

      {/* 주문/매입 탭 + 필터 + 엑셀 */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
            {(['주문', '매입'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}목록
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">{activeCount}건</span>
        </div>

        <div className="flex items-center gap-2">
          {tab === '주문' ? (
            <select
              value={salesVendor}
              onChange={e => setSalesVendor(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              {salesVendors.map(v => <option key={v} value={v}>{v === '전체' ? '거래처 전체' : v}</option>)}
            </select>
          ) : (
            <select
              value={purchaseMfr}
              onChange={e => setPurchaseMfr(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            >
              {purchaseMfrs.map(v => <option key={v} value={v}>{v === '전체' ? '제조사 전체' : v}</option>)}
            </select>
          )}

          <a
            href={`/api/orders/monthly-export?year=${year}&month=${month}`}
            className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            엑셀
          </a>
        </div>
      </div>

      {/* ── 주문목록 테이블 ── */}
      {tab === '주문' && (
        orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
            이 달의 주문이 없습니다.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium w-16">번호</th>
                    <th className="px-4 py-2.5 text-left font-medium w-14">유형</th>
                    <th className="px-4 py-2.5 text-left font-medium">업체</th>
                    <th className="px-4 py-2.5 text-left font-medium">현장명</th>
                    <th className="px-4 py-2.5 text-left font-medium w-24">수주일</th>
                    <th className="px-4 py-2.5 text-left font-medium w-24">납품일</th>
                    <th className="px-4 py-2.5 text-center font-medium w-16">상태</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">공급가액</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">매출(VAT)</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">매입(VAT)</th>
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
                        <td className="px-4 py-2.5 text-gray-600"><div className="flex items-center gap-1.5">{o.project || '—'}{o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">계산서 미발행</span>}</div></td>
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
                      합계{salesVendor !== '전체' && <span className="text-gray-400 font-normal ml-1">— {salesVendor}</span>}
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

      {/* ── 매입목록 테이블 ── */}
      {tab === '매입' && (
        orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
            이 달의 주문이 없습니다.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-orange-50 border-b border-orange-100 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium w-16">번호</th>
                    <th className="px-4 py-2.5 text-left font-medium w-14">유형</th>
                    <th className="px-4 py-2.5 text-left font-medium">제조사</th>
                    <th className="px-4 py-2.5 text-left font-medium">업체</th>
                    <th className="px-4 py-2.5 text-left font-medium">현장명</th>
                    <th className="px-4 py-2.5 text-left font-medium w-24">납품일</th>
                    <th className="px-4 py-2.5 text-center font-medium w-16">상태</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">매입(공급가액)</th>
                    <th className="px-4 py-2.5 text-right font-medium w-32">매입(VAT)</th>
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
                        <td className="px-4 py-2.5 text-gray-600"><div className="flex items-center gap-1.5">{o.project || '—'}{o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">계산서 미발행</span>}</div></td>
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
                      합계{purchaseMfr !== '전체' && <span className="text-gray-400 font-normal ml-1">— {purchaseMfr}</span>}
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
