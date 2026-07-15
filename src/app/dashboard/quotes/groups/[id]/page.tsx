'use client'

import { useState, useEffect } from 'react'
import type React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { statusLabel, QUOTE_STATUS_LABEL } from '@/lib/status-labels'

type QuoteStatus = '검토중' | '검토완료' | '송부완료' | '수주확정' | '취소'

interface SubQuote {
  id: string; manufacturer: string; status: QuoteStatus
  items: any[]; order_date?: string; delivery_date?: string; notes?: string
}

interface QuoteGroup {
  id: string; vendor: string; project?: string
  order_date?: string; author?: string; notes?: string; status: QuoteStatus
  status_history: { type: string; value: string; at: string }[]
  pipe_quotes: SubQuote[]; duct_quotes: SubQuote[]
}

const STATUS_COLORS: Record<QuoteStatus, string> = {
  '검토중':   'bg-amber-50 text-amber-700 border-amber-200',
  '검토완료': 'bg-blue-50 text-blue-700 border-blue-200',
  '송부완료': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '수주확정': 'bg-green-50 text-green-700 border-green-200',
  '취소':     'bg-gray-50 text-gray-500 border-gray-200',
}

function fmtDate(d?: string) { return d?.slice(0, 10) ?? '-' }

const PIPE_COL_DEFAULTS: Record<string,number> = { name:120, spec:80, qty:60, price:96, amount:96 }
const DUCT_COL_DEFAULTS: Record<string,number> = { type:64, w:72, h:72, qty:60, amount:96 }
const PIPE_COL_KEY = 'quote_group_pipe_col_widths'
const DUCT_COL_KEY = 'quote_group_duct_col_widths'

function makeRh(
  widths: Record<string,number>,
  setWidths: React.Dispatch<React.SetStateAction<Record<string,number>>>,
  defaults: Record<string,number>,
  storageKey: string,
) {
  return function rh(col: string) {
    return (
      <div className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none group-hover/th:bg-blue-200/50 hover:!bg-blue-400/60 z-10"
        onPointerDown={e => {
          e.preventDefault(); e.stopPropagation()
          const el = e.currentTarget; el.setPointerCapture(e.pointerId)
          const sx = e.clientX, sw = widths[col] ?? defaults[col] ?? 80
          function onMove(ev: PointerEvent) { setWidths(prev => ({ ...prev, [col]: Math.max(40, sw + ev.clientX - sx) })) }
          function onUp() {
            el.releasePointerCapture(e.pointerId)
            el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp)
            setWidths(prev => { try { localStorage.setItem(storageKey, JSON.stringify(prev)) } catch {} ; return prev })
          }
          el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp)
        }} />
    )
  }
}

