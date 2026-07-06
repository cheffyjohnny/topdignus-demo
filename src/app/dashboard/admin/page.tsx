'use client'

import { useState } from 'react'

type EcountAction = 'sale_order' | 'purchase' | 'sale'
type QuoteType = 'pipe' | 'duct'
type ResultState = { ok: boolean; message: string } | null

const ECOUNT_ACTIONS: { action: EcountAction; label: string; desc: string; color: string }[] = [
  { action: 'sale_order', label: '주문서 입력',  desc: 'SaleOrder/SaveSaleOrder',   color: 'text-blue-700 border-blue-300 hover:bg-blue-50' },
  { action: 'purchase',   label: '구매입력',     desc: 'Purchases/SavePurchases',    color: 'text-orange-700 border-orange-300 hover:bg-orange-50' },
  { action: 'sale',       label: '판매입력',     desc: 'Sale/SaveSale',              color: 'text-green-700 border-green-300 hover:bg-green-50' },
]

const CRAWL_SOURCES: { source: string; label: string; desc: string }[] = [
  { source: 'kict',  label: 'KICT',   desc: '건기원 내화채움구조 인정서' },
  { source: 'law',   label: '법제처', desc: '건축법·피난방화규칙 등 법령' },
  { source: 'kfi',   label: 'KFI',    desc: '방화포 성능인증 (수동 전용)' },
]

function ResultBadge({ result }: { result: ResultState }) {
  if (!result) return null
  return (
    <div className={`mt-3 px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${result.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
      <span className="text-base leading-none mt-0.5">{result.ok ? '✓' : '✕'}</span>
      <span>{result.message}</span>
    </div>
  )
}

export default function AdminPage() {
  const [orderNo, setOrderNo]       = useState('')
  const [ecountLoading, setEcountLoading] = useState<EcountAction | null>(null)
  const [ecountResult, setEcountResult]   = useState<ResultState>(null)

  const [quoteId, setQuoteId]         = useState('')
  const [quoteType, setQuoteType]     = useState<QuoteType>('pipe')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteResult, setQuoteResult]   = useState<ResultState>(null)

  const [crawlLoading, setCrawlLoading] = useState<string | null>(null)
  const [crawlResult, setCrawlResult]   = useState<ResultState>(null)

  async function callEcount(action: EcountAction) {
    if (!orderNo.trim()) { setEcountResult({ ok: false, message: '수주서 번호를 입력하세요.' }); return }
    setEcountLoading(action)
    setEcountResult(null)
    try {
      const res = await fetch('/api/admin/ecount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_no: orderNo.trim(), action }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setEcountResult({ ok: true, message: data.message })
      } else {
        setEcountResult({ ok: false, message: data.error ?? '알 수 없는 오류' })
      }
    } catch (e: any) {
      setEcountResult({ ok: false, message: e.message ?? '네트워크 오류' })
    } finally {
      setEcountLoading(null)
    }
  }

  async function callEcountQuote() {
    if (!quoteId.trim()) { setQuoteResult({ ok: false, message: '견적서 ID를 입력하세요.' }); return }
    setQuoteLoading(true)
    setQuoteResult(null)
    try {
      const res = await fetch('/api/admin/ecount-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId.trim(), quote_type: quoteType }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setQuoteResult({ ok: true, message: data.message })
      } else {
        setQuoteResult({ ok: false, message: data.error ?? '알 수 없는 오류' })
      }
    } catch (e: any) {
      setQuoteResult({ ok: false, message: e.message ?? '네트워크 오류' })
    } finally {
      setQuoteLoading(false)
    }
  }

  async function runCrawl(source: string) {
    setCrawlLoading(source)
    setCrawlResult(null)
    try {
      const res = await fetch(`/api/crawl?source=${source}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCrawlResult({ ok: true, message: `${source.toUpperCase()} 완료 — 신규 ${data.newItems ?? 0}건 수집` })
      } else {
        setCrawlResult({ ok: false, message: data.error ?? `${source} 실행 실패` })
      }
    } catch (e: any) {
      setCrawlResult({ ok: false, message: e.message ?? '네트워크 오류' })
    } finally {
      setCrawlLoading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-gray-900">관리자 도구</h1>
        <p className="text-sm text-gray-400 mt-0.5">API 수동 호출 및 재처리</p>
      </div>

      {/* ECOUNT 재처리 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">ECOUNT 재처리 — 배관·덕트·방화포 수주서</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">수주서 번호</label>
            <input
              type="text"
              value={orderNo}
              onChange={e => { setOrderNo(e.target.value); setEcountResult(null) }}
              placeholder="예: 6-2"
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] w-48"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">액션 선택</label>
            <div className="grid grid-cols-3 gap-2">
              {ECOUNT_ACTIONS.map(({ action, label, desc, color }) => (
                <button key={action} onClick={() => callEcount(action)}
                  disabled={!!ecountLoading}
                  className={`flex flex-col items-start w-full px-4 py-2.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-40 ${color}`}>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs opacity-60 mt-0.5">{desc}</span>
                  {ecountLoading === action && (
                    <span className="text-xs mt-0.5 font-medium">전송 중...</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <ResultBadge result={ecountResult} />
        </div>
      </div>

      {/* ECOUNT 견적서 재처리 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-purple-500" />
          <h2 className="font-semibold text-gray-800 text-sm">ECOUNT 재처리 — 견적서</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-400">견적서 상세 페이지 URL의 마지막 UUID를 입력하세요. (예: /dashboard/pipe-quotes/<strong>abc-123...</strong>)</p>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">유형</label>
              <select
                value={quoteType}
                onChange={e => { setQuoteType(e.target.value as QuoteType); setQuoteResult(null) }}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] bg-white cursor-pointer"
              >
                <option value="pipe">배관 견적서</option>
                <option value="duct">덕트 견적서</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">견적서 ID (UUID)</label>
              <input
                type="text"
                value={quoteId}
                onChange={e => { setQuoteId(e.target.value); setQuoteResult(null) }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] w-full font-mono"
              />
            </div>
          </div>
          <button
            onClick={callEcountQuote}
            disabled={quoteLoading}
            className="flex flex-col items-start px-4 py-2.5 rounded-lg border border-purple-300 text-left text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer disabled:opacity-40"
          >
            <span className="text-sm font-semibold">{quoteLoading ? '전송 중...' : '견적서 등록'}</span>
            <span className="text-xs opacity-60 mt-0.5">Quotation/SaveQuotation</span>
          </button>
          <ResultBadge result={quoteResult} />
        </div>
      </div>

      {/* 크롤러 수동 실행 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">크롤러 수동 실행</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            {CRAWL_SOURCES.map(({ source, label, desc }) => (
              <button key={source} onClick={() => runCrawl(source)}
                disabled={!!crawlLoading}
                className="flex flex-col items-start px-4 py-2.5 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40">
                <span className="text-sm font-semibold text-gray-700">
                  {crawlLoading === source ? '실행 중...' : label}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{desc}</span>
              </button>
            ))}
          </div>
          <ResultBadge result={crawlResult} />
        </div>
      </div>
    </div>
  )
}
