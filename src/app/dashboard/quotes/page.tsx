'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'

type QuoteStatus = '검토중' | '검토완료' | '송부완료' | '수주확정' | '취소'
type StatusTab = '전체' | QuoteStatus
type TypeTab = '전체' | '배관' | '덕트' | '배관+덕트'
type SortDir = 'asc' | 'desc'

interface PipeQuote {
  id: string
  order_date: string
  vendor: string
  project: string
  delivery_date: string
  contact_name: string
  author: string
  status: QuoteStatus
  converted_order_id: string | null
}

interface DuctQuote {
  id: string
  order_date: string
  manufacturer: string
  customer_name: string
  project: string
  delivery_date: string
  author: string
  status: QuoteStatus
  converted_duct_order_id: string | null
}

interface QuoteGroup {
  id: string; vendor: string; project?: string
  order_date?: string; author?: string; status: QuoteStatus
  pipe_quotes: { id: string; manufacturer: string; status: QuoteStatus }[]
  duct_quotes: { id: string; manufacturer: string; status: QuoteStatus }[]
}

interface ConfirmTarget {
  id: string
  type: '배관' | '덕트'
  vendor: string
  project: string
  order_date: string
}

const STATUS_COLORS: Record<QuoteStatus, string> = {
  '검토중':   'bg-amber-50 text-amber-700 border-amber-200',
  '검토완료': 'bg-blue-50 text-blue-700 border-blue-200',
  '송부완료': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '수주확정': 'bg-green-50 text-green-700 border-green-200',
  '취소':     'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_TABS: StatusTab[] = ['전체', '검토중', '검토완료', '송부완료', '수주확정', '취소']
const TYPE_TABS: TypeTab[] = ['전체', '배관', '덕트', '배관+덕트']

type AllRow = {
  id: string
  type: '배관' | '덕트' | '배관+덕트'
  vendor: string
  project: string
  order_date: string
  delivery_date: string
  author: string
  status: QuoteStatus
  converted_id: string | null
  subQuotes?: { type: '배관' | '덕트'; status: QuoteStatus }[]
}

// Resize handle for table columns
function ResizeHandle({ col, widths, setWidths, storageKey }: {
  col: string; widths: Record<string,number>; setWidths: React.Dispatch<React.SetStateAction<Record<string,number>>>; storageKey: string
}) {
  return (
    <div
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none group-hover/th:bg-blue-200/50 hover:!bg-blue-400/60 z-10"
      onPointerDown={e => {
        e.preventDefault()
        e.stopPropagation()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const startX = e.clientX
        const startW = widths[col] ?? 80
        function onMove(ev: PointerEvent) {
          setWidths(prev => ({ ...prev, [col]: Math.max(40, startW + ev.clientX - startX) }))
        }
        function onUp() {
          el.releasePointerCapture(e.pointerId)
          el.removeEventListener('pointermove', onMove)
          el.removeEventListener('pointerup', onUp)
          setWidths(prev => { try { localStorage.setItem(storageKey, JSON.stringify(prev)) } catch {} ; return prev })
        }
        el.addEventListener('pointermove', onMove)
        el.addEventListener('pointerup', onUp)
      }}
    />
  )
}

export default function QuotesPage() {
  const router = useRouter()
  const [typeTab, setTypeTab] = useState<TypeTab>('전체')
  const [statusTab, setStatusTab] = useState<StatusTab>('전체')
  const [pipeQuotes, setPipeQuotes] = useState<PipeQuote[]>([])
  const [ductQuotes, setDuctQuotes] = useState<DuctQuote[]>([])
  const [groups, setGroups] = useState<QuoteGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [vendorFilter, setVendorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [pRes, dRes, gRes] = await Promise.all([
      fetch('/api/pipe-quotes?standalone=true'),
      fetch('/api/duct-quotes?standalone=true'),
      fetch('/api/quote-groups'),
    ])
    const [pData, dData, gData] = await Promise.all([pRes.json(), dRes.json(), gRes.json()])
    setPipeQuotes(Array.isArray(pData) ? pData : [])
    setDuctQuotes(Array.isArray(dData) ? dData : [])
    setGroups(Array.isArray(gData) ? gData : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function onTypeTabChange(tab: TypeTab) {
    setTypeTab(tab)
    setVendorFilter('')
    setSortKey(null)
  }

  const vendorList = useMemo(() => {
    const names = typeTab === '배관'
      ? pipeQuotes.map(q => q.vendor)
      : typeTab === '덕트'
      ? ductQuotes.map(q => q.customer_name)
      : typeTab === '배관+덕트'
      ? groups.map(g => g.vendor)
      : [...pipeQuotes.map(q => q.vendor), ...ductQuotes.map(q => q.customer_name), ...groups.map(g => g.vendor)]
    return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [typeTab, pipeQuotes, ductQuotes, groups])

  const typeCounts = useMemo(() => ({
    '전체':    pipeQuotes.length + ductQuotes.length + groups.length,
    '배관':    pipeQuotes.length,
    '덕트':    ductQuotes.length,
    '배관+덕트': groups.length,
  }), [pipeQuotes, ductQuotes, groups])

  const statusCounts = useMemo(() => {
    const source = typeTab === '배관' ? pipeQuotes : typeTab === '덕트' ? ductQuotes : typeTab === '배관+덕트' ? groups : [...pipeQuotes, ...ductQuotes, ...groups]
    const counts: Record<StatusTab, number> = { '전체': source.length, '검토중': 0, '검토완료': 0, '송부완료': 0, '수주확정': 0, '취소': 0 }
    source.forEach(q => { if (q.status in counts) counts[q.status as StatusTab]++ })
    return counts
  }, [typeTab, pipeQuotes, ductQuotes, groups])

  function matchesFilter(q: { status: QuoteStatus; order_date?: string }, vendor: string) {
    if (statusTab !== '전체' && q.status !== statusTab) return false
    const dateVal = q.order_date?.slice(0, 10) ?? ''
    if (dateFrom && dateVal < dateFrom) return false
    if (dateTo && dateVal > dateTo) return false
    if (vendorFilter && vendor !== vendorFilter) return false
    return true
  }

  function sortList<T extends Record<string, any>>(list: T[]): T[] {
    if (!sortKey) return list
    return [...list].sort((a, b) => {
      const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'ko', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filteredPipe = useMemo(() =>
    sortList(pipeQuotes.filter(q => matchesFilter(q, q.vendor))),
  [pipeQuotes, statusTab, vendorFilter, dateFrom, dateTo, sortKey, sortDir])

  const filteredDuct = useMemo(() =>
    sortList(ductQuotes.filter(q => matchesFilter(q, q.customer_name))),
  [ductQuotes, statusTab, vendorFilter, dateFrom, dateTo, sortKey, sortDir])

  const filteredAll = useMemo((): AllRow[] => {
    const rows: AllRow[] = [
      ...pipeQuotes.filter(q => matchesFilter(q, q.vendor)).map(q => ({ ...q, type: '배관' as const, vendor: q.vendor, converted_id: q.converted_order_id })),
      ...ductQuotes.filter(q => matchesFilter(q, q.customer_name)).map(q => ({ ...q, type: '덕트' as const, vendor: q.customer_name, converted_id: q.converted_duct_order_id })),
      ...groups.filter(g => {
        if (statusTab !== '전체' && g.status !== statusTab) return false
        const d = g.order_date?.slice(0, 10) ?? ''
        if (dateFrom && d < dateFrom) return false
        if (dateTo && d > dateTo) return false
        if (vendorFilter && g.vendor !== vendorFilter) return false
        return true
      }).map(g => ({
        id: g.id, type: '배관+덕트' as const, vendor: g.vendor,
        project: g.project ?? '', order_date: g.order_date ?? '',
        delivery_date: '', author: g.author ?? '', status: g.status,
        converted_id: null,
        subQuotes: [
          ...g.pipe_quotes.map(s => ({ type: '배관' as const, status: s.status })),
          ...g.duct_quotes.map(s => ({ type: '덕트' as const, status: s.status })),
        ],
      })),
    ]
    return sortList(rows)
  }, [pipeQuotes, ductQuotes, groups, statusTab, vendorFilter, dateFrom, dateTo, sortKey, sortDir])

  async function confirmDelete() {
    if (!confirmTarget) return
    setDeletingId(confirmTarget.id)
    setConfirmTarget(null)
    const url = confirmTarget.type === '배관' ? `/api/pipe-quotes/${confirmTarget.id}` : `/api/duct-quotes/${confirmTarget.id}`
    await fetch(url, { method: 'DELETE' })
    if (confirmTarget.type === '배관') setPipeQuotes(prev => prev.filter(q => q.id !== confirmTarget.id))
    else setDuctQuotes(prev => prev.filter(q => q.id !== confirmTarget.id))
    setDeletingId(null)
  }

  const filteredGroups = useMemo(() =>
    groups.filter(g => {
      if (statusTab !== '전체' && g.status !== statusTab) return false
      const d = g.order_date?.slice(0, 10) ?? ''
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      if (vendorFilter && g.vendor !== vendorFilter) return false
      return true
    }),
  [groups, statusTab, vendorFilter, dateFrom, dateTo])

  const hasFilters = vendorFilter || dateFrom || dateTo
  const displayCount = typeTab === '배관' ? filteredPipe.length : typeTab === '덕트' ? filteredDuct.length : typeTab === '배관+덕트' ? filteredGroups.length : filteredAll.length

  return (
    <>
    <div className="w-full space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">견적서 현황</h1>
          <p className="text-sm text-gray-500 mt-0.5">배관·덕트 견적서 내역을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {(typeTab === '전체' || typeTab === '배관+덕트') && (
            <button onClick={() => router.push('/dashboard/quotes/groups/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              새 복합 견적서
            </button>
          )}
          {(typeTab === '전체' || typeTab === '배관') && (
            <button onClick={() => router.push('/dashboard/pipe-quotes/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {typeTab === '전체' ? '새 배관 견적서' : '새 견적서'}
            </button>
          )}
          {(typeTab === '전체' || typeTab === '덕트') && (
            <button onClick={() => router.push('/dashboard/duct-quotes/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {typeTab === '전체' ? '새 덕트 견적서' : '새 견적서'}
            </button>
          )}
        </div>
      </div>

      {/* 유형 탭 */}
      <div className="flex gap-1">
        {TYPE_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onTypeTabChange(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              typeTab === tab
                ? tab === '덕트' ? 'bg-orange-500 text-white'
                  : tab === '배관+덕트' ? 'bg-purple-600 text-white'
                  : 'bg-[#014A99] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              typeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {typeCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* 상태 탭 */}
      <div className="flex border-b border-gray-200 gap-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
              statusTab === tab ? 'border-[#014A99] text-[#014A99]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              statusTab === tab ? 'bg-[#014A99] text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {statusCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white" />
        <span className="text-gray-400 text-sm">~</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white" />
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white cursor-pointer">
          <option value="">전체 업체</option>
          {vendorList.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setVendorFilter(''); setDateFrom(''); setDateTo('') }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            초기화
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{displayCount}건</span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">불러오는 중...</div>
      ) : displayCount === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">견적서가 없습니다.</div>
      ) : typeTab === '배관+덕트' ? (
        <GroupTable rows={filteredGroups} onNavigate={id => router.push(`/dashboard/quotes/groups/${id}`)} />
      ) : typeTab === '배관' ? (
        <PipeTable
          rows={filteredPipe} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
          deletingId={deletingId}
          onNavigate={id => router.push(`/dashboard/pipe-quotes/${id}`)}
          onDelete={q => setConfirmTarget({ id: q.id, type: '배관', vendor: q.vendor, project: q.project, order_date: q.order_date })}
        />
      ) : typeTab === '덕트' ? (
        <DuctTable
          rows={filteredDuct} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
          deletingId={deletingId}
          onNavigate={id => router.push(`/dashboard/duct-quotes/${id}`)}
          onDelete={q => setConfirmTarget({ id: q.id, type: '덕트', vendor: q.customer_name, project: q.project, order_date: q.order_date })}
        />
      ) : (
        <AllTable
          rows={filteredAll} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
          deletingId={deletingId}
          onNavigate={(type, id) => router.push(
            type === '배관+덕트' ? `/dashboard/quotes/groups/${id}`
            : type === '배관' ? `/dashboard/pipe-quotes/${id}`
            : `/dashboard/duct-quotes/${id}`
          )}
          onDelete={row => {
            if (row.type === '배관+덕트') return
            setConfirmTarget({ id: row.id, type: row.type as '배관'|'덕트', vendor: row.vendor, project: row.project, order_date: row.order_date })
          }}
        />
      )}
    </div>

    {confirmTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">견적서 삭제</p>
              <p className="text-sm text-gray-500 mt-0.5">삭제하면 복구할 수 없습니다.</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <p><span className="text-gray-400 w-16 inline-block">업체</span><span className="font-medium">{confirmTarget.vendor}</span></p>
            <p><span className="text-gray-400 w-16 inline-block">현장명</span><span>{confirmTarget.project || '-'}</span></p>
            <p><span className="text-gray-400 w-16 inline-block">작성일</span><span>{confirmTarget.order_date?.slice(0, 10) ?? '-'}</span></p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfirmTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">취소</button>
            <button onClick={confirmDelete} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 cursor-pointer">삭제</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ─── 그룹 탭 ──────────────────────────────────────────────────────────────
function GroupTable({ rows, onNavigate }: { rows: QuoteGroup[]; onNavigate: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="px-4 py-3 text-left w-12">No.</th>
            <th className="px-4 py-3 text-left w-20">유형</th>
            <th className="px-4 py-3 text-left">작성일</th>
            <th className="px-4 py-3 text-left">업체</th>
            <th className="px-4 py-3 text-left">현장명</th>
            <th className="px-4 py-3 text-left">작성자</th>
            <th className="px-4 py-3 text-center w-28">하위 견적서</th>
            <th className="px-4 py-3 text-center w-20">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((g, i) => (
            <tr key={g.id} onClick={() => onNavigate(g.id)}
              className="bg-purple-50/30 hover:bg-purple-50 cursor-pointer transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs text-center">{i + 1}</td>
              <td className="px-4 py-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap bg-purple-50 text-purple-700 border-purple-200">배관+덕트</span>
              </td>
              <td className="px-4 py-3 text-gray-500">{g.order_date?.slice(0, 10) ?? '-'}</td>
              <td className="px-4 py-3 font-medium">{g.vendor}</td>
              <td className="px-4 py-3">{g.project || '-'}</td>
              <td className="px-4 py-3 text-gray-500">{g.author || '-'}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col gap-0.5 items-center">
                  {g.pipe_quotes.map(s => (
                    <span key={s.id} className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">배관 {s.status}</span>
                  ))}
                  {g.duct_quotes.map(s => (
                    <span key={s.id} className="text-xs px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 whitespace-nowrap">덕트 {s.status}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[g.status]}`}>{g.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 전체 탭 ──────────────────────────────────────────────────────────────
const ALL_COL_DEFAULTS: Record<string,number> = { order_date:90, vendor:110, project:160, delivery_date:88, author:72, status:80, converted:64, del:48 }
const ALL_COL_KEY = 'quote_all_col_widths'

function AllTable({ rows, sortKey, sortDir, onSort, deletingId, onNavigate, onDelete }: {
  rows: AllRow[]; sortKey: string | null; sortDir: SortDir; onSort: (k: string) => void
  deletingId: string | null; onNavigate: (type: '배관' | '덕트' | '배관+덕트', id: string) => void; onDelete: (row: AllRow) => void
}) {
  const [w, setW] = useState<Record<string,number>>(() => {
    try { const s = JSON.parse(localStorage.getItem(ALL_COL_KEY) ?? 'null'); return s ? {...ALL_COL_DEFAULTS,...s} : ALL_COL_DEFAULTS } catch { return ALL_COL_DEFAULTS }
  })
  const rh = (col: string) => <ResizeHandle col={col} widths={w} setWidths={setW} storageKey={ALL_COL_KEY} />

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="px-4 py-3 text-left w-10">No.</th>
            <th className="px-4 py-3 text-left w-[72px]">유형</th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.order_date}} onClick={()=>onSort('order_date')}>
              <span className="inline-flex items-center gap-1">작성일<SortArrow col="order_date" sortKey={sortKey} sortDir={sortDir}/></span>{rh('order_date')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.vendor}} onClick={()=>onSort('vendor')}>
              <span className="inline-flex items-center gap-1">업체<SortArrow col="vendor" sortKey={sortKey} sortDir={sortDir}/></span>{rh('vendor')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.project}} onClick={()=>onSort('project')}>
              <span className="inline-flex items-center gap-1">현장명<SortArrow col="project" sortKey={sortKey} sortDir={sortDir}/></span>{rh('project')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.delivery_date}} onClick={()=>onSort('delivery_date')}>
              <span className="inline-flex items-center gap-1">유효기간<SortArrow col="delivery_date" sortKey={sortKey} sortDir={sortDir}/></span>{rh('delivery_date')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.author}} onClick={()=>onSort('author')}>
              <span className="inline-flex items-center gap-1">작성자<SortArrow col="author" sortKey={sortKey} sortDir={sortDir}/></span>{rh('author')}
            </th>
            <th className="relative group/th px-4 py-3 text-center" style={{width:w.status}}>상태{rh('status')}</th>
            <th className="relative group/th px-4 py-3 text-center" style={{width:w.converted}}>전환{rh('converted')}</th>
            <th className="px-4 py-3 text-center" style={{width:w.del}}>삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => {
            const isGroup = row.type === '배관+덕트'
            return (
              <tr key={`${row.type}-${row.id}`} onClick={() => onNavigate(row.type, row.id)}
                className={`cursor-pointer transition-colors ${isGroup ? 'bg-purple-50/40 hover:bg-purple-50' : 'bg-white hover:bg-blue-50'}`}>
                <td className="px-4 py-3 text-gray-400 text-xs text-center">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    row.type === '배관' ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : row.type === '덕트' ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>{row.type}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{row.order_date?.slice(0, 10) ?? '-'}</td>
                <td className="px-4 py-3 font-medium">{row.vendor}</td>
                <td className="px-4 py-3">{row.project || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{row.delivery_date?.slice(0, 10) || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{row.author || '-'}</td>
                <td className="px-4 py-3 text-center">
                  {isGroup && row.subQuotes ? (
                    <div className="flex flex-col gap-0.5 items-center">
                      {row.subQuotes.map((s, j) => (
                        <span key={j} className={`text-xs px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
                          s.type === '배관' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                        }`}>{s.type} {s.status}</span>
                      ))}
                    </div>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[row.status]}`}>{row.status}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {isGroup ? <span className="text-gray-300 text-xs">—</span>
                    : row.converted_id ? <span className="text-xs text-green-600 font-medium">✓ 전환됨</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {!isGroup && <DeleteBtn id={row.id} deletingId={deletingId} onClick={e => { e.stopPropagation(); onDelete(row) }} />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── 배관 탭 ──────────────────────────────────────────────────────────────
const PIPE_COL_DEFAULTS: Record<string,number> = { order_date:90, vendor:110, project:160, delivery_date:88, contact_name:80, author:72, status:80, converted:64 }
const PIPE_COL_KEY = 'quote_pipe_col_widths'

function PipeTable({ rows, sortKey, sortDir, onSort, deletingId, onNavigate, onDelete }: {
  rows: PipeQuote[]; sortKey: string | null; sortDir: SortDir; onSort: (k: string) => void
  deletingId: string | null; onNavigate: (id: string) => void; onDelete: (q: PipeQuote) => void
}) {
  const [w, setW] = useState<Record<string,number>>(() => {
    try { const s = JSON.parse(localStorage.getItem(PIPE_COL_KEY) ?? 'null'); return s ? {...PIPE_COL_DEFAULTS,...s} : PIPE_COL_DEFAULTS } catch { return PIPE_COL_DEFAULTS }
  })
  const rh = (col: string) => <ResizeHandle col={col} widths={w} setWidths={setW} storageKey={PIPE_COL_KEY} />

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="px-4 py-3 text-left w-10">No.</th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.order_date}} onClick={()=>onSort('order_date')}>
              <span className="inline-flex items-center gap-1">작성일<SortArrow col="order_date" sortKey={sortKey} sortDir={sortDir}/></span>{rh('order_date')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.vendor}} onClick={()=>onSort('vendor')}>
              <span className="inline-flex items-center gap-1">업체<SortArrow col="vendor" sortKey={sortKey} sortDir={sortDir}/></span>{rh('vendor')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.project}} onClick={()=>onSort('project')}>
              <span className="inline-flex items-center gap-1">현장명<SortArrow col="project" sortKey={sortKey} sortDir={sortDir}/></span>{rh('project')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.delivery_date}} onClick={()=>onSort('delivery_date')}>
              <span className="inline-flex items-center gap-1">유효기간<SortArrow col="delivery_date" sortKey={sortKey} sortDir={sortDir}/></span>{rh('delivery_date')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.contact_name}} onClick={()=>onSort('contact_name')}>
              <span className="inline-flex items-center gap-1">인수자<SortArrow col="contact_name" sortKey={sortKey} sortDir={sortDir}/></span>{rh('contact_name')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.author}} onClick={()=>onSort('author')}>
              <span className="inline-flex items-center gap-1">작성자<SortArrow col="author" sortKey={sortKey} sortDir={sortDir}/></span>{rh('author')}
            </th>
            <th className="relative group/th px-4 py-3 text-center" style={{width:w.status}}>상태{rh('status')}</th>
            <th className="relative group/th px-4 py-3 text-center" style={{width:w.converted}}>전환{rh('converted')}</th>
            <th className="px-4 py-3 text-center w-12">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((q, i) => (
            <tr key={q.id} onClick={() => onNavigate(q.id)}
              className="bg-white hover:bg-blue-50 cursor-pointer transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs text-center">{i + 1}</td>
              <td className="px-4 py-3 text-gray-500">{q.order_date?.slice(0, 10) ?? '-'}</td>
              <td className="px-4 py-3 font-medium">{q.vendor}</td>
              <td className="px-4 py-3">{q.project || '-'}</td>
              <td className="px-4 py-3 text-gray-500">{q.delivery_date?.slice(0, 10) ?? '-'}</td>
              <td className="px-4 py-3 text-gray-500">{q.contact_name || '-'}</td>
              <td className="px-4 py-3 text-gray-500">{q.author || '-'}</td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[q.status]}`}>{q.status}</span>
              </td>
              <td className="px-4 py-3 text-center">
                {q.converted_order_id
                  ? <span className="text-xs text-green-600 font-medium">✓ 전환됨</span>
                  : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <DeleteBtn id={q.id} deletingId={deletingId} onClick={e => { e.stopPropagation(); onDelete(q) }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 덕트 탭 ──────────────────────────────────────────────────────────────
const DUCT_COL_DEFAULTS: Record<string,number> = { order_date:90, manufacturer:100, customer_name:110, project:160, delivery_date:88, author:72, status:80, converted:64 }
const DUCT_COL_KEY = 'quote_duct_col_widths'

function DuctTable({ rows, sortKey, sortDir, onSort, deletingId, onNavigate, onDelete }: {
  rows: DuctQuote[]; sortKey: string | null; sortDir: SortDir; onSort: (k: string) => void
  deletingId: string | null; onNavigate: (id: string) => void; onDelete: (q: DuctQuote) => void
}) {
  const [w, setW] = useState<Record<string,number>>(() => {
    try { const s = JSON.parse(localStorage.getItem(DUCT_COL_KEY) ?? 'null'); return s ? {...DUCT_COL_DEFAULTS,...s} : DUCT_COL_DEFAULTS } catch { return DUCT_COL_DEFAULTS }
  })
  const rh = (col: string) => <ResizeHandle col={col} widths={w} setWidths={setW} storageKey={DUCT_COL_KEY} />

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm min-w-[750px]">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="px-4 py-3 text-left w-10">No.</th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.order_date}} onClick={()=>onSort('order_date')}>
              <span className="inline-flex items-center gap-1">작성일<SortArrow col="order_date" sortKey={sortKey} sortDir={sortDir}/></span>{rh('order_date')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.manufacturer}} onClick={()=>onSort('manufacturer')}>
              <span className="inline-flex items-center gap-1">제조사<SortArrow col="manufacturer" sortKey={sortKey} sortDir={sortDir}/></span>{rh('manufacturer')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.customer_name}} onClick={()=>onSort('customer_name')}>
              <span className="inline-flex items-center gap-1">업체<SortArrow col="customer_name" sortKey={sortKey} sortDir={sortDir}/></span>{rh('customer_name')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.project}} onClick={()=>onSort('project')}>
              <span className="inline-flex items-center gap-1">현장명<SortArrow col="project" sortKey={sortKey} sortDir={sortDir}/></span>{rh('project')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.delivery_date}} onClick={()=>onSort('delivery_date')}>
              <span className="inline-flex items-center gap-1">유효기간<SortArrow col="delivery_date" sortKey={sortKey} sortDir={sortDir}/></span>{rh('delivery_date')}
            </th>
            <th className="relative group/th px-4 py-3 text-left cursor-pointer select-none" style={{width:w.author}} onClick={()=>onSort('author')}>
              <span className="inline-flex items-center gap-1">작성자<SortArrow col="author" sortKey={sortKey} sortDir={sortDir}/></span>{rh('author')}
            </th>
            <th className="relative group/th px-4 py-3 text-center" style={{width:w.status}}>상태{rh('status')}</th>
            <th className="relative group/th px-4 py-3 text-center" style={{width:w.converted}}>전환{rh('converted')}</th>
            <th className="px-4 py-3 text-center w-12">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((q, i) => (
            <tr key={q.id} onClick={() => onNavigate(q.id)}
              className="bg-white hover:bg-blue-50 cursor-pointer transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs text-center">{i + 1}</td>
              <td className="px-4 py-3 text-gray-500">{q.order_date?.slice(0, 10) ?? '-'}</td>
              <td className="px-4 py-3 font-medium">{q.manufacturer}</td>
              <td className="px-4 py-3">{q.customer_name || '-'}</td>
              <td className="px-4 py-3">{q.project || '-'}</td>
              <td className="px-4 py-3 text-gray-500">{q.delivery_date?.slice(0, 10) ?? '-'}</td>
              <td className="px-4 py-3 text-gray-500">{q.author || '-'}</td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[q.status]}`}>{q.status}</span>
              </td>
              <td className="px-4 py-3 text-center">
                {q.converted_duct_order_id
                  ? <span className="text-xs text-green-600 font-medium">✓ 전환됨</span>
                  : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <DeleteBtn id={q.id} deletingId={deletingId} onClick={e => { e.stopPropagation(); onDelete(q) }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 공통 ─────────────────────────────────────────────────────────────────
function DeleteBtn({ id, deletingId, onClick }: { id: string; deletingId: string | null; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} disabled={deletingId === id}
      className="text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer">
      {deletingId === id ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    </button>
  )
}

function SortArrow({ col, sortKey, sortDir }: { col: string; sortKey: string | null; sortDir: SortDir }) {
  const active = sortKey === col
  return (
    <span className={`transition-colors ${active ? 'text-[#014A99]' : 'text-gray-300'}`}>
      {active && sortDir === 'asc' ? '↑' : active && sortDir === 'desc' ? '↓' : '↕'}
    </span>
  )
}

function SortTh({ label, col, sortKey, sortDir, onSort, className = '' }: {
  label: string; col: string; sortKey: string | null; sortDir: SortDir; onSort: (col: string) => void; className?: string
}) {
  return (
    <th className={`px-4 py-3 text-left cursor-pointer select-none hover:text-gray-700 group ${className}`} onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}<SortArrow col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  )
}
