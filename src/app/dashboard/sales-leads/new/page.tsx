'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-toastify'

interface FormData {
  dealership: string
  project_name: string
  address: string
  scale: string
  notes: string
}

const EMPTY: FormData = {
  dealership: '',
  project_name: '',
  address: '',
  scale: '',
  notes: '',
}

function SalesLeadsNewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = searchParams.get('step')

  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [accountId, setAccountId] = useState<string>('')

  useEffect(() => {
    if (step !== 'form') return
    fetch('/api/sales-accounts')
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [step])

  function setField(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleAnalyze() {
    if (!url.trim()) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setAnalyzeError(data.error ?? '알 수 없는 오류'); return }
      const r = data.result ?? {}
      setForm({
        dealership: r['대리점'] ?? '',
        project_name: r['현장명'] ?? '',
        address: r['주소'] ?? '',
        scale: r['규모'] ?? '',
        notes: r['비고'] ?? '',
      })
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : '오류 발생')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/sales-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source_url: url.trim() || null,
          account_id: accountId || null,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? '저장 실패'); return }
      toast.success('영업현장이 추가되었습니다.')
      router.push(`/dashboard/sales-leads/${d.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 유형 선택 화면
  if (step !== 'form') {
    return (
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">영업 추가</h1>
          <p className="text-sm text-gray-500 mt-0.5">추가할 유형을 선택해 주세요.</p>
        </div>
        <div className="flex flex-col gap-3 max-w-lg">
          <button
            onClick={() => router.push('/dashboard/sales-leads/new?step=form')}
            className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-blue-300 bg-blue-200 hover:border-blue-500 hover:bg-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
          >
            <div>
              <p className="text-lg font-bold text-blue-900">영업 현장</p>
              <p className="text-sm text-blue-700">현장명·주소·시공사·진행상태 등 현장 정보 등록</p>
            </div>
            <svg className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            onClick={() => router.push('/dashboard/sales-accounts/new')}
            className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-green-300 bg-green-200 hover:border-green-500 hover:bg-green-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left"
          >
            <div>
              <p className="text-lg font-bold text-green-900">영업 거래처</p>
              <p className="text-sm text-green-700">시공사·담당자·연락처 등 거래처 정보 등록</p>
            </div>
            <svg className="w-4 h-4 text-green-500 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    )
  }

  // 영업 현장 입력 폼
  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/sales-leads/new')}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            ← 뒤로
          </button>
          <h1 className="text-xl font-bold text-gray-900">영업 현장 추가</h1>
        </div>
      </div>

      {/* URL 분석 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">URL로 자동 채우기</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="기사 URL을 입력하면 아래 폼을 자동으로 채웁니다"
            className="flex-1 border border-blue-300 bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !url.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            {analyzing ? '분석 중...' : 'AI 분석'}
          </button>
        </div>
        {analyzeError && <p className="mt-2 text-xs text-red-600">{analyzeError}</p>}
      </div>

      {/* 수기 입력 폼 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">대리점</label>
            <input
              value={form.dealership}
              onChange={e => setField('dealership', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">현장명</label>
            <input
              value={form.project_name}
              onChange={e => setField('project_name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
          <input
            value={form.address}
            onChange={e => setField('address', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">시공사</label>
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
          >
            <option value="">— 선택 —</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {accounts.length === 0 && (
            <p className="mt-1 text-xs text-gray-400">
              등록된 거래처가 없습니다.{' '}
              <button onClick={() => router.push('/dashboard/sales-accounts/new')} className="text-green-600 hover:underline cursor-pointer">
                거래처 추가하기 →
              </button>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">규모</label>
          <input
            value={form.scale}
            onChange={e => setField('scale', e.target.value)}
            placeholder="예: 지하3층~지상20층"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">비고</label>
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={() => router.push('/dashboard/sales-leads')}
          className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
        >
          취소
        </button>
      </div>
    </div>
  )
}

export default function SalesLeadsNewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">불러오는 중...</div>}>
      <SalesLeadsNewContent />
    </Suspense>
  )
}
