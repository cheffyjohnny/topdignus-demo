'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-toastify'
import type { QuoteType } from './QuoteFormPage'
import { statusLabel, QUOTE_STATUS_LABEL } from '@/lib/status-labels'

type QuoteStatus = '검토중' | '검토완료' | '송부완료' | '수주확정' | '취소'

interface Quote {
  id: string
  quote_no?: string | null
  vendor: string           // normalized: pipe.vendor / duct.customer_name
  manufacturer: string
  project: string | null
  order_date: string | null
  delivery_date: string | null   // 유효기간
  author: string | null
  notes: string | null
  items: any[]
  status: QuoteStatus
  status_history: { type: string; value: string; at: string }[]
  image_url: string | null
  file_urls?: string[] | null
  converted_order_id?: string | null
  converted_duct_order_id?: string | null
  created_at: string
}

const STATUS_COLORS: Record<QuoteStatus, string> = {
  '검토중':   'bg-amber-50 text-amber-700 border-amber-200',
  '검토완료': 'bg-blue-50 text-blue-700 border-blue-200',
  '송부완료': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '수주확정': 'bg-green-50 text-green-700 border-green-200',
  '취소':     'bg-gray-50 text-gray-500 border-gray-200',
}

const INPUT_CLS = 'border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] transition-colors w-full'
const DUCT_COL_DEFAULTS: Record<string,number> = { name:120, w:72, h:72, peri:64, qty:48, price:88, amount:96, note:80 }
const DUCT_COL_KEY = 'quote_duct_detail_col_widths'

