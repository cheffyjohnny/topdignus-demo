'use client'

import { useRouter } from 'next/navigation'

interface Props {
  from: string  // YYYY-MM-DD (Monday)
  to: string    // YYYY-MM-DD (Sunday)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtRange(from: string, to: string): string {
  const f = new Date(from)
  const t = new Date(to)
  const fYear = f.getFullYear(), fMonth = f.getMonth() + 1, fDay = f.getDate()
  const tYear = t.getFullYear(), tMonth = t.getMonth() + 1, tDay = t.getDate()
  if (fYear === tYear && fMonth === tMonth) return `${fMonth}/${fDay} – ${tDay}, ${fYear}`
  if (fYear === tYear) return `${fMonth}/${fDay} – ${tMonth}/${tDay}, ${fYear}`
  return `${fMonth}/${fDay}/${fYear} – ${tMonth}/${tDay}/${tYear}`
}

export function WeekSelector({ from, to }: Props) {
  const router = useRouter()
  const prevFrom = addDays(from, -7)
  const prevTo   = addDays(to,   -7)
  const nextFrom = addDays(from,  7)
  const nextTo   = addDays(to,    7)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push(`/dashboard/weekly?from=${prevFrom}&to=${prevTo}`)}
        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-gray-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm font-medium text-gray-700 min-w-[240px] text-center">
        {fmtRange(from, to)}
      </span>
      <button
        onClick={() => router.push(`/dashboard/weekly?from=${nextFrom}&to=${nextTo}`)}
        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-gray-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
