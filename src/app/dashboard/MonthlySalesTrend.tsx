import Link from 'next/link'

export interface MonthStat {
  year: number
  month: number
  sale: number     // pre-VAT raw
  purchase: number // pre-VAT raw
}

function abbr(v: number): string {
  if (v === 0) return '—'
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`
  if (v >= 10000) return `${Math.round(v / 10000).toLocaleString()}만`
  return v.toLocaleString() + '원'
}

export function MonthlySalesTrend({ data }: { data: MonthStat[] }) {
  const vatData = data.map(d => ({
    ...d,
    saleVat: Math.round(d.sale * 1.1),
    purchaseVat: Math.round(d.purchase * 1.1),
  }))
  const maxSale = Math.max(...vatData.map(d => d.saleVat), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          최근 6개월 추이
        </h2>
        <Link href="/dashboard/monthly" className="text-xs text-[#014A99] hover:underline">
          월별 상세 →
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {vatData.map(d => {
          const profit = d.saleVat - d.purchaseVat
          const saleW = ((d.saleVat / maxSale) * 100).toFixed(1)
          const purchaseW = ((d.purchaseVat / maxSale) * 100).toFixed(1)
          const profitLabel =
            profit === 0 ? '—'
            : (profit > 0 ? '+' : '-') + abbr(Math.abs(profit))

          return (
            <Link
              key={`${d.year}-${d.month}`}
              href={`/dashboard/monthly?year=${d.year}&month=${d.month}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors group"
            >
              {/* 월 라벨 */}
              <div className="w-9 text-xs font-semibold text-gray-500 shrink-0 tabular-nums">
                {d.month}월
              </div>

              {/* 바 영역 */}
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-400 w-5 shrink-0">매출</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 bg-blue-400 rounded-full" style={{ width: `${saleW}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 w-16 text-right tabular-nums shrink-0">{abbr(d.saleVat)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-orange-400 w-5 shrink-0">매입</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 bg-orange-300 rounded-full" style={{ width: `${purchaseW}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 w-16 text-right tabular-nums shrink-0">{abbr(d.purchaseVat)}</span>
                </div>
              </div>

              {/* 영업이익 */}
              <div className={`text-xs font-semibold w-16 text-right tabular-nums shrink-0 ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {profitLabel}
              </div>

              <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
