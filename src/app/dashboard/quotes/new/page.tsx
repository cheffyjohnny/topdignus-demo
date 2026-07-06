'use client'

import { useRouter } from 'next/navigation'

export default function NewQuotePage() {
  const router = useRouter()

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">견적서 작성</h1>
        <p className="text-sm text-gray-500 mt-0.5">품목 유형을 선택해 주세요.</p>
      </div>
      <div className="flex flex-col gap-3 max-w-lg">
        <button
          onClick={() => router.push('/dashboard/pipe-quotes/new')}
          className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-blue-300 bg-blue-200 hover:border-blue-500 hover:bg-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
        >
          <div>
            <p className="text-lg font-bold text-blue-800">배관</p>
            <p className="text-sm text-blue-700">배관 고정구 견적서</p>
          </div>
          <svg className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button
          onClick={() => router.push('/dashboard/duct-quotes/new')}
          className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-orange-300 bg-orange-200 hover:border-orange-500 hover:bg-orange-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
        >
          <div>
            <p className="text-lg font-bold text-orange-800">사각덕트</p>
            <p className="text-sm text-orange-700">사각덕트 견적서</p>
          </div>
          <svg className="w-4 h-4 text-orange-500 group-hover:text-orange-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button
          onClick={() => router.push('/dashboard/quotes/groups/new')}
          className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-purple-300 bg-purple-200 hover:border-purple-500 hover:bg-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
        >
          <div>
            <p className="text-lg font-bold text-purple-800">배관 + 사각덕트</p>
            <p className="text-sm text-purple-700">복합 견적서 (탭 구성)</p>
          </div>
          <svg className="w-4 h-4 text-purple-500 group-hover:text-purple-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <button
          onClick={() => router.push('/dashboard/fire-blanket-quotes/new')}
          className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-red-300 bg-red-200 hover:border-red-500 hover:bg-red-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
        >
          <div>
            <p className="text-lg font-bold text-red-800">방화포</p>
            <p className="text-sm text-red-700">방화포 견적서</p>
          </div>
          <svg className="w-4 h-4 text-red-500 group-hover:text-red-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
