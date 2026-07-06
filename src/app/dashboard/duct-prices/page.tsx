'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PriceInput } from '@/components/PriceInput'

interface DuctPrice {
  manufacturer: string
  price_type: 'per_m' | 'per_item'
  riser_price: number
  wall_price: number
  insul_50t_price: number
  insul_25t_price: number
  sort_order: number | null
  changed: boolean
}

interface DuctSalePrice {
  id?: string
  manufacturer: string
  customer_id: string
  riser_sale_price: number
  wall_sale_price: number
  insul_50t_sale_price: number
  insul_25t_sale_price: number
  changed: boolean
}

interface Customer {
  id: string
  name: string
  sale_pct?: number
}

export default function DuctPricesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [ductPrices, setDuctPrices] = useState<DuctPrice[]>([])
  const [salePrices, setSalePrices] = useState<Map<string, DuctSalePrice>>(new Map())
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 드래그 순서 변경
  const [orderChanged, setOrderChanged] = useState(false)
  const draggingIdx = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // 거래처별 판매가 탭
  const [selectedMfrTab, setSelectedMfrTab] = useState('')

  // 제조사 추가 폼
  const [addingMfr, setAddingMfr] = useState(false)
  const [newMfrName, setNewMfrName] = useState('')
  const [newMfrType, setNewMfrType] = useState<'per_m' | 'per_item'>('per_m')
  const [addingMfrLoading, setAddingMfrLoading] = useState(false)

  // 제조사 삭제 확인
  const [deletingMfr, setDeletingMfr] = useState<string | null>(null)
  const [deletingMfrLoading, setDeletingMfrLoading] = useState(false)

  // 제조사 이름 변경
  const [renamingMfr, setRenamingMfr] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [renameError, setRenameError] = useState('')

  // 거래처 추가/편집 모달
  const [customerModal, setCustomerModal] = useState<null | { mode: 'add' } | { mode: 'edit'; customer: Customer }>(null)
  const [modalName, setModalName] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalConfirmDelete, setModalConfirmDelete] = useState(false)
  const [modalDeleting, setModalDeleting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') router.replace('/dashboard')
  }, [status, session, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dpRes, spRes, custRes] = await Promise.all([
        fetch('/api/duct-prices'),
        fetch('/api/duct-sale-prices'),
        fetch('/api/customers'),
      ])
      const [dp, sp, cust] = await Promise.all([dpRes.json(), spRes.json(), custRes.json()])

      setDuctPrices(Array.isArray(dp) ? dp.map((r: any) => ({ ...r, insul_50t_price: r.insul_50t_price ?? 0, insul_25t_price: r.insul_25t_price ?? 0, changed: false })) : [])
      setOrderChanged(false)

      const map = new Map<string, DuctSalePrice>()
      if (Array.isArray(sp)) {
        for (const row of sp) {
          map.set(`${row.manufacturer}_${row.customer_id}`, {
            ...row,
            insul_50t_sale_price: row.insul_50t_sale_price ?? 0,
            insul_25t_sale_price: row.insul_25t_sale_price ?? 0,
            changed: false,
          })
        }
      }
      setSalePrices(map)
      setCustomers(Array.isArray(cust) ? cust : [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') load()
  }, [status, session, load])

  function handleInsulPriceChange(manufacturer: string, field: 'insul_50t_price' | 'insul_25t_price', num: number) {
    setDuctPrices(prev => prev.map(r =>
      r.manufacturer === manufacturer ? { ...r, [field]: num, changed: true } : r
    ))
  }

  function handleDuctPriceChange(manufacturer: string, field: 'riser_price' | 'wall_price', num: number) {
    setDuctPrices(prev => prev.map(r =>
      r.manufacturer === manufacturer ? { ...r, [field]: num, changed: true } : r
    ))
  }

