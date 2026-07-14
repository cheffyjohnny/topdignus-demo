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
      if (results.some(r => !r.ok)) throw new Error('Save failed')
      setMessage({ type: 'success', text: `${totalChanged} item(s) saved` })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'An error occurred' })
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
      if (!res.ok) throw new Error('Add failed')
      setAddingMfr(false)
      setNewMfrName('')
      setNewMfrType('per_m')
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Failed to add manufacturer.' })
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
      if (!res.ok) throw new Error(data.error ?? 'Rename failed')
      setRenamingMfr(null)
      await load()
    } catch (e: any) {
      setRenameError(e.message ?? 'An error occurred')
    }
    setRenameSaving(false)
  }

  async function handleDeleteMfr() {
    if (!deletingMfr) return
    setDeletingMfrLoading(true)
    try {
      const res = await fetch(`/api/duct-prices?manufacturer=${encodeURIComponent(deletingMfr)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDeletingMfr(null)
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete manufacturer.' })
    }
    setDeletingMfrLoading(false)
  }

  async function handleSaveCustomer() {
    if (!modalName.trim()) {
      setModalError('Please enter a company name.')
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
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setCustomerModal(null)
      await load()
    } catch (e: any) {
      setModalError(e.message ?? 'An error occurred')
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
      if (!res.ok) throw new Error('Delete failed')
      setCustomerModal(null)
      setModalConfirmDelete(false)
      await load()
    } catch (e: any) {
      setModalError(e.message ?? 'Delete error')
      setModalConfirmDelete(false)
    }
    setModalDeleting(false)
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Duct Pricing Management</h1>
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
            {saving ? 'Saving...' : `Save Changes${totalChanged > 0 ? ` (${totalChanged})` : ''}`}
          </button>
        </div>
      </div>

      {/* Purchase price */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Purchase Price</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[550px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="px-2 py-2.5 w-8" />
                <th className="px-4 py-2.5 text-left font-medium w-36">Manufacturer</th>
                <th className="px-4 py-2.5 text-center font-medium w-28">Price Type</th>
                <th className="px-4 py-2.5 text-right font-medium w-40 text-blue-600">Riser Cost</th>
                <th className="px-4 py-2.5 text-right font-medium w-40 text-blue-600">Wall Cost</th>
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
                      {row.price_type === 'per_m' ? 'Per meter (m)' : 'Per unit (ea)'}
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
                        title="Rename"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingMfr(row.manufacturer)}
                        className="text-gray-400 hover:text-red-500 cursor-pointer"
                        title="Delete Manufacturer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Inline add-manufacturer form */}
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
                      placeholder="Manufacturer name"
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <select
                      value={newMfrType}
                      onChange={e => setNewMfrType(e.target.value as 'per_m' | 'per_item')}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] cursor-pointer"
                    >
                      <option value="per_m">Per meter (m)</option>
                      <option value="per_item">Per unit (ea)</option>
                    </select>
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-xs text-gray-400">Edit price after saving</td>
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
                Add Manufacturer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Heat insulator purchase price */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Heat Insulator Purchase Price</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[450px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="px-4 py-2.5 text-left font-medium w-36">Manufacturer</th>
                <th className="px-4 py-2.5 text-right font-medium w-52 text-orange-600">50T×400×3.6M (₩/roll)</th>
                <th className="px-4 py-2.5 text-right font-medium w-52 text-orange-600">25T×400×7.2M (₩/roll)</th>
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
                  <td colSpan={3} className="px-4 py-4 text-xs text-gray-400 text-center">No manufacturers registered.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Sale price by customer */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Sale Price by Customer</h2>
        {ductPrices.length === 0 ? (
          <p className="text-sm text-gray-400">No manufacturers registered.</p>
        ) : (() => {
          const activeMfr = ductPrices.find(d => d.manufacturer === selectedMfrTab) ?? ductPrices[0]
          return (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Manufacturer tabs */}
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

              {/* Selected manufacturer table */}
              {customers.length > 0 && (
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[550px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                      <th className="px-4 py-2.5 text-left font-medium w-36">Customer</th>
                      <th className="px-4 py-2.5 text-right font-medium w-36">
                        Riser {activeMfr.price_type === 'per_m' ? '(m)' : '(ea)'}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium w-36">
                        Wall {activeMfr.price_type === 'per_m' ? '(m)' : '(ea)'}
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium w-36 text-orange-500">50T (roll)</th>
                      <th className="px-4 py-2.5 text-right font-medium w-36 text-orange-500">25T (roll)</th>
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
                              title="Edit Customer"
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
                  Add Customer
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Add/edit customer modal */}
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
                    <p className="text-sm font-bold text-gray-900">Delete Customer</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Delete <span className="font-semibold text-gray-700">{modalName}</span>?
                    </p>
                  </div>
                </div>
                {modalError && <p className="text-xs text-red-500">{modalError}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setModalConfirmDelete(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
                  <button
                    onClick={handleDeleteCustomer}
                    disabled={modalDeleting}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    {modalDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-gray-900">
                  {customerModal.mode === 'add' ? 'Add Customer' : 'Edit Customer'}
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                    <input
                      autoFocus
                      type="text"
                      value={modalName}
                      onChange={e => setModalName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCustomer() }}
                      placeholder="Enter company name"
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
                      Delete
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => setCustomerModal(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCustomer}
                    disabled={modalSaving}
                    className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                    style={{ backgroundColor: '#014A99' }}
                  >
                    {modalSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rename manufacturer modal */}
      {renamingMfr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setRenamingMfr(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Rename Manufacturer</h2>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500">Current Name</label>
              <p className="text-sm font-semibold text-gray-700">{renamingMfr}</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500">New Name</label>
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
              <button onClick={() => setRenamingMfr(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button
                onClick={handleRenameMfr}
                disabled={renameSaving || !renameValue.trim() || renameValue.trim() === renamingMfr}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: '#014A99' }}
              >
                {renameSaving ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete manufacturer confirmation dialog */}
      {deletingMfr && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="font-bold text-gray-900">Delete Manufacturer</h3>
            <p className="text-sm text-gray-600">
              Delete <span className="font-semibold">{deletingMfr}</span>?<br />
              <span className="text-red-500">All related sale price data will also be deleted.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingMfr(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMfr}
                disabled={deletingMfrLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {deletingMfrLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
