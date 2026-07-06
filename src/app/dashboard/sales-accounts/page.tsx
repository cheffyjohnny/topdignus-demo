'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

interface SalesAccount {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  email: string | null
  notes: string | null
  priority: number
  created_at: string
}

type SortKey = 'priority' | 'name' | 'contact_name' | 'contact_phone' | 'email' | 'created_at'
type SortDir = 'asc' | 'desc'

const COL_KEY = 'sales_accounts_col_widths'
const COL_DEFAULTS: Record<string, number> = {
  priority: 110, name: 180, contact_name: 110, contact_phone: 130, email: 180, created_at: 100,
}

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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n}
          onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="cursor-pointer focus:outline-none" title={`중요도 ${n}`}>
          <svg className={`w-4 h-4 transition-colors ${n <= (hovered || value) ? 'text-red-500 fill-red-500' : 'text-gray-300 fill-none'}`}
            stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function SalesAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<SalesAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try { return { ...COL_DEFAULTS, ...JSON.parse(localStorage.getItem(COL_KEY) ?? '{}') } }
    catch { return { ...COL_DEFAULTS } }
  })

  useEffect(() => {
    fetch('/api/sales-accounts')
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const saveColWidths = useCallback((next: Record<string, number>) => {
    setColWidths(next)
    localStorage.setItem(COL_KEY, JSON.stringify(next))
  }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else { setSortKey(key); setSortDir('asc') }
  }

  function makeResizeHandler(col: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation()
      let startX = e.clientX
      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX; startX = ev.clientX
        setColWidths(prev => { const next = { ...prev, [col]: Math.max(50, (prev[col] ?? COL_DEFAULTS[col] ?? 100) + dx) }; localStorage.setItem(COL_KEY, JSON.stringify(next)); return next })
      }
      const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    }
  }

  async function handlePriority(id: string, priority: number) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, priority } : a))
    const res = await fetch('/api/sales-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, priority }),
    })
    if (res.ok) {
      toast.success(priority === 0 ? '중요도를 제거했습니다.' : `중요도 ${priority}성으로 저장했습니다.`)
    } else {
      toast.error('저장 실패')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 거래처를 삭제하시겠습니까?\n연결된 영업현장의 업체 정보도 함께 해제됩니다.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/sales-accounts?id=${id}`, { method: 'DELETE' })
      if (res.ok) { setAccounts(prev => prev.filter(a => a.id !== id)); toast.success('삭제되었습니다.') }
      else toast.error('삭제 실패')
    } finally { setDeletingId(null) }
  }

  const q = search.trim().toLowerCase()
  let filtered = accounts.filter(a =>
    !q || [a.name, a.contact_name, a.contact_phone, a.email].some(v => v?.toLowerCase().includes(q))
  )
  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const av = sortKey === 'priority' || sortKey === 'created_at'
        ? (sortKey === 'priority' ? a.priority : new Date(a.created_at).getTime())
        : String(a[sortKey] ?? '').toLowerCase()
      const bv = sortKey === 'priority' || sortKey === 'created_at'
        ? (sortKey === 'priority' ? b.priority : new Date(b.created_at).getTime())
        : String(b[sortKey] ?? '').toLowerCase()
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'ko')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  const SortTh = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => {
    const active = sortKey === col
    return (
      <th onClick={() => handleSort(col)}
        className={`relative group/th px-4 py-3 text-left select-none cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap ${active ? 'text-blue-600 bg-blue-50' : 'text-gray-500'} ${className}`}
        style={{ width: colWidths[col] }}>
        <span className="flex items-center gap-1">{label}<SortIcon active={active} dir={sortDir} /></span>
        <div onMouseDown={makeResizeHandler(col)}
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize z-10 group-hover/th:bg-blue-200/50 hover:!bg-blue-400/60"
          onClick={e => e.stopPropagation()} />
      </th>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">영업 거래처</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {sortKey && (
            <button onClick={() => { setSortKey(null); setSortDir('asc') }} className="text-xs text-blue-500 hover:underline cursor-pointer">
              정렬 초기화
            </button>
          )}
          <button onClick={() => { saveColWidths({ ...COL_DEFAULTS }); localStorage.removeItem(COL_KEY) }}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">열 너비 초기화</button>
          <div className="relative w-full sm:w-auto">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <button onClick={() => router.push('/dashboard/sales-accounts/new')}
            className="px-4 py-2 bg-green-800 text-white text-sm font-medium rounded-md hover:bg-green-900 cursor-pointer whitespace-nowrap">
            + 거래처 추가
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="text-sm w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide">
                <SortTh col="priority" label="중요도" />
                <SortTh col="name" label="회사명" />
                <SortTh col="contact_name" label="담당자" />
                <SortTh col="contact_phone" label="연락처" />
                <SortTh col="email" label="이메일" />
                <SortTh col="created_at" label="등록일" />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  {q ? `"${search}"에 대한 결과가 없습니다.` : '등록된 거래처가 없습니다.'}
                </td></tr>
              ) : filtered.map(account => (
                <tr key={account.id} onClick={() => router.push(`/dashboard/sales-accounts/${account.id}`)}
                  className="hover:bg-green-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3" style={{ width: colWidths.priority }} onClick={e => e.stopPropagation()}>
                    <StarRating value={account.priority} onChange={v => handlePriority(account.id, v)} />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900" style={{ width: colWidths.name }}>{account.name}</td>
                  <td className="px-4 py-3 text-gray-600" style={{ width: colWidths.contact_name }}>{account.contact_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600" style={{ width: colWidths.contact_phone }}>{account.contact_phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600" style={{ width: colWidths.email }}>{account.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500" style={{ width: colWidths.created_at }}>{new Date(account.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {account.priority > 0 && (
                        <button onClick={() => handlePriority(account.id, 0)}
                          className="text-xs text-gray-400 border border-gray-300 rounded-md px-2 py-0.5 hover:border-red-400 hover:text-red-500 cursor-pointer whitespace-nowrap transition-colors">
                          중요도 제거
                        </button>
                      )}
                      <button onClick={() => handleDelete(account.id, account.name)}
                        disabled={deletingId === account.id}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-50 cursor-pointer" title="삭제">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
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