function handleSalePriceChange(manufacturer: string, customerId: string, field: 'riser_sale_price' | 'wall_sale_price' | 'insul_50t_sale_price' | 'insul_25t_sale_price', num: number) {
    const key = `${manufacturer}_${customerId}`
    setSalePrices(prev => {
      const next = new Map(prev)
      const existing = next.get(key) ?? { manufacturer, customer_id: customerId, riser_sale_price: 0, wall_sale_price: 0, insul_50t_sale_price: 0, insul_25t_sale_price: 0, changed: false }
      next.set(key, { ...existing, [field]: num, changed: true })
      return next
    })
  }

  const changedDuctPrices = ductPrices.filter(r => r.changed)
  const changedSalePrices = Array.from(salePrices.values()).filter(r => r.changed)
  const totalChanged = (orderChanged ? ductPrices.length : changedDuctPrices.length) + changedSalePrices.length

  function handleDragStart(idx: number) {
    draggingIdx.current = idx
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function handleDrop(idx: number) {
    const from = draggingIdx.current
    if (from === null || from === idx) {
      draggingIdx.current = null
      setDragOverIdx(null)
      return
    }
    const next = [...ductPrices]
    const [moved] = next.splice(from, 1)
    next.splice(idx, 0, moved)
    setDuctPrices(next.map((r, i) => ({ ...r, sort_order: i + 1 })))
    setOrderChanged(true)
    draggingIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    draggingIdx.current = null
    setDragOverIdx(null)
  }

  async function handleSave() {
    if (totalChanged === 0) return
    setSaving(true)
    setMessage(null)
    try {
      const promises: Promise<Response>[] = []
      const ductPricesToSave = orderChanged ? ductPrices : changedDuctPrices
      if (ductPricesToSave.length > 0) {
        promises.push(fetch('/api/duct-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ductPricesToSave.map(({ changed: _, ...r }) => r)),
        }))
      }
      if (changedSalePrices.length > 0) {
        promises.push(fetch('/api/duct-sale-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changedSalePrices.map(({ changed: _, ...r }) => r)),
        }))
      }
      const results = await Promise.all(promises)
      if (results.some(r => !r.ok)) throw new Error('저장 실패')
      setMessage({ type: 'success', text: `${totalChanged}개 항목 저장 완료` })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? '오류 발생' })
    }
    setSaving(false)
  }

  async function handleAddMfr() {
    if (!newMfrName.trim()) return
    setAddingMfrLoading(true)
    try {
      const res = await fetch('/api/duct-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ manufacturer: newMfrName.trim(), price_type: newMfrType, riser_price: 0, wall_price: 0 }]),
      })
      if (!res.ok) throw new Error('추가 실패')
      setAddingMfr(false)
      setNewMfrName('')
      setNewMfrType('per_m')
      await load()
    } catch {
      setMessage({ type: 'error', text: '제조사 추가에 실패했습니다.' })
    }
    setAddingMfrLoading(false)
  }

  async function handleRenameMfr() {
    if (!renamingMfr || !renameValue.trim()) return
    setRenameSaving(true)
    setRenameError('')
    try {
      const res = await fetch('/api/duct-prices/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName: renamingMfr, newName: renameValue.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '변경 실패')
      setRenamingMfr(null)
      await load()
    } catch (e: any) {
      setRenameError(e.message ?? '오류 발생')
    }
    setRenameSaving(false)
  }

  async function handleDeleteMfr() {
    if (!deletingMfr) return
    setDeletingMfrLoading(true)
    try {
      const res = await fetch(`/api/duct-prices?manufacturer=${encodeURIComponent(deletingMfr)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      setDeletingMfr(null)
      await load()
    } catch {
      setMessage({ type: 'error', text: '제조사 삭제에 실패했습니다.' })
    }
    setDeletingMfrLoading(false)
  }

  async function handleSaveCustomer() {
    if (!modalName.trim()) {
      setModalError('업체명을 입력하세요.')
      return
    }
    setModalSaving(true)
    setModalError('')
    try {
      const body: any = { name: modalName.trim(), sale_pct: 100 }
      if (customerModal?.mode === 'edit') {
        body.id = (customerModal as any).customer.id
        body.sale_pct = (customerModal as any).customer.sale_pct ?? 100
      }
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '저장 실패')
      setCustomerModal(null)
      await load()
    } catch (e: any) {
      setModalError(e.message ?? '오류 발생')
    }
    setModalSaving(false)
  }

  function openAddCustomer() {
    setModalName('')
    setModalError('')
    setModalConfirmDelete(false)
    setCustomerModal({ mode: 'add' })
  }

  function openEditCustomer(c: Customer) {
    setModalName(c.name)
    setModalError('')
    setModalConfirmDelete(false)
    setCustomerModal({ mode: 'edit', customer: c })
  }

  async function handleDeleteCustomer() {
    if (customerModal?.mode !== 'edit') return
    const id = (customerModal as any).customer.id
    setModalDeleting(true)
    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      setCustomerModal(null)
      setModalConfirmDelete(false)
      await load()
    } catch (e: any) {
      setModalError(e.message ?? '삭제 오류')
      setModalConfirmDelete(false)
    }
    setModalDeleting(false)
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">덕트 단가 관리</h1>
        <div className="flex items-center gap-2">
          {message && (
            <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || totalChanged === 0}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition-opacity cursor-pointer"
            style={{ backgroundColor: '#014A99' }}
          >
            {saving ? '저장 중...' : `변경사항 저장${totalChanged > 0 ? ` (${totalChanged})` : ''}`}
          </button>
        </div>
      </div>

      {/* 매입 단가 */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">매입 단가</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[550px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="px-2 py-2.5 w-8" />
                <th className="px-4 py-2.5 text-left font-medium w-36">제조사</th>
                <th className="px-4 py-2.5 text-center font-medium w-28">가격 방식</th>
                <th className="px-4 py-2.5 text-right font-medium w-40 text-blue-600">입상 매입가</th>
                <th className="px-4 py-2.5 text-right font-medium w-40 text-blue-600">벽체 매입가</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ductPrices.map((row, idx) => (
                <tr
                  key={row.manufacturer}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`${dragOverIdx === idx ? 'bg-blue-50 border-t-2 border-blue-300' : row.changed ? 'bg-amber-50' : 'hover:bg-gray-50/50'} group`}
                >
                  <td className="px-2 py-2.5 text-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                    <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                    </svg>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.manufacturer}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {row.price_type === 'per_m' ? '미터당 (m)' : '개당 (ea)'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <PriceInput
                      value={row.riser_price ?? 0}
                      onChange={num => handleDuctPriceChange(row.manufacturer, 'riser_price', num)}
                      className="w-32 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <PriceInput
                      value={row.wall_price ?? 0}
                      onChange={num => handleDuctPriceChange(row.manufacturer, 'wall_price', num)}
                      className="w-32 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setRenamingMfr(row.manufacturer); setRenameValue(row.manufacturer); setRenameError('') }}
                        className="text-gray-400 hover:text-[#014A99] cursor-pointer"
                        title="이름 변경"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingMfr(row.manufacturer)}
                        className="text-gray-400 hover:text-red-500 cursor-pointer"
                        title="제조사 삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* 제조사 추가 인라인 폼 */}
              {addingMfr && (
                <tr className="bg-blue-50/50">
                  <td className="px-2 py-2" />
                  <td className="px-3 py-2">
                    <input
                      autoFocus
                      type="text"
                      value={newMfrName}
                      onChange={e => setNewMfrName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddMfr(); if (e.key === 'Escape') setAddingMfr(false) }}
                      placeholder="제조사명"
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <select
                      value={newMfrType}
                      onChange={e => setNewMfrType(e.target.value as 'per_m' | 'per_item')}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] cursor-pointer"
                    >
                      <option value="per_m">미터당 (m)</option>
                      <option value="per_item">개당 (ea)</option>
                    </select>
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-xs text-gray-400">단가는 저장 후 편집</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-center">
                      <button
                        onClick={handleAddMfr}
                        disabled={addingMfrLoading || !newMfrName.trim()}
                        className="text-green-600 hover:text-green-700 disabled:opacity-40 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setAddingMfr(false); setNewMfrName(''); setNewMfrType('per_m') }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {!addingMfr && (
            <div className="px-4 py-2.5 border-t border-gray-100">
              <button
                onClick={() => setAddingMfr(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#014A99] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                제조사 추가
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 차열재 매입 단가 */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">차열재 매입 단가</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[450px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="px-4 py-2.5 text-left font-medium w-36">제조사</th>
                <th className="px-4 py-2.5 text-right font-medium w-52 text-orange-600">50T×400×3.6M (원/롤)</th>
                <th className="px-4 py-2.5 text-right font-medium w-52 text-orange-600">25T×400×7.2M (원/롤)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ductPrices.map(row => (
                <tr key={row.manufacturer} className={row.changed ? 'bg-amber-50' : 'hover:bg-gray-50/50'}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{row.manufacturer}</td>
                  <td className="px-3 py-2 text-right">
                    <PriceInput
                      value={row.insul_50t_price ?? 0}
                      onChange={num => handleInsulPriceChange(row.manufacturer, 'insul_50t_price', num)}
                      className="w-36 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <PriceInput
                      value={row.insul_25t_price ?? 0}
                      onChange={num => handleInsulPriceChange(row.manufacturer, 'insul_25t_price', num)}
                      className="w-36 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                    />
                  </td>
                </tr>
              ))}
              {ductPrices.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-xs text-gray-400 text-center">등록된 제조사가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* 거래처별 판매가 */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">거래처별 판매가</h2>
        {ductPrices.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 제조사가 없습니다.</p>
        ) : (() => {
          const activeMfr = ductPrices.find(d => d.manufacturer === selectedMfrTab) ?? ductPrices[0]
          return (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* 제조사 탭 */}
              {ductPrices.length > 1 && (
                <div className="flex border-b border-gray-200 bg-gray-50/80">
                  {ductPrices.map(mfr => {
                    const isActive = mfr.manufacturer === activeMfr.manufacturer
                    const hasChanges = customers.some(c => salePrices.get(`${mfr.manufacturer}_${c.id}`)?.changed)
                    return (
                      <button
                        key={mfr.manufacturer}
                        onClick={() => setSelectedMfrTab(mfr.manufacturer)}
                        className={`relative px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                          isActive
                            ? 'border-[#014A99] text-[#014A99] bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
                        }`}
                      >
                        {mfr.manufacturer}
                        {hasChanges && (
                          <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 선택된 제조사 테이블 */}
              {customers.length > 0 && (
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[550px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <th className="px-4 py-2.5 text-left font-medium w-36">거래처</th>
                      <th className="px-4 py-2.5 text-right font-medium w-36">
                        입상 {activeMfr.price_type === 'per_m' ? '(m)' : '(ea)'}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium w-36">
                        벽체 {activeMfr.price_type === 'per_m' ? '(m)' : '(ea)'}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium w-36 text-orange-500">50T (롤)</th>
                      <th className="px-4 py-2.5 text-right font-medium w-36 text-orange-500">25T (롤)</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map(customer => {
                      const sp = salePrices.get(`${activeMfr.manufacturer}_${customer.id}`)
                      const rowChanged = sp?.changed ?? false
                      return (
                        <tr key={customer.id} className={rowChanged ? 'bg-amber-50' : 'hover:bg-gray-50/50 group'}>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{customer.name}</td>
                          <td className="px-3 py-2 text-right">
                            <PriceInput
                              value={sp?.riser_sale_price ?? 0}
                              onChange={num => handleSalePriceChange(activeMfr.manufacturer, customer.id, 'riser_sale_price', num)}
                              className="w-32 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <PriceInput
                              value={sp?.wall_sale_price ?? 0}
                              onChange={num => handleSalePriceChange(activeMfr.manufacturer, customer.id, 'wall_sale_price', num)}
                              className="w-32 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <PriceInput
                              value={sp?.insul_50t_sale_price ?? 0}
                              onChange={num => handleSalePriceChange(activeMfr.manufacturer, customer.id, 'insul_50t_sale_price', num)}
                              className="w-32 text-right text-xs border border-orange-200 rounded px-2 py-1 focus:outline-none focus:border-orange-400 font-medium"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <PriceInput
                              value={sp?.insul_25t_sale_price ?? 0}
                              onChange={num => handleSalePriceChange(activeMfr.manufacturer, customer.id, 'insul_25t_sale_price', num)}
                              className="w-32 text-right text-xs border border-orange-200 rounded px-2 py-1 focus:outline-none focus:border-orange-400 font-medium"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => openEditCustomer(customer)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-[#014A99] cursor-pointer"
                              title="거래처 편집"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              )}

              <div className="px-4 py-2.5 border-t border-gray-100">
                <button
                  onClick={openAddCustomer}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#014A99] transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  거래처 추가
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {/* 거래처 추가/편집 모달 */}
      {customerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            {modalConfirmDelete ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">거래처 삭제</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-semibold text-gray-700">{modalName}</span>을(를) 삭제하시겠습니까?
                    </p>
                  </div>
                </div>
                {modalError && <p className="text-xs text-red-500">{modalError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setModalConfirmDelete(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">취소</button>
                  <button
                    onClick={handleDeleteCustomer}
                    disabled={modalDeleting}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    {modalDeleting ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-gray-900">
                  {customerModal.mode === 'add' ? '거래처 추가' : '거래처 편집'}
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">업체명</label>
                    <input
                      autoFocus
                      type="text"
                      value={modalName}
                      onChange={e => setModalName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCustomer() }}
                      placeholder="업체명 입력"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
                    />
                  </div>
                  {modalError && <p className="text-xs text-red-500">{modalError}</p>}
                </div>
                <div className="flex gap-2">
                  {customerModal.mode === 'edit' && (
                    <button
                      onClick={() => setModalConfirmDelete(true)}
                      className="px-3 py-2 text-sm text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      삭제
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => setCustomerModal(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveCustomer}
                    disabled={modalSaving}
                    className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                    style={{ backgroundColor: '#014A99' }}
                  >
                    {modalSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 제조사 이름 변경 모달 */}
      {renamingMfr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setRenamingMfr(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">제조사 이름 변경</h2>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500">현재 이름</label>
              <p className="text-sm font-semibold text-gray-700">{renamingMfr}</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500">새 이름</label>
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameMfr(); if (e.key === 'Escape') setRenamingMfr(null) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
              />
              {renameError && <p className="text-xs text-red-500">{renameError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenamingMfr(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">취소</button>
              <button
                onClick={handleRenameMfr}
                disabled={renameSaving || !renameValue.trim() || renameValue.trim() === renamingMfr}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: '#014A99' }}
              >
                {renameSaving ? '변경 중...' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 제조사 삭제 확인 다이얼로그 */}
      {deletingMfr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="font-bold text-gray-900">제조사 삭제</h3>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{deletingMfr}</span>을(를) 삭제하시겠습니까?<br />
              <span className="text-red-500">관련 판매가 데이터도 모두 삭제됩니다.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingMfr(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleDeleteMfr}
                disabled={deletingMfrLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {deletingMfrLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