export default function QuoteGroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [group, setGroup]           = useState<QuoteGroup | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<'배관' | '덕트'>('배관')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [pipeColW, setPipeColW] = useState<Record<string,number>>(() => {
    try { const s = JSON.parse(localStorage.getItem(PIPE_COL_KEY) ?? 'null'); return s ? {...PIPE_COL_DEFAULTS,...s} : PIPE_COL_DEFAULTS } catch { return PIPE_COL_DEFAULTS }
  })
  const [ductColW, setDuctColW] = useState<Record<string,number>>(() => {
    try { const s = JSON.parse(localStorage.getItem(DUCT_COL_KEY) ?? 'null'); return s ? {...DUCT_COL_DEFAULTS,...s} : DUCT_COL_DEFAULTS } catch { return DUCT_COL_DEFAULTS }
  })
  const rhPipe = makeRh(pipeColW, setPipeColW, PIPE_COL_DEFAULTS, PIPE_COL_KEY)
  const rhDuct = makeRh(ductColW, setDuctColW, DUCT_COL_DEFAULTS, DUCT_COL_KEY)

  useEffect(() => {
    fetch(`/api/quote-groups/${id}`)
      .then(r => r.json())
      .then(d => { setGroup(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/quote-groups/${id}`, { method: 'DELETE' })
    toast.success('Group quote deleted.')
    router.push('/dashboard/quotes')
  }

  if (loading) return <div className="text-center py-20 text-sm text-gray-400">Loading...</div>
  if (!group)  return <div className="text-center py-20 text-sm text-red-400">Group quote not found.</div>

  const allSubs = [...group.pipe_quotes, ...group.duct_quotes]
  const activeSubs = activeTab === '배관' ? group.pipe_quotes : group.duct_quotes

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/quotes')} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Combined Quote</h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">Pipe+Duct</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{group.vendor} · {group.project || 'No project name'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDelete(true)} className="p-2 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-purple-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Quote Info</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400 text-xs block mb-0.5">Requesting Party</span><span className="font-medium">{group.vendor}</span></div>
          <div><span className="text-gray-400 text-xs block mb-0.5">Project</span><span>{group.project || '-'}</span></div>
          <div><span className="text-gray-400 text-xs block mb-0.5">Date</span><span>{fmtDate(group.order_date)}</span></div>
          <div><span className="text-gray-400 text-xs block mb-0.5">Author</span><span>{group.author || '-'}</span></div>
          {group.notes && <div className="col-span-2"><span className="text-gray-400 text-xs block mb-0.5">Notes</span><span className="whitespace-pre-wrap">{group.notes}</span></div>}
        </div>
      </div>

      {/* Sub-quote status summary */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-purple-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Sub-Quotes</h2>
          <span className="text-xs text-gray-400 ml-auto">{allSubs.length}</span>
        </div>
        <div className="p-4 flex flex-wrap gap-3">
          {group.pipe_quotes.map(sub => (
            <button key={sub.id} onClick={() => router.push(`/dashboard/pipe-quotes/${sub.id}?from=/dashboard/quotes/groups/${id}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer text-left">
              <span className="text-xs font-medium text-blue-700">Pipe</span>
              <span className="text-xs text-blue-500">{sub.manufacturer}</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[sub.status]}`}>{statusLabel(sub.status, QUOTE_STATUS_LABEL)}</span>
              <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
          {group.duct_quotes.map(sub => (
            <button key={sub.id} onClick={() => router.push(`/dashboard/duct-quotes/${sub.id}?from=/dashboard/quotes/groups/${id}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer text-left">
              <span className="text-xs font-medium text-orange-700">Duct</span>
              <span className="text-xs text-orange-500">{sub.manufacturer}</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[sub.status]}`}>{statusLabel(sub.status, QUOTE_STATUS_LABEL)}</span>
              <svg className="w-3.5 h-3.5 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      </div>

      {/* Item tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 flex">
          {(['배관', '덕트'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === tab
                ? tab === '배관' ? 'border-blue-500 text-blue-700' : 'border-orange-500 text-orange-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === '배관' ? 'Pipe' : 'Duct'}
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {(tab === '배관' ? group.pipe_quotes : group.duct_quotes).length}
              </span>
            </button>
          ))}
        </div>

        {activeSubs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No {activeTab === '배관' ? 'pipe' : 'duct'} quotes</div>
        ) : activeSubs.map(sub => (
          <div key={sub.id} className="border-b border-gray-100 last:border-b-0">
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">{sub.manufacturer}</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[sub.status]}`}>{statusLabel(sub.status, QUOTE_STATUS_LABEL)}</span>
                {sub.delivery_date && <span className="text-xs text-gray-400">Valid until: {fmtDate(sub.delivery_date)}</span>}
              </div>
              <button onClick={() => router.push(activeTab === '배관' ? `/dashboard/pipe-quotes/${sub.id}?from=/dashboard/quotes/groups/${id}` : `/dashboard/duct-quotes/${sub.id}?from=/dashboard/quotes/groups/${id}`)}
                className="text-xs text-gray-400 hover:text-[#014A99] flex items-center gap-1 transition-colors cursor-pointer">
                View Details <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            {activeTab === '배관' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-gray-50 text-gray-400 border-b border-gray-100"><tr>
                    <th className="relative group/th px-4 py-2 text-left select-none" style={{width:pipeColW.name}}>Item Name{rhPipe('name')}</th>
                    <th className="relative group/th px-4 py-2 text-left select-none" style={{width:pipeColW.spec}}>Spec{rhPipe('spec')}</th>
                    <th className="relative group/th px-4 py-2 text-right select-none" style={{width:pipeColW.qty}}>Qty{rhPipe('qty')}</th>
                    <th className="relative group/th px-4 py-2 text-right select-none" style={{width:pipeColW.price}}>Sale Price{rhPipe('price')}</th>
                    <th className="relative group/th px-4 py-2 text-right select-none" style={{width:pipeColW.amount}}>Supply Amount{rhPipe('amount')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(sub.items ?? []).map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2">{it.name || it.displayName || it.internalName || '-'}</td>
                        <td className="px-4 py-2 text-gray-500">{it.spec || '-'}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{it.quantity ?? '-'}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">{it.unitPrice != null ? it.unitPrice.toLocaleString() : '—'}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">{it.unitPrice != null ? (it.unitPrice * it.quantity).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-gray-50 text-gray-400 border-b border-gray-100"><tr>
                    <th className="relative group/th px-4 py-2 text-center select-none" style={{width:ductColW.type}}>Item{rhDuct('type')}</th>
                    <th className="relative group/th px-4 py-2 text-right select-none" style={{width:ductColW.w}}>Width{rhDuct('w')}</th>
                    <th className="relative group/th px-4 py-2 text-right select-none" style={{width:ductColW.h}}>Height{rhDuct('h')}</th>
                    <th className="relative group/th px-4 py-2 text-right select-none" style={{width:ductColW.qty}}>Qty{rhDuct('qty')}</th>
                    <th className="relative group/th px-4 py-2 text-right select-none" style={{width:ductColW.amount}}>Supply Amount{rhDuct('amount')}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(sub.items ?? []).map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${it.type==='입상'?'bg-blue-50 text-blue-700':it.type==='벽체'?'bg-violet-50 text-violet-700':'bg-orange-50 text-orange-700'}`}>{it.type === '입상' ? 'Riser' : it.type === '벽체' ? 'Wall' : it.type}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{it.width ?? '-'}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{it.height ?? '-'}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{it.quantity ?? '-'}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">{it.amount != null ? it.amount.toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delete Group Quote</p>
                <p className="text-sm text-gray-500 mt-0.5">Sub-quotes will be detached from the group.</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
              <p><span className="text-gray-400 w-16 inline-block">Vendor</span><span className="font-medium">{group.vendor}</span></p>
              <p><span className="text-gray-400 w-16 inline-block">Project</span><span>{group.project || '-'}</span></p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 cursor-pointer">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
