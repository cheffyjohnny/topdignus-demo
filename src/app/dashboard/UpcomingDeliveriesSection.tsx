'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { statusLabel, ORDER_STATUS_LABEL } from '@/lib/status-labels'

interface UpcomingItem {
  id: string
  order_no?: string | null
  vendor: string
  project: string | null
  manufacturer?: string | null
  delivery_date: string | null
  status: string
  isDuct: boolean
  dDay: { label: string; cls: string }
}

type ColKey = 'order_no' | 'type' | 'vendor' | 'project' | 'manufacturer' | 'delivery_date' | 'dday' | 'status'

const COLUMNS: { key: ColKey; label: string; pinned?: boolean; align?: 'left' | 'center' }[] = [
  { key: 'order_no',      label: 'No.' },
  { key: 'type',          label: 'Type' },
  { key: 'vendor',        label: 'Vendor',       pinned: true },
  { key: 'project',       label: 'Project',     pinned: true },
  { key: 'manufacturer',  label: 'Manufacturer' },
  { key: 'delivery_date', label: 'Delivery Date' },
  { key: 'dday',          label: 'D-day',      align: 'center' },
  { key: 'status',        label: 'Status',       pinned: true, align: 'center' },
]
const ALL_COL_KEYS = COLUMNS.map(c => c.key)
const COL_VIS_KEY    = 'upcoming_columns'
const COL_ORDER_KEY  = 'upcoming_col_order'
const COL_WIDTHS_KEY = 'upcoming_col_widths'

const DEFAULT_WIDTHS: Record<ColKey, number> = {
  order_no:      64,
  type:          64,
  vendor:        160,
  project:       220,
  manufacturer:  100,
  delivery_date: 116,
  dday:          80,
  status:        72,
}

const STATUS_COLORS: Record<string, string> = {
  수주: 'bg-blue-50 text-blue-700',
  발주: 'bg-amber-50 text-amber-700',
  납품: 'bg-green-50 text-green-700',
  취소: 'bg-gray-50 text-gray-500',
}

