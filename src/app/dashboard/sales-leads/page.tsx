'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

type Status = '등록' | '진행중' | '착공전' | '이관' | '체결' | '종료'
type SortDir = 'asc' | 'desc'
type ColKey = 'status' | 'dealership' | 'project_name' | 'address' | 'last_update' | 'construction_company' | 'facility_company' | 'contact_name' | 'contact_phone' | 'scale' | 'notes' | 'source_url' | 'created_at'
type SortKey = ColKey | 'seq'

interface SalesLead {
  id: string; seq: number | null; dealership: string | null; project_name: string | null
  address: string | null; last_update: string | null; construction_company: string | null
  facility_company: string | null; contact_name: string | null; contact_phone: string | null
  scale: string | null; notes: string | null; source_url: string | null
  status: Status; created_at: string
}

const STATUS_STYLES: Record<Status, string> = {
  등록: 'bg-gray-100 text-gray-600', 진행중: 'bg-blue-100 text-blue-700',
  착공전: 'bg-purple-100 text-purple-700', 이관: 'bg-amber-100 text-amber-700',
  체결: 'bg-green-100 text-green-700', 종료: 'bg-red-100 text-red-600',
}

const TABS: ('전체' | Status)[] = ['전체', '등록', '진행중', '착공전', '이관', '체결', '종료']

const COLUMNS: { key: ColKey; label: string; pinned?: boolean }[] = [
  { key: 'status',               label: '상태',         pinned: true },
  { key: 'dealership',           label: '대리점' },
  { key: 'project_name',         label: '현장명',       pinned: true },
  { key: 'address',              label: '주소' },
  { key: 'last_update',          label: '최근 수정일' },
  { key: 'construction_company', label: '업체명' },
  { key: 'contact_name',         label: '담당자' },
  { key: 'contact_phone',        label: '담당자 연락처' },
  { key: 'scale',                label: '규모' },
  { key: 'notes',                label: '비고' },
  { key: 'source_url',           label: '링크' },
  { key: 'created_at',           label: '작성일' },
]

const DEFAULT_WIDTHS: Record<ColKey, number> = {
  status: 80, dealership: 80, project_name: 160, address: 140, last_update: 96,
  construction_company: 120, facility_company: 100, contact_name: 80,
  contact_phone: 120, scale: 80, notes: 120, source_url: 48, created_at: 80,
}

const ALL_KEYS        = COLUMNS.map(c => c.key)
const COL_VIS_KEY     = 'sales_leads_columns'
const COL_ORDER_KEY   = 'sales_leads_col_order'
const COL_WIDTHS_KEY  = 'sales_leads_col_widths'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="w-3 h-3 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
  return dir === 'asc'
    ? <svg className="w-3 h-3 text-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
    : <svg className="w-3 h-3 text-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
}

