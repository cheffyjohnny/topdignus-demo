'use client'

import { useState } from 'react'
import { YearlyChart, ChartMonthData } from './YearlyChart'

function fmtWon(v: number) {
  if (v === 0) return '—'
  return '₩' + v.toLocaleString('en-US')
}

const ALL = 'All'

interface Props {
  year: number
  vendors: string[]
  vendorTotals: Record<string, { sale: number; purchase: number }>
  monthData: Record<number, Record<string, { sale: number; purchase: number }>>
  chartData: ChartMonthData[]
}

export function YearlyContent({ year, vendors, vendorTotals, monthData, chartData }: Props) {
  const [selectedVendor, setSelectedVendor] = useState(ALL)

  const isAll = selectedVendor === ALL

  // Annual totals based on selected vendor
  const annualSale     = isAll
    ? Object.values(vendorTotals).reduce((s, v) => s + v.sale, 0)
    : (vendorTotals[selectedVendor]?.sale ?? 0)
  const annualPurchase = isAll
    ? Object.values(vendorTotals).reduce((s, v) => s + v.purchase, 0)
    : (vendorTotals[selectedVendor]?.purchase ?? 0)
  const annualProfit   = annualSale - annualPurchase
  const margin         = annualSale > 0 ? Math.round(annualProfit / annualSale * 100) : null

  const tableVendors = isAll ? vendors : [selectedVendor]
  const hasData = vendors.length > 0

  return (
    <>
      {/* Vendor filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Vendor:</span>
        <div className="flex flex-wrap gap-1.5">
          {[ALL, ...vendors].map(v => (
            <button
              key={v}
              onClick={() => setSelectedVendor(v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer border ${
                selectedVendor === v
                  ? 'bg-[#014A99] text-white border-[#014A99]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Annual summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Annual Supply Amt{!isAll && <span className="ml-1 text-gray-300">({selectedVendor})</span>}</p>
          <p className="text-lg font-bold text-blue-700">{fmtWon(annualSale)}</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-white px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Annual Cost</p>
          <p className="text-lg font-bold text-orange-600">{fmtWon(annualPurchase)}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${annualProfit >= 0 ? 'border-green-100' : 'border-red-100'} bg-white`}>
          <p className="text-xs text-gray-400 mb-1">
            Annual Net Profit{margin !== null && <span className="ml-1 text-gray-300">({margin}%)</span>}
          </p>
          <p className={`text-lg font-bold ${annualProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmtWon(Math.abs(annualProfit))}
          </p>
        </div>
      </div>

      {/* Chart (always shows all vendors) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          {year} Monthly Revenue Chart
          <span className="ml-2 text-gray-300 normal-case font-normal">(supply amount basis, net profit line)</span>
        </h2>
        {hasData ? (
          <YearlyChart data={chartData} vendors={vendors} selectedVendor={isAll ? null : selectedVendor} />
        ) : (
          <p className="py-10 text-center text-sm text-gray-400">No data for {year}.</p>
        )}
      </div>

      {/* Monthly revenue table by vendor */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          {year} Monthly Revenue {isAll ? 'by Vendor' : `— ${selectedVendor}`}
          <span className="ml-2 text-gray-300 normal-case font-normal">(supply amount)</span>
        </h2>

        {!hasData ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
            No orders in {year}.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ minWidth: `${Math.max(640, (tableVendors.length + 2) * 130)}px` }}
              >
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium w-12">Month</th>
                    {tableVendors.map(v => (
                      <th key={v} className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{v}</th>
                    ))}
                    {isAll && <th className="px-4 py-2.5 text-right font-medium">Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1
                    const totalMonthSale = tableVendors.reduce((s, v) => s + (monthData[m][v]?.sale ?? 0), 0)
                    const isActive = totalMonthSale > 0
                    return (
                      <tr key={m} className={isActive ? 'hover:bg-blue-50/20' : ''}>
                        <td className={`px-4 py-2.5 font-medium tabular-nums ${isActive ? 'text-gray-700' : 'text-gray-300'}`}>
                          {m}
                        </td>
                        {tableVendors.map(v => {
                          const amt = monthData[m][v]?.sale ?? 0
                          return (
                            <td key={v} className={`px-3 py-2.5 text-right tabular-nums ${amt > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                              {fmtWon(amt)}
                            </td>
                          )
                        })}
                        {isAll && (
                          <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${isActive ? 'text-blue-700' : 'text-gray-300'}`}>
                            {fmtWon(totalMonthSale)}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-gray-700">Total</td>
                    {tableVendors.map(v => (
                      <td key={v} className="px-3 py-2.5 text-right font-semibold text-gray-700 tabular-nums">
                        {fmtWon(vendorTotals[v]?.sale ?? 0)}
                      </td>
                    ))}
                    {isAll && (
                      <td className="px-4 py-2.5 text-right font-bold text-blue-700 tabular-nums">
                        {fmtWon(annualSale)}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
