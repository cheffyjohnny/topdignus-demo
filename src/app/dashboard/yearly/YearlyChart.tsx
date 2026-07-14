'use client'

const VENDOR_COLORS = [
  '#3B82F6', // blue-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EF4444', // red-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#A855F7', // purple-500
]

function abbr(v: number): string {
  if (v === 0) return '0'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return v.toLocaleString()
}

export interface ChartMonthData {
  month: number
  vendors: { vendor: string; sale: number }[]
  totalSale: number
  netProfit: number
}

interface Props {
  data: ChartMonthData[]
  vendors: string[]
  selectedVendor?: string | null
}

export function YearlyChart({ data, vendors, selectedVendor }: Props) {
  // SVG dimensions
  const svgW = 760
  const svgH = 320
  const ml = 72   // left margin (Y-axis labels)
  const mr = 16   // right margin
  const mt = 20   // top margin
  const mb = 36   // bottom margin (X-axis labels)

  const cW = svgW - ml - mr
  const cH = svgH - mt - mb

  const colW = cW / 12
  const barW = colW * 0.65
  const getBarX = (m: number) => ml + (m - 1) * colW + (colW - barW) / 2

  const maxSale = Math.max(...data.map(d => d.totalSale), 1)

  // pixel Y for a given value (0 = bottom of chart)
  const yScale = (v: number) => mt + cH - Math.max(0, (v / maxSale)) * cH

  // Grid lines at 0, 25%, 50%, 75%, 100%
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxSale * f))

  // Profit line points (connect month centers)
  const profitPoints = data.map(d => ({
    x: getBarX(d.month) + barW / 2,
    y: yScale(d.netProfit),
    profit: d.netProfit,
  }))
  const profitPolyline = profitPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        style={{ maxHeight: 320 }}
      >
        {/* Gridlines + Y labels */}
        {gridValues.map((v, i) => {
          const y = yScale(v)
          return (
            <g key={i}>
              <line
                x1={ml} y1={y} x2={ml + cW} y2={y}
                stroke={i === 0 ? '#D1D5DB' : '#F3F4F6'} strokeWidth={1}
              />
              <text x={ml - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
                {abbr(v)}
              </text>
            </g>
          )
        })}

        {/* Stacked bars */}
        {data.map(d => {
          const bx = getBarX(d.month)
          let accumulated = 0
          return (
            <g key={d.month}>
              {d.vendors.map(({ vendor, sale }) => {
                const h = (sale / maxSale) * cH
                const y = mt + cH - accumulated - h
                const colorIdx = vendors.indexOf(vendor) % VENDOR_COLORS.length
                accumulated += h
                return (
                  <rect
                    key={vendor}
                    x={bx} y={y}
                    width={barW} height={Math.max(h, 0)}
                    fill={VENDOR_COLORS[colorIdx]}
                    opacity={selectedVendor && selectedVendor !== vendor ? 0.2 : 0.87}
                  />
                )
              })}
              {/* Rounded cap on top bar */}
              {accumulated > 0 && (
                <rect
                  x={bx} y={mt + cH - accumulated}
                  width={barW} height={Math.min(4, accumulated)}
                  rx={2}
                  fill={
                    d.vendors.length > 0
                      ? VENDOR_COLORS[vendors.indexOf(d.vendors[d.vendors.length - 1].vendor) % VENDOR_COLORS.length]
                      : 'transparent'
                  }
                  opacity={0.87}
                />
              )}
            </g>
          )
        })}

        {/* Net profit line */}
        {profitPolyline && (
          <>
            <polyline
              points={profitPolyline}
              fill="none"
              stroke="#059669"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {profitPoints.map((p, i) => (
              p.profit > 0 && (
                <circle
                  key={i}
                  cx={p.x} cy={p.y}
                  r={4}
                  fill="white"
                  stroke="#059669"
                  strokeWidth={2}
                />
              )
            ))}
          </>
        )}

        {/* X-axis labels */}
        {data.map(d => (
          <text
            key={d.month}
            x={getBarX(d.month) + barW / 2}
            y={svgH - mb + 16}
            textAnchor="middle"
            fontSize={11}
            fill="#6B7280"
          >
            {d.month}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 px-1">
        {vendors.map((v, i) => (
          <div key={v} className={`flex items-center gap-1.5 transition-opacity ${selectedVendor && selectedVendor !== v ? 'opacity-30' : ''}`}>
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: VENDOR_COLORS[i % VENDOR_COLORS.length], opacity: 0.87 }}
            />
            <span className="text-xs text-gray-600">{v}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <svg width="22" height="12" className="flex-shrink-0" overflow="visible">
            <line x1="0" y1="6" x2="22" y2="6" stroke="#059669" strokeWidth="2.5" />
            <circle cx="11" cy="6" r="3.5" fill="white" stroke="#059669" strokeWidth="2" />
          </svg>
          <span className="text-xs text-gray-600">Net Profit</span>
        </div>
      </div>
    </div>
  )
}
