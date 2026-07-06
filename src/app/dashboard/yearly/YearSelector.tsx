'use client'
import { useRouter } from 'next/navigation'

export function YearSelector({ year }: { year: number }) {
  const router = useRouter()
  const go = (delta: number) => router.push(`/dashboard/yearly?year=${year + delta}`)

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(-1)}
        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-gray-700 tabular-nums w-14 text-center">
        {year}년
      </span>
      <button
        onClick={() => go(1)}
        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        ›
      </button>
    </div>
  )
}