export default function SalesLeadsPage() {
  const router = useRouter()
  const [leads, setLeads]           = useState<(SalesLead & { account?: { id: string; name: string } | null })[]>([])
  const [loading, setLoading]       = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<'전체' | Status>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey]       = useState<SortKey | null>(null)
  const [sortDir, setSortDir]       = useState<SortDir>('asc')
  const [lastVisitedId, setLastVisitedId] = useState<string | null>(null)
  const scrollToRestore  = useRef<number | null>(null)
  const didRestoreScroll = useRef(false)

  // column customization
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(ALL_KEYS)
  const [colOrder, setColOrder]       = useState<ColKey[]>(ALL_KEYS)
  const [colWidths, setColWidths]     = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const [dragColIdx, setDragColIdx]   = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const colPickerRef  = useRef<HTMLDivElement>(null)
  const colWidthsRef  = useRef<Record<ColKey, number>>(DEFAULT_WIDTHS)

  useEffect(() => {
    fetch('/api/sales-leads')
      .then(r => r.json())
      .then(data => setLeads(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))

    try {
      const vis = localStorage.getItem(COL_VIS_KEY)
      if (vis) {
        const parsed = JSON.parse(vis) as ColKey[]
        const pinned = COLUMNS.filter(c => c.pinned).map(c => c.key)
        setVisibleCols([...new Set([...pinned, ...parsed.filter((k): k is ColKey => ALL_KEYS.includes(k))])])
      }
      const ord = localStorage.getItem(COL_ORDER_KEY)
      if (ord) {
        const parsed = JSON.parse(ord) as ColKey[]
        const valid = parsed.filter((k): k is ColKey => ALL_KEYS.includes(k))
        const missing = ALL_KEYS.filter(k => !valid.includes(k))
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

    const fromBack = sessionStorage.getItem('sl_from_back')
    if (fromBack) {
      sessionStorage.removeItem('sl_from_back')
      const saved = sessionStorage.getItem('sl_scroll')
      if (saved) { scrollToRestore.current = parseInt(saved); sessionStorage.removeItem('sl_scroll') }
      const lastId = sessionStorage.getItem('sl_last_id')
      if (lastId) { setLastVisitedId(lastId); setTimeout(() => setLastVisitedId(null), 3000) }
    } else {
      sessionStorage.removeItem('sl_scroll')
      sessionStorage.removeItem('sl_last_id')
    }
  }, [])

  useEffect(() => {
    if (loading || didRestoreScroll.current) return
    didRestoreScroll.current = true
    if (scrollToRestore.current !== null) {
      const scroll = scrollToRestore.current
      scrollToRestore.current = null
      requestAnimationFrame(() => {
        const main = document.querySelector('main')
        if (main) main.scrollTop = scroll
      })
    }
  }, [loading])

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
    const c = COLUMNS.find(c => c.key === key)
    if (c?.pinned) return
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
      const w = Math.max(48, startW + (e.clientX - startX))
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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else { setSortKey(key); setSortDir('asc') }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 영업현장을 삭제하시겠습니까?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/sales-leads?id=${id}`, { method: 'DELETE' })
      if (res.ok) { setLeads(prev => prev.filter(l => l.id !== id)); toast.success('삭제되었습니다.') }
      else toast.error('삭제 실패')
    } finally { setDeletingId(null) }
  }

  const q = searchQuery.trim().toLowerCase()
  const searched = q
    ? leads.filter(l => [l.project_name, l.address, l.construction_company, l.facility_company, l.contact_name, l.dealership, l.notes, l.scale].some(v => v?.toLowerCase().includes(q)))
    : leads

  const tabFiltered = activeTab === '전체' ? searched : searched.filter(l => l.status === activeTab)

  const filtered = sortKey
    ? [...tabFiltered].sort((a, b) => {
        if (sortKey === 'seq') { const av = a.seq ?? 0, bv = b.seq ?? 0; return sortDir === 'asc' ? av - bv : bv - av }
        const av = String(a[sortKey as keyof SalesLead] ?? ''), bv = String(b[sortKey as keyof SalesLead] ?? '')
        const cmp = av.localeCompare(bv, 'ko')
        return sortDir === 'asc' ? cmp : -cmp
      })
    : tabFiltered

  const tabCount = (tab: '전체' | Status) =>
    tab === '전체' ? searched.length : searched.filter(l => l.status === tab).length

  // column renderer
  const colRender: Record<ColKey, (lead: SalesLead) => React.ReactNode> = {
    status: l => (
      <td key="status" className="px-3 py-2.5 overflow-hidden whitespace-nowrap">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[l.status] ?? STATUS_STYLES['등록']}`}>{l.status}</span>
      </td>
    ),
    dealership: l => <td key="dealership" className="px-3 py-2.5 overflow-hidden whitespace-nowrap">{l.dealership ?? '—'}</td>,
    project_name: l => <td key="project_name" className="px-3 py-2.5 overflow-hidden whitespace-nowrap font-medium text-gray-900">{l.project_name ?? '—'}</td>,
    address: l => <td key="address" className="px-3 py-2.5 overflow-hidden whitespace-nowrap text-gray-600">{l.address ?? '—'}</td>,
    last_update: l => <td key="last_update" className="px-3 py-2.5 overflow-hidden whitespace-nowrap text-gray-600">{l.last_update ? new Date(l.last_update).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '—'}</td>,
    construction_company: l => <td key="construction_company" className="px-3 py-2.5 overflow-hidden whitespace-nowrap">{(l as { account?: { name: string } | null }).account?.name ?? l.construction_company ?? '—'}</td>,
    facility_company: l => <td key="facility_company" className="px-3 py-2.5 overflow-hidden whitespace-nowrap">{l.facility_company ?? '—'}</td>,
    contact_name: l => <td key="contact_name" className="px-3 py-2.5 overflow-hidden whitespace-nowrap">{l.contact_name ?? '—'}</td>,
    contact_phone: l => <td key="contact_phone" className="px-3 py-2.5 overflow-hidden whitespace-nowrap text-gray-600">{l.contact_phone ?? '—'}</td>,
    scale: l => <td key="scale" className="px-3 py-2.5 overflow-hidden whitespace-nowrap text-gray-600">{l.scale ?? '—'}</td>,
    notes: l => <td key="notes" className="px-3 py-2.5 overflow-hidden whitespace-nowrap text-gray-600">{l.notes ?? '—'}</td>,
    source_url: l => (
      <td key="source_url" className="px-3 py-2.5 overflow-hidden whitespace-nowrap">
        {l.source_url
          ? <a href={l.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline text-xs cursor-pointer">링크</a>
          : <span className="text-gray-400 text-xs">—</span>}
      </td>
    ),
    created_at: l => <td key="created_at" className="px-3 py-2.5 overflow-hidden whitespace-nowrap text-gray-500">{new Date(l.created_at).toLocaleDateString('ko-KR')}</td>,
  }

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">영업현장 현황</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-auto">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="현장명, 주소, 건설사, 담당자..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <a href="/api/sales-leads/export" download className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>엑셀
          </a>
          <Link href="/dashboard/sales-leads/new?step=form" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 cursor-pointer">
            + 영업 추가
          </Link>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex items-end border-b border-gray-200 mb-2">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{tabCount(tab)}</span>
          </button>
        ))}
      </div>

      {/* 컬럼 설정 */}
      <div className="flex justify-end mb-3">
        <div className="relative" ref={colPickerRef}>
          <button onClick={() => setColPickerOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
            컬럼
          </button>
          {colPickerOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 space-y-0.5">
              <p className="text-xs text-gray-400 px-2 pb-1.5 border-b border-gray-100 mb-1.5">드래그로 순서 변경</p>
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
                      onClick={e => e.stopPropagation()}
                      className="rounded cursor-pointer accent-blue-600" />
                    <span className={c.pinned ? '' : 'cursor-grab'}>{c.label}</span>
                    {c.pinned && <span className="text-gray-300 ml-auto">고정</span>}
                  </div>
                )
              })}
              <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                <button onClick={() => { setColWidths(DEFAULT_WIDTHS); colWidthsRef.current = DEFAULT_WIDTHS; try { localStorage.removeItem(COL_WIDTHS_KEY) } catch {} }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 px-2 py-1 text-left transition-colors cursor-pointer">
                  컬럼 너비 초기화
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {q
            ? <p className="text-sm">'{searchQuery}'에 대한 검색 결과가 없습니다.</p>
            : <><p className="text-sm">등록된 영업현장이 없습니다.</p><Link href="/dashboard/sales-leads/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline cursor-pointer">영업현장 추가하기</Link></>}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="text-sm w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 48 }} />
              {orderedVisibleCols.map(k => <col key={k} style={{ width: colWidths[k] }} />)}
              <col style={{ width: 40 }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {/* NO 컬럼 — 항상 고정 */}
                <th onClick={() => handleSort('seq')}
                  className={`px-3 py-2.5 text-left font-medium cursor-pointer select-none hover:bg-gray-100 transition-colors overflow-hidden whitespace-nowrap relative ${sortKey === 'seq' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>
                  <span className="flex items-center gap-1">NO <SortIcon active={sortKey === 'seq'} dir={sortDir} /></span>
                </th>

                {orderedVisibleCols.map(key => {
                  const c = COLUMNS.find(c => c.key === key)!
                  const active = sortKey === key
                  return (
                    <th key={key} style={{ width: colWidths[key], minWidth: 48 }}
                      onClick={() => handleSort(key)}
                      className={`px-3 py-2.5 text-left font-medium cursor-pointer select-none hover:bg-gray-100 transition-colors overflow-hidden whitespace-nowrap relative overflow-hidden group ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>
                      <span className="flex items-center gap-1 truncate">
                        {c.label}
                        <SortIcon active={active} dir={sortDir} />
                      </span>
                      <div onMouseDown={e => { e.stopPropagation(); startResize(e, key) }}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50 group-hover:bg-gray-300/40" />
                    </th>
                  )
                })}

                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(lead => (
                <tr key={lead.id}
                  onClick={() => {
                    const main = document.querySelector('main')
                    sessionStorage.setItem('sl_scroll', String(main?.scrollTop ?? 0))
                    sessionStorage.setItem('sl_last_id', lead.id)
                    router.push(`/dashboard/sales-leads/${lead.id}`)
                  }}
                  className={`cursor-pointer transition-colors ${lead.id === lastVisitedId ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-blue-50'}`}>
                  <td className="px-3 py-2.5 text-gray-500 overflow-hidden whitespace-nowrap">{lead.seq ?? '—'}</td>
                  {orderedVisibleCols.map(k => colRender[k](lead))}
                  <td className="px-3 py-2.5">
                    <button onClick={e => { e.stopPropagation(); handleDelete(lead.id) }}
                      disabled={deletingId === lead.id}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-50 cursor-pointer" title="삭제">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
