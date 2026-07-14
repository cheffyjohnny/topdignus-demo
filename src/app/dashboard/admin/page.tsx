'use client'

import { useState } from 'react'

type EcountAction = 'sale_order' | 'purchase' | 'sale'
type QuoteType = 'pipe' | 'duct'
type ResultState = { ok: boolean; message: string } | null

const ECOUNT_ACTIONS: { action: EcountAction; label: string; desc: string; color: string }[] = [
  { action: 'sale_order', label: 'Order Entry',  desc: 'SaleOrder/SaveSaleOrder',   color: 'text-blue-700 border-blue-300 hover:bg-blue-50' },
  { action: 'purchase',   label: 'Purchase Entry',     desc: 'Purchases/SavePurchases',    color: 'text-orange-700 border-orange-300 hover:bg-orange-50' },
  { action: 'sale',       label: 'Sale Entry',     desc: 'Sale/SaveSale',              color: 'text-green-700 border-green-300 hover:bg-green-50' },
]

const CRAWL_SOURCES: { source: string; label: string; desc: string }[] = [
  { source: 'kict',  label: 'KICT',   desc: 'KICT fire-resistant filling certifications' },
  { source: 'law',   label: 'Legislation', desc: 'Laws such as Building Act, fire/evacuation structure rules' },
  { source: 'kfi',   label: 'KFI',    desc: 'Fire blanket performance certification (manual only)' },
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
    if (!orderNo.trim()) { setEcountResult({ ok: false, message: 'Please enter an order number.' }); return }
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
        setEcountResult({ ok: false, message: data.error ?? 'Unknown error' })
      }
    } catch (e: any) {
      setEcountResult({ ok: false, message: e.message ?? 'Network error' })
    } finally {
      setEcountLoading(null)
    }
  }

  async function callEcountQuote() {
    if (!quoteId.trim()) { setQuoteResult({ ok: false, message: 'Please enter a quote ID.' }); return }
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
        setQuoteResult({ ok: false, message: data.error ?? 'Unknown error' })
      }
    } catch (e: any) {
      setQuoteResult({ ok: false, message: e.message ?? 'Network error' })
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
        setCrawlResult({ ok: true, message: `${source.toUpperCase()} complete — collected ${data.newItems ?? 0} new item(s)` })
      } else {
        setCrawlResult({ ok: false, message: data.error ?? `${source} failed to run` })
      }
    } catch (e: any) {
      setCrawlResult({ ok: false, message: e.message ?? 'Network error' })
    } finally {
      setCrawlLoading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Admin Tools</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manual API calls and reprocessing</p>
      </div>

      {/* ECOUNT reprocessing */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">ECOUNT Reprocessing — Pipe/Duct/Fire Blanket Orders</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Order Number</label>
            <input
              type="text"
              value={orderNo}
              onChange={e => { setOrderNo(e.target.value); setEcountResult(null) }}
              placeholder="e.g. 6-2"
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] w-48"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Select Action</label>
            <div className="grid grid-cols-3 gap-2">
              {ECOUNT_ACTIONS.map(({ action, label, desc, color }) => (
                <button key={action} onClick={() => callEcount(action)}
                  disabled={!!ecountLoading}
                  className={`flex flex-col items-start w-full px-4 py-2.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-40 ${color}`}>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs opacity-60 mt-0.5">{desc}</span>
                  {ecountLoading === action && (
                    <span className="text-xs mt-0.5 font-medium">Sending...</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <ResultBadge result={ecountResult} />
        </div>
      </div>

      {/* ECOUNT quote reprocessing */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-purple-500" />
          <h2 className="font-semibold text-gray-800 text-sm">ECOUNT Reprocessing — Quotes</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-400">Enter the last UUID from the quote detail page URL. (e.g. /dashboard/pipe-quotes/<strong>abc-123...</strong>)</p>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
              <select
                value={quoteType}
                onChange={e => { setQuoteType(e.target.value as QuoteType); setQuoteResult(null) }}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] bg-white cursor-pointer"
              >
                <option value="pipe">Pipe Quote</option>
                <option value="duct">Duct Quote</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Quote ID (UUID)</label>
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
            <span className="text-sm font-semibold">{quoteLoading ? 'Sending...' : 'Register Quote'}</span>
            <span className="text-xs opacity-60 mt-0.5">Quotation/SaveQuotation</span>
          </button>
          <ResultBadge result={quoteResult} />
        </div>
      </div>

      {/* Manual crawler run */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Manual Crawler Run</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            {CRAWL_SOURCES.map(({ source, label, desc }) => (
              <button key={source} onClick={() => runCrawl(source)}
                disabled={!!crawlLoading}
                className="flex flex-col items-start px-4 py-2.5 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40">
                <span className="text-sm font-semibold text-gray-700">
                  {crawlLoading === source ? 'Running...' : label}
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
