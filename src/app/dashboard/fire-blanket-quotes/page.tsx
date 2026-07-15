'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type QuoteStatus = '검토중' | '견적제출' | '수주' | '취소'

interface Quote {
  id: string
  quote_no: string | null
  customer_name: string | null
  project: string | null
  order_date: string | null
  delivery_date: string | null
  author: string | null
  status: QuoteStatus
  sale_amount: number
  created_at: string
}

const STATUS_TABS: { label: string; value: QuoteStatus | '전체' }[] = [
  { label: '전체', value: '전체' },
  { label: '검토중', value: '검토중' },
  { label: '견적제출', value: '견적제출' },
  { label: '수주', value: '수주' },
  { label: '취소', value: '취소' },
]

const STATUS_LABEL: Record<QuoteStatus | '전체', string> = {
  '전체': 'All', '검토중': 'In Review', '견적제출': 'Quoted', '수주': 'Ordered', '취소': 'Cancelled',
}

const STATUS_STYLE: Record<QuoteStatus, string> = {
  '검토중':  'bg-gray-50 text-gray-600 border-gray-200',
  '견적제출': 'bg-blue-50 text-blue-700 border-blue-200',
  '수주':    'bg-green-50 text-green-700 border-green-200',
  '취소':    'bg-gray-50 text-gray-400 border-gray-200',
}

function fmt(n: number) { return n.toLocaleString('ko-KR') }

export default function FireBlanketQuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<QuoteStatus | '전체'>('전체')

  useEffect(() => {
    fetch('/api/fire-blanket-quotes')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setQuotes(d) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeStatus === '전체' ? quotes : quotes.filter(q => q.status === activeStatus)

  const totalSale = filtered.reduce((s, q) => s + (q.sale_amount || 0), 0)
  const totalVat  = Math.round(totalSale * 1.1)

  const countMap = quotes.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fire Blanket Quotes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fire blanket quote status</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/fire-blanket-quotes/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
          style={{ backgroundColor: '#014A99' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Quote
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {STATUS_TABS.map(tab => {
          const cnt = tab.value === '전체' ? quotes.length : (countMap[tab.value] ?? 0)
          const active = activeStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                active ? 'border-[#014A99] text-[#014A99]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {STATUS_LABEL[tab.value]} {cnt > 0 && <span className={`ml-1 text-xs ${active ? 'text-[#014A99]' : 'text-gray-400'}`}>{cnt}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
          <p>No quotes.</p>
          <button onClick={() => router.push('/dashboard/fire-blanket-quotes/new')} className="text-[#014A99] hover:underline cursor-pointer">Create a Quote</button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">Quote Date</th>
                  <th className="px-4 py-3 text-left">Requesting Party</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Requested Delivery Date</th>
                  <th className="px-4 py-3 text-left">Author</th>
                  <th className="px-4 py-3 text-right">Supply Amount</th>
                  <th className="px-4 py-3 text-right">Sales (VAT)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(q => (
                  <tr
                    key={q.id}
                    onClick={() => router.push(`/dashboard/fire-blanket-quotes/${q.id}`)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600 tabular-nums">{q.order_date ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{q.customer_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{q.project ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{q.delivery_date ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{q.author ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {q.sale_amount > 0 ? fmt(q.sale_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {q.sale_amount > 0 ? fmt(Math.round(q.sale_amount * 1.1)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[q.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {STATUS_LABEL[q.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr className="text-xs font-medium text-gray-600">
                    <td colSpan={5} className="px-4 py-3 text-right">Total ({filtered.length})</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(totalSale)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(totalVat)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
