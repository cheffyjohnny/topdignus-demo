'use client'

import { useRouter } from 'next/navigation'

interface Props {
  year: number
  month: number
}

export function MonthSelector({ year, month }: Props) {
  const router = useRouter()

  function go(y: number, m: number) {
    if (m < 1) { y--; m = 12 }
    if (m > 12) { y++; m = 1 }
    router.push(`/dashboard/monthly?year=${y}&month=${m}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(year, month - 1)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
        aria-label="이전 달"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-lg font-bold text-gray-900 tabular-nums w-32 text-center">
        {year}년 {month}월
      </span>
      <button
        onClick={() => go(year, month + 1)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
        aria-label="다음 달"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