export default function QuoteDetailPage({ type }: { type: QuoteType }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const backUrl = searchParams.get('from') ?? '/dashboard/quotes'
  const apiBase = type === 'pipe' ? '/api/pipe-quotes' : '/api/duct-quotes'

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Quote>>({})
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [ductColW, setDuctColW] = useState<Record<string,number>>(() => {
    try { const s = JSON.parse(localStorage.getItem(DUCT_COL_KEY) ?? 'null'); return s ? {...DUCT_COL_DEFAULTS,...s} : DUCT_COL_DEFAULTS } catch { return DUCT_COL_DEFAULTS }
  })

  function rhDuct(col: string) {
    return (
      <div className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none group-hover/th:bg-blue-200/50 hover:!bg-blue-400/60 z-10"
        onPointerDown={e => {
          e.preventDefault(); e.stopPropagation()
          const el = e.currentTarget; el.setPointerCapture(e.pointerId)
          const sx = e.clientX, sw = ductColW[col] ?? DUCT_COL_DEFAULTS[col] ?? 72
          function onMove(ev: PointerEvent) { setDuctColW(prev => ({ ...prev, [col]: Math.max(40, sw + ev.clientX - sx) })) }
          function onUp() {
            el.releasePointerCapture(e.pointerId)
            el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp)
            setDuctColW(prev => { try { localStorage.setItem(DUCT_COL_KEY, JSON.stringify(prev)) } catch {} ; return prev })
          }
          el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp)
        }} />
    )
  }

  useEffect(() => {
    const pending = sessionStorage.getItem('quote_toast')
    if (pending) {
      sessionStorage.removeItem('quote_toast')
      try {
        const { msg, ecount, ecountError } = JSON.parse(pending)
        toast.success(msg)
        if (ecount === 'ok') toast.success('[ECOUNT] Quote registered')
        else if (ecount === 'skipped') toast.info('Skipped ECOUNT registration — no matching item code.')
        else if (ecount === 'fail') toast.error(`[ECOUNT] Quote registration failed${ecountError ? `\n${ecountError}` : ''}`, { autoClose: false })
      } catch {}
    }

    fetch(`${apiBase}/${id}`)
      .then(r => r.json())
      .then((raw: any) => {
        const normalized: Quote = type === 'duct'
          ? { ...raw, vendor: raw.customer_name ?? raw.vendor ?? '' }
          : raw
        setQuote(normalized)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, apiBase, type])

  function startEdit() {
    if (!quote) return
    setEditData({
      vendor: quote.vendor,
      manufacturer: quote.manufacturer,
      project: quote.project,
      order_date: quote.order_date,
      delivery_date: quote.delivery_date,
      author: quote.author,
      notes: quote.notes,
    })
    setEditMode(true)
  }

  async function saveEdit() {
    if (!quote) return
    setSaving(true)
    const payload: any = { _full: true, ...editData }
    if (type === 'duct') payload.customer_name = editData.vendor
    const res = await fetch(`${apiBase}/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (res.ok) {
      setQuote(prev => prev ? { ...prev, ...editData } : prev)
      setEditMode(false)
      toast.success('Quote saved.')
    } else {
      toast.error('An error occurred while saving.')
    }
    setSaving(false)
  }

  async function changeStatus(status: QuoteStatus) {
    if (!quote || status === quote.status) return
    setStatusSaving(true)
    const res = await fetch(`${apiBase}/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setQuote(prev => prev ? {
        ...prev, status,
        status_history: [...(prev.status_history ?? []), { type: 'status', value: status, at: new Date().toISOString() }],
      } : prev)
      toast.success(`Changed to "${statusLabel(status, QUOTE_STATUS_LABEL)}".`)
    } else {
      toast.error('An error occurred while changing status.')
    }
    setStatusSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
    router.push(backUrl)
  }

  async function handleDownloadExcel(mfr?: string) {
    if (!quote) return
    setDownloading(true)
    try {
      let url = `${apiBase}/${id}/excel`
      if (type === 'pipe' && mfr) url += `?manufacturer=${encodeURIComponent(mfr)}`
      const res = await fetch(url)
      if (!res.ok) { toast.error('Failed to generate Excel'); return }
      const blob = await res.blob()
      const match = res.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''(.+)/)
      const filename = match ? decodeURIComponent(match[1]) : 'quote.xlsx'
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = objUrl; a.download = filename; a.click(); URL.revokeObjectURL(objUrl)
    } finally { setDownloading(false) }
  }

  function handleGoToConvert() {
    if (!quote) return
    if (type === 'pipe') {
      sessionStorage.setItem('order_prefill', JSON.stringify({
        from_quote_id: id,
        vendor: quote.vendor,
        manufacturer: quote.manufacturer,
        project: quote.project ?? '',
        author: quote.author ?? '',
        notes: quote.notes ?? '',
        items: quote.items ?? [],
      }))
      router.push('/dashboard/orders/new?step=form')
    } else {
      sessionStorage.setItem('duct_order_prefill', JSON.stringify({
        from_quote_id: id,
        customerName: quote.vendor,
        manufacturer: quote.manufacturer,
        project: quote.project ?? '',
        author: quote.author ?? '',
        notes: quote.notes ?? '',
        items: quote.items ?? [],
      }))
      router.push('/dashboard/duct-orders/new?step=form')
    }
  }

  if (loading) return <div className="text-center py-20 text-sm text-gray-400">Loading...</div>
  if (!quote) return <div className="text-center py-20 text-sm text-red-400">Quote not found.</div>

  const convertedId = type === 'pipe' ? quote.converted_order_id : quote.converted_duct_order_id
  const convertedPath = type === 'pipe' ? `/dashboard/orders/${convertedId}` : `/dashboard/duct-orders/${convertedId}`
  const ed = (field: keyof Quote) => editMode ? (editData[field] as string ?? '') : (quote[field] as string ?? '')

  // Pipe: manufacturer list
  const pipeMfrs = type === 'pipe'
    ? [...new Set((quote.items ?? []).map((it: any) => it.manufacturer).filter(Boolean))] as string[]
    : []

  // Duct: separate regular items vs heat insulator
  const ductRegular = type === 'duct' ? (quote.items ?? []).filter((it: any) => it.type !== '차열재') : []
  const ductInsul   = type === 'duct' ? (quote.items ?? []).filter((it: any) => it.type === '차열재') : []
  const ductTotal   = ductRegular.reduce((s: number, it: any) => s + (it.amount ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(backUrl)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{type === 'pipe' ? 'Pipe' : 'Duct'} Quote Details</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[quote.status]}`}>{statusLabel(quote.status, QUOTE_STATUS_LABEL)}</span>
              {quote.quote_no && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{quote.quote_no}</span>}
              <span className="text-xs text-gray-400">{quote.created_at?.slice(0, 10)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!convertedId && quote.status !== '취소' && quote.status !== '수주확정' && (
            <button onClick={() => setShowConvertModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              Convert to Order
            </button>
          )}
          {convertedId && (
            <button onClick={() => router.push(convertedPath)} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer">View Order</button>
          )}
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer" style={{ backgroundColor: '#014A99' }}>{saving ? 'Saving...' : 'Save'}</button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" /></svg>
                Edit
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="p-2 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status change */}
      <div className="bg-white rounded-lg border border-gray-200 px-5 py-3.5 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-500">Change Status</span>
        <div className="flex items-center gap-2">
          {(['검토중', '검토완료', '송부완료', '수주확정', '취소'] as QuoteStatus[]).map(s => (
            <button key={s} onClick={() => changeStatus(s)} disabled={statusSaving || quote.status === s}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer disabled:cursor-default ${quote.status === s ? STATUS_COLORS[s] + ' cursor-default' : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'}`}>
              {statusLabel(s, QUOTE_STATUS_LABEL)}
            </button>
          ))}
        </div>
        {statusSaving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>

      {/* Quote info */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">Quote Info</h2>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoField label="Requesting Party" editMode={editMode}>
            {editMode
              ? <input value={ed('vendor')} onChange={e => setEditData(p => ({ ...p, vendor: e.target.value }))} className={INPUT_CLS} />
              : <span>{quote.vendor}</span>}
          </InfoField>
          <InfoField label="Manufacturer" editMode={editMode}>
            {editMode
              ? <input value={ed('manufacturer')} onChange={e => setEditData(p => ({ ...p, manufacturer: e.target.value }))} className={INPUT_CLS} />
              : <span>{quote.manufacturer || '-'}</span>}
          </InfoField>
          <InfoField label="Project" editMode={editMode}>
            {editMode
              ? <input value={ed('project')} onChange={e => setEditData(p => ({ ...p, project: e.target.value }))} className={INPUT_CLS} />
              : <span>{quote.project || '-'}</span>}
          </InfoField>
          <InfoField label="Date Created" editMode={editMode}>
            {editMode
              ? <input type="date" value={ed('order_date')} onChange={e => setEditData(p => ({ ...p, order_date: e.target.value }))} className={INPUT_CLS} />
              : <span>{quote.order_date?.slice(0, 10) || '-'}</span>}
          </InfoField>
          <InfoField label="Valid Until" editMode={editMode}>
            {editMode
              ? <input type="date" value={ed('delivery_date')} onChange={e => setEditData(p => ({ ...p, delivery_date: e.target.value }))} className={INPUT_CLS} />
              : <span>{quote.delivery_date?.slice(0, 10) || '-'}</span>}
          </InfoField>
          <InfoField label="Author" editMode={editMode}>
            {editMode
              ? <select value={ed('author')} onChange={e => setEditData(p => ({ ...p, author: e.target.value }))} className={INPUT_CLS}>
                  <option value="">-- Select --</option>
                  {['John Lee', 'Sarah Kim', 'Tom Choi', 'Anna Min'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              : <span>{quote.author || '-'}</span>}
          </InfoField>
          <InfoField label="Notes" className="col-span-2" editMode={editMode}>
            {editMode
              ? <textarea value={ed('notes')} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={3} className={INPUT_CLS + ' resize-y'} />
              : <span className="whitespace-pre-wrap">{quote.notes || '-'}</span>}
          </InfoField>
        </div>
      </div>

      {/* Attachments */}
      {(() => {
        const effectiveUrls = (quote.file_urls && quote.file_urls.length > 0)
          ? quote.file_urls
          : quote.image_url ? [quote.image_url] : []
        if (effectiveUrls.length === 0) return null
        return (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
              <h2 className="font-semibold text-gray-800 text-sm">Attachments <span className="text-gray-400 font-normal text-xs">({effectiveUrls.length})</span></h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {effectiveUrls.map((url, i) => {
                const hash = url.split('#')[1] ?? ''; const cleanUrl = url.split('#')[0]
                const fname = hash.startsWith('name=') ? decodeURIComponent(hash.slice(5)) : decodeURIComponent(cleanUrl.split('/').pop()?.split('?')[0] ?? '').replace(/^\d{13}\./, '')
                const lower = fname.toLowerCase()
                const isImg = /\.(jpe?g|png|gif|webp|bmp|svg)$/.test(lower)
                const isPdf = /\.pdf$/.test(lower)
                const isExcel = /\.(xlsx?|csv)$/.test(lower)
                const iconColor = isPdf ? 'text-red-400' : isExcel ? 'text-green-500' : isImg ? 'text-blue-400' : 'text-gray-400'
                const badge = isPdf ? 'PDF' : isExcel ? 'Excel' : isImg ? 'Image' : 'File'
                const badgeColor = isPdf ? 'bg-red-50 text-red-500' : isExcel ? 'bg-green-50 text-green-600' : isImg ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                return (
                  <li key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <svg className={`w-5 h-5 shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 text-sm text-gray-700 truncate">{fname}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${badgeColor}`}>{badge}</span>
                    <a href={isImg ? cleanUrl : `/api/download?url=${encodeURIComponent(cleanUrl)}&name=${encodeURIComponent(fname)}`}
                      target={isImg ? '_blank' : '_self'} rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 hover:underline shrink-0">{isImg ? 'Open' : 'Download'}</a>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })()}

      {/* Item list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">Item List</h2>
          <span className="text-xs text-gray-400 ml-auto">{type === 'pipe' ? (quote.items?.length ?? 0) : ductRegular.length}</span>
        </div>

        {type === 'pipe' ? (
          quote.items && quote.items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100"><tr>
                    <th className="px-4 py-2.5 text-left w-10">No.</th>
                    <th className="px-4 py-2.5 text-left w-24">Manufacturer</th>
                    <th className="px-4 py-2.5 text-left">Item</th>
                    <th className="px-4 py-2.5 text-left">Spec</th>
                    <th className="px-4 py-2.5 text-right w-16">Qty</th>
                    <th className="px-4 py-2.5 text-left w-40">Internal Name</th>
                    <th className="px-4 py-2.5 text-right w-24">Sale Price</th>
                    <th className="px-4 py-2.5 text-right w-28">Supply Amt</th>
                    <th className="px-4 py-2.5 text-left">Note</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {quote.items.map((item: any, i: number) => {
                      const sa = item.unitPrice != null ? item.unitPrice * item.quantity : undefined
                      return (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-400 text-xs text-center">{i+1}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{item.manufacturer || '-'}</td>
                          <td className="px-4 py-2.5">{item.name || item.displayName || item.internalName || '-'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{item.spec || '-'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity ?? '-'}</td>
                          <td className="px-4 py-2.5 text-xs">
                            {item.internalName && <span className="font-medium text-[#014A99]">{item.internalName}</span>}
                            {item.pipeSpec && <span className="text-gray-400 ml-1">{item.pipeSpec}{item.sleeveSpec ? `×${item.sleeveSpec}` : ''}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{item.unitPrice != null ? item.unitPrice.toLocaleString() : '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-800">{sa != null ? sa.toLocaleString() : '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{item.note || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {(() => {
                    const total = (quote.items ?? []).reduce((s: number, it: any) => it.unitPrice != null ? s + it.unitPrice * it.quantity : s, 0)
                    if (!total) return null
                    return <tfoot><tr className="bg-gray-50 border-t border-gray-200 font-semibold text-sm">
                      <td colSpan={7} className="px-4 py-2.5 text-right text-gray-500 text-xs">Total</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{total.toLocaleString()}</td>
                      <td />
                    </tr></tfoot>
                  })()}
                </table>
              </div>
              {pipeMfrs.length > 0 ? pipeMfrs.map(mfr => (
                <div key={mfr} className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400">{mfr}</span>
                  <button onClick={() => handleDownloadExcel(mfr)} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {downloading ? 'Generating...' : 'Excel'}
                  </button>
                </div>
              )) : (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
                  <button onClick={() => handleDownloadExcel()} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {downloading ? 'Generating...' : 'Download Excel'}
                  </button>
                </div>
              )}
            </>
          ) : <div className="px-5 py-8 text-center text-sm text-gray-400">No items</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100"><tr>
                  <th className="px-3 py-2.5 text-center w-10">No</th>
                  <th className="relative group/th px-3 py-2.5 text-center select-none" style={{width:ductColW.name}}>Item{rhDuct('name')}</th>
                  <th className="relative group/th px-3 py-2.5 text-right select-none" style={{width:ductColW.w}}>Width(mm){rhDuct('w')}</th>
                  <th className="relative group/th px-3 py-2.5 text-right select-none" style={{width:ductColW.h}}>Height(mm){rhDuct('h')}</th>
                  <th className="relative group/th px-3 py-2.5 text-right select-none" style={{width:ductColW.peri}}>M/pc{rhDuct('peri')}</th>
                  <th className="relative group/th px-3 py-2.5 text-right select-none" style={{width:ductColW.qty}}>Qty{rhDuct('qty')}</th>
                  <th className="relative group/th px-3 py-2.5 text-right select-none" style={{width:ductColW.price}}>Unit Price{rhDuct('price')}</th>
                  <th className="relative group/th px-3 py-2.5 text-right select-none" style={{width:ductColW.amount}}>Supply Amt{rhDuct('amount')}</th>
                  <th className="relative group/th px-3 py-2.5 text-left select-none" style={{width:ductColW.note}}>Note{rhDuct('note')}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {ductRegular.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">No items</td></tr>}
                  {ductRegular.map((it: any, i: number) => (
                    <tr key={i} className="bg-white">
                      <td className="px-3 py-2.5 text-gray-400 text-center">{i+1}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${it.type==='입상'?'bg-blue-50 text-blue-700':'bg-violet-50 text-violet-700'}`}>{it.type === '입상' ? 'Riser' : 'Wall'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{it.width ?? 0}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{it.height ?? 0}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{it.perimeter?.toFixed(2) ?? '0.00'}</td>
                      <td className="px-3 py-2.5 text-right">{it.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">{(it.unit_price ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{(it.amount ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs">{it.note || '—'}</td>
                    </tr>
                  ))}
                  {ductTotal > 0 && <tr className="bg-gray-50 font-semibold"><td colSpan={7} className="px-3 py-2.5 text-right text-xs text-gray-500">Total</td><td className="px-3 py-2.5 text-right tabular-nums text-gray-800">₩{ductTotal.toLocaleString()}</td><td /></tr>}
                </tbody>
              </table>
            </div>
            {/* Heat insulator */}
            {ductInsul.length > 0 && (
              <div className="border-t border-orange-100">
                <div className="px-4 py-2.5 bg-orange-50/70"><span className="text-xs font-semibold text-orange-700">Heat Insulator</span></div>
                <table className="w-full text-sm">
                  <thead className="bg-orange-50/50 text-xs text-orange-600 border-b border-orange-100"><tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-right w-28">Qty (rolls)</th>
                    <th className="px-3 py-2 text-right w-32">Unit Price</th>
                    <th className="px-3 py-2 text-right w-32">Amount</th>
                  </tr></thead>
                  <tbody>
                    {ductInsul.map((it: any, i: number) => (
                      <tr key={i} className="border-b border-orange-100">
                        <td className="px-4 py-2.5 text-orange-800 font-medium">{it.spec}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{it.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-orange-700 tabular-nums">{(it.unit_price ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-orange-800">{(it.amount ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          {/* Duct Excel download button */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
            <span className="text-xs text-gray-400">{quote.manufacturer || 'Duct'}</span>
            <button onClick={() => handleDownloadExcel()} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {downloading ? 'Generating...' : 'Download Excel'}
            </button>
          </div>
          </>
        )}
      </div>

      {/* Status history */}
      {quote.status_history && quote.status_history.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full flex-shrink-0 bg-gray-300" />
            <h2 className="font-semibold text-gray-800 text-sm">Status History</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {[...quote.status_history].reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[h.value as QuoteStatus] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>{statusLabel(h.value, QUOTE_STATUS_LABEL)}</span>
                <span className="text-gray-400 text-xs">{new Date(h.at).toLocaleString('en-US')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Convert to order modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></div>
              <div><p className="font-semibold text-gray-900">Convert to Order</p><p className="text-sm text-gray-500 mt-0.5">You&apos;ll be taken to the new order form.</p></div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
              <p><span className="text-gray-400 w-20 inline-block">Vendor</span><span className="font-medium">{quote.vendor}</span></p>
              <p><span className="text-gray-400 w-20 inline-block">Project</span>{quote.project || '-'}</p>
            </div>
            <p className="text-xs text-gray-400">Once the order is saved, this quote&apos;s status will automatically change to &apos;Confirmed&apos;.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConvertModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={handleGoToConvert} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">Go to Order Form</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
              <div><p className="font-semibold text-gray-900">Delete Quote</p><p className="text-sm text-gray-500">This cannot be undone.</p></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 cursor-pointer">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, className, editMode, children }: { label: string; className?: string; editMode: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-xs font-medium text-gray-400">{label}</span>
      {editMode ? children : <span className="text-sm text-gray-800">{children}</span>}
    </div>
  )
}