export function UpcomingDeliveriesSection({ items }: { items: UpcomingItem[] }) {
  const router = useRouter()
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(ALL_COL_KEYS)
  const [colOrder, setColOrder]       = useState<ColKey[]>(ALL_COL_KEYS)
  const [colWidths, setColWidths]     = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const [dragColIdx, setDragColIdx]   = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const colPickerRef = useRef<HTMLDivElement>(null)
  const colWidthsRef = useRef<Record<ColKey, number>>(DEFAULT_WIDTHS)

  // load from localStorage
  useEffect(() => {
    try {
      const vis = localStorage.getItem(COL_VIS_KEY)
      if (vis) {
        const parsed = JSON.parse(vis) as ColKey[]
        const pinned = COLUMNS.filter(c => c.pinned).map(c => c.key)
        setVisibleCols([...new Set([...pinned, ...parsed.filter((k): k is ColKey => ALL_COL_KEYS.includes(k))])])
      }
      const ord = localStorage.getItem(COL_ORDER_KEY)
      if (ord) {
        const parsed = JSON.parse(ord) as ColKey[]
        const valid = parsed.filter((k): k is ColKey => ALL_COL_KEYS.includes(k))
        const missing = ALL_COL_KEYS.filter(k => !valid.includes(k))
        setColOrder([...valid, ...missing])
      }
      const widths = localStorage.getItem(COL_WIDTHS_KEY)
      if (widths) {
        const parsed = JSON.parse(widths) as Partial<Record<ColKey, number>>
        const merged = { ...DEFAULT_WIDTHS, ...parsed }
        setColWidths(merged)
        colWidthsRef.current = merged
      }
    } catch {}
  }, [])

  // click-outside for picker
  useEffect(() => {
    if (!colPickerOpen) return
    function h(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setColPickerOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [colPickerOpen])

  const orderedVisibleCols = useMemo(
    () => colOrder.filter(k => visibleCols.includes(k)),
    [colOrder, visibleCols]
  )

  function toggleColVis(key: ColKey) {
    setVisibleCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      try { localStorage.setItem(COL_VIS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function reorderCols(from: number, to: number) {
    setColOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      try { localStorage.setItem(COL_ORDER_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function startResize(e: React.MouseEvent, key: ColKey) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidthsRef.current[key]
    function onMove(e: MouseEvent) {
      const w = Math.max(60, startW + (e.clientX - startX))
      setColWidths(prev => {
        const next = { ...prev, [key]: w }
        colWidthsRef.current = next
        return next
      })
    }
    function onUp() {
      try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidthsRef.current)) } catch {}
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const cellRender: Record<ColKey, (o: UpcomingItem) => React.ReactNode> = {
    order_no: o => <td key="order_no" className="px-4 py-3 text-gray-400 text-xs font-mono">{o.order_no ?? '-'}</td>,
    type: o => (
      <td key="type" className="px-4 py-3 whitespace-nowrap">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${o.isDuct ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
          {o.isDuct ? 'Duct' : 'Pipe'}
        </span>
      </td>
    ),
    vendor: o => <td key="vendor" className="px-4 py-3 font-medium text-gray-800">{o.vendor}</td>,
    project: o => <td key="project" className="px-4 py-3 text-gray-600">{o.project || '-'}</td>,
    manufacturer: o => <td key="manufacturer" className="px-4 py-3 text-xs text-gray-500">{o.manufacturer || '-'}</td>,
    delivery_date: o => <td key="delivery_date" className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap">{o.delivery_date}</td>,
    dday: o => (
      <td key="dday" className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`text-xs px-2 py-0.5 rounded-full ${o.dDay.cls}`}>{o.dDay.label}</span>
      </td>
    ),
    status: o => (
      <td key="status" className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{statusLabel(o.status, ORDER_STATUS_LABEL)}</span>
      </td>
    ),
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Upcoming Deliveries
          <span className="normal-case text-gray-300 font-normal ml-1">(±30 days from today, Ordered/Purchased)</span>
        </h2>

        {/* Column picker */}
        <div className="relative" ref={colPickerRef}>
          <button onClick={() => setColPickerOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
            Columns
          </button>
          {colPickerOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52 space-y-0.5">
              <p className="text-xs text-gray-400 px-2 pb-1.5 border-b border-gray-100 mb-1.5">Drag to reorder</p>
              {colOrder.map((key, idx) => {
                const c = COLUMNS.find(c => c.key === key)!
                return (
                  <div key={key} draggable={!c.pinned}
                    onDragStart={() => { if (!c.pinned) setDragColIdx(idx) }}
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                    onDrop={e => { e.preventDefault(); if (dragColIdx !== null && dragColIdx !== idx) reorderCols(dragColIdx, idx); setDragColIdx(null); setDragOverIdx(null) }}
                    onDragEnd={() => { setDragColIdx(null); setDragOverIdx(null) }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors select-none
                      ${dragOverIdx === idx && dragColIdx !== idx ? 'bg-blue-50 border border-blue-200' : ''}
                      ${dragColIdx === idx ? 'opacity-40' : ''}
                      ${c.pinned ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                    <svg className={`w-3 h-3 text-gray-300 flex-shrink-0 ${c.pinned ? 'cursor-not-allowed' : 'cursor-grab'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8-12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                    </svg>
                    <input type="checkbox" checked={visibleCols.includes(key)} disabled={!!c.pinned}
                      onChange={() => { if (!c.pinned) toggleColVis(key) }}
                      className="rounded cursor-pointer" onClick={e => e.stopPropagation()} />
                    <span className={c.pinned ? '' : 'cursor-grab'}>{c.label}</span>
                    {c.pinned && <span className="text-gray-300 ml-auto">Pinned</span>}
                  </div>
                )
              })}
              <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                <button onClick={() => { setColWidths(DEFAULT_WIDTHS); colWidthsRef.current = DEFAULT_WIDTHS; try { localStorage.removeItem(COL_WIDTHS_KEY) } catch {} }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 px-2 py-1 text-left transition-colors cursor-pointer">
                  Reset column widths
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
          No upcoming deliveries.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {orderedVisibleCols.map(k => <col key={k} style={{ width: colWidths[k] }} />)}
              </colgroup>
              <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <tr>
                  {orderedVisibleCols.map(k => {
                    const c = COLUMNS.find(c => c.key === k)!
                    return (
                      <th key={k} style={{ width: colWidths[k], minWidth: 60 }}
                        className={`px-4 py-3 font-medium relative overflow-hidden ${c.align === 'center' ? 'text-center' : 'text-left'}`}>
                        <span className="truncate block">{c.label}</span>
                        <div onMouseDown={e => { e.stopPropagation(); startResize(e, k) }}
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50" />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(o => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(o.isDuct ? `/dashboard/duct-orders/${o.id}` : `/dashboard/orders/${o.id}`)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    {orderedVisibleCols.map(k => cellRender[k](o))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
