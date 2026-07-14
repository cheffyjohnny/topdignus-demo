'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PriceInput } from '@/components/PriceInput'

interface FireBlanketPrice {
  manufacturer: string
  item_name: string
  originalItemName: string
  spec: string
  roll_price: number
  sort_order: number | null
  changed: boolean
}

interface FireBlanketSalePrice {
  id?: string
  manufacturer: string
  item_name: string
  customer_id: string
  roll_sale_price: number
  changed: boolean
}

interface Customer {
  id: string
  name: string
  sale_pct?: number
}

const spKey = (mfr: string, item: string, cid: string) => `${mfr}|${item}|${cid}`

export default function FireBlanketPricesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [prices, setPrices] = useState<FireBlanketPrice[]>([])
  const [salePrices, setSalePrices] = useState<Map<string, FireBlanketSalePrice>>(new Map())
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 제조사 탭 (판매가 섹션)
  const [selectedMfrTab, setSelectedMfrTab] = useState('')

  // 제조사 추가 폼
  const [addingMfr, setAddingMfr] = useState(false)
  const [newMfrName, setNewMfrName] = useState('')
  const [addingMfrLoading, setAddingMfrLoading] = useState(false)

  // 품목 추가 (제조사별)
  const [addingItemForMfr, setAddingItemForMfr] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemSpec, setNewItemSpec] = useState('')
  const [addingItemLoading, setAddingItemLoading] = useState(false)

  // 제조사 삭제 확인
  const [deletingMfr, setDeletingMfr] = useState<string | null>(null)
  const [deletingMfrLoading, setDeletingMfrLoading] = useState(false)

  // 행 개별 삭제 확인
  const [deletingRow, setDeletingRow] = useState<{ manufacturer: string; item_name: string } | null>(null)
  const [deletingRowLoading, setDeletingRowLoading] = useState(false)

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
      const [fbRes, spRes, custRes] = await Promise.all([
        fetch('/api/fire-blanket-prices'),
        fetch('/api/fire-blanket-sale-prices'),
        fetch('/api/customers'),
      ])
      const [fb, sp, cust] = await Promise.all([fbRes.json(), spRes.json(), custRes.json()])

      setPrices(Array.isArray(fb) ? fb.map((r: any) => ({
        ...r,
        item_name: r.item_name ?? '',
        originalItemName: r.item_name ?? '',
        spec: r.spec ?? '',
        roll_price: r.roll_price ?? 0,
        changed: false,
      })) : [])

      const map = new Map<string, FireBlanketSalePrice>()
      if (Array.isArray(sp)) {
        for (const row of sp) {
          map.set(spKey(row.manufacturer, row.item_name ?? '', row.customer_id), {
            ...row,
            item_name: row.item_name ?? '',
            roll_sale_price: row.roll_sale_price ?? 0,
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

  const manufacturers = useMemo(() => [...new Set(prices.map(p => p.manufacturer))].sort(), [prices])

  function handlePriceChange(idx: number, num: number) {
    setPrices(prev => prev.map((r, i) => i === idx ? { ...r, roll_price: num, changed: true } : r))
  }

  function handleItemNameChange(idx: number, val: string) {
    setPrices(prev => prev.map((r, i) => i === idx ? { ...r, item_name: val, changed: true } : r))
  }

  function handleSpecChange(idx: number, val: string) {
    setPrices(prev => prev.map((r, i) => i === idx ? { ...r, spec: val, changed: true } : r))
  }

  function handleSalePriceChange(manufacturer: string, item_name: string, customerId: string, num: number) {
    const key = spKey(manufacturer, item_name, customerId)
    setSalePrices(prev => {
      const next = new Map(prev)
      const existing = next.get(key) ?? { manufacturer, item_name, customer_id: customerId, roll_sale_price: 0, changed: false }
      next.set(key, { ...existing, roll_sale_price: num, changed: true })
      return next
    })
  }

  const changedPrices = prices.filter(r => r.changed)
  const changedSalePrices = Array.from(salePrices.values()).filter(r => r.changed)
  const totalChanged = changedPrices.length + changedSalePrices.length

  async function handleSave() {
    if (totalChanged === 0) return
    setSaving(true)
    setMessage(null)
    try {
      const promises: Promise<Response>[] = []
      if (changedPrices.length > 0) {
        promises.push(fetch('/api/fire-blanket-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changedPrices.map(({ changed: _, ...r }) => r)),
          // originalItemName 포함 → 서버에서 rename 감지
        }))
      }
      if (changedSalePrices.length > 0) {
        promises.push(fetch('/api/fire-blanket-sale-prices', {
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
      const res = await fetch('/api/fire-blanket-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ manufacturer: newMfrName.trim(), item_name: '', spec: '', roll_price: 0 }]),
      })
      if (!res.ok) throw new Error('Add failed')
      setAddingMfr(false)
      setNewMfrName('')
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Failed to add manufacturer.' })
    }
    setAddingMfrLoading(false)
  }

  async function handleAddItem(manufacturer: string) {
    if (!newItemName.trim()) return
    setAddingItemLoading(true)
    try {
      const res = await fetch('/api/fire-blanket-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ manufacturer, item_name: newItemName.trim(), spec: newItemSpec.trim(), roll_price: 0 }]),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Add failed')
      }
      setAddingItemForMfr(null)
      setNewItemName('')
      setNewItemSpec('')
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Failed to add item.' })
    }
    setAddingItemLoading(false)
  }

  async function handleRenameMfr() {
    if (!renamingMfr || !renameValue.trim()) return
    setRenameSaving(true)
    setRenameError('')
    try {
      const res = await fetch('/api/fire-blanket-prices/rename', {
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
      const res = await fetch(`/api/fire-blanket-prices?manufacturer=${encodeURIComponent(deletingMfr)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDeletingMfr(null)
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete manufacturer.' })
    }
    setDeletingMfrLoading(false)
  }

  async function handleDeleteRow() {
    if (!deletingRow) return
    setDeletingRowLoading(true)
    try {
      const url = `/api/fire-blanket-prices?manufacturer=${encodeURIComponent(deletingRow.manufacturer)}&item_name=${encodeURIComponent(deletingRow.item_name)}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDeletingRow(null)
      await load()
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete item.' })
    }
    setDeletingRowLoading(false)
  }

  async function handleSaveCustomer() {
    if (!modalName.trim()) { setModalError('Please enter a company name.'); return }
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

  const INPUT_CLS = 'text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] w-full'

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>
  }

  const activeMfr = manufacturers.find(m => m === selectedMfrTab) ?? manufacturers[0] ?? ''
  const activeMfrItems = prices.filter(p => p.manufacturer === activeMfr)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Fire Blanket Pricing Management</h1>
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
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Purchase Price (per roll)</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2.5 text-left font-medium w-36">Manufacturer</th>
                  <th className="px-4 py-2.5 text-left font-medium w-40">Item</th>
                  <th className="px-4 py-2.5 text-left font-medium w-40">Spec</th>
                  <th className="px-4 py-2.5 text-right font-medium w-40 text-blue-600">Cost per Roll</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {manufacturers.map(mfr => {
                  const mfrEntries = prices.map((p, i) => ({ row: p, i })).filter(({ row }) => row.manufacturer === mfr)
                  return mfrEntries.map(({ row, i }, rowIdx) => (
                    <tr
                      key={i}
                      className={`group ${row.changed ? 'bg-amber-50' : 'hover:bg-gray-50/50'}`}
                    >
                      {/* Manufacturer: shown on first row only */}
                      {rowIdx === 0 ? (
                        <td className="px-4 py-2.5 font-medium text-gray-800 align-top" rowSpan={mfrEntries.length}>
                          <div className="flex items-center gap-1.5">
                            <span>{mfr}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setRenamingMfr(mfr); setRenameValue(mfr); setRenameError('') }}
                                className="text-gray-400 hover:text-[#014A99] cursor-pointer"
                                title="Rename"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeletingMfr(mfr)}
                                className="text-gray-400 hover:text-red-500 cursor-pointer"
                                title="Delete Manufacturer & All Items"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </td>
                      ) : null}

                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.item_name}
                          onChange={e => handleItemNameChange(i, e.target.value)}
                          placeholder="Item name"
                          className={INPUT_CLS}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.spec}
                          onChange={e => handleSpecChange(i, e.target.value)}
                          placeholder="Spec"
                          className={INPUT_CLS}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <PriceInput
                          value={row.roll_price ?? 0}
                          onChange={num => handlePriceChange(i, num)}
                          className="w-32 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setDeletingRow({ manufacturer: row.manufacturer, item_name: row.item_name })}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 cursor-pointer"
                          title="Delete Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                })}

                {/* Inline add-item form */}
                {addingItemForMfr && (
                  <tr className="bg-blue-50/50">
                    <td className="px-4 py-2 text-xs text-gray-500 font-medium">{addingItemForMfr}</td>
                    <td className="px-3 py-2">
                      <input
                        autoFocus
                        type="text"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(addingItemForMfr); if (e.key === 'Escape') { setAddingItemForMfr(null); setNewItemName(''); setNewItemSpec('') } }}
                        placeholder="Item name"
                        className={INPUT_CLS}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={newItemSpec}
                        onChange={e => setNewItemSpec(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(addingItemForMfr); if (e.key === 'Escape') { setAddingItemForMfr(null); setNewItemName(''); setNewItemSpec('') } }}
                        placeholder="Spec"
                        className={INPUT_CLS}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 text-right">Edit price after saving</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          onClick={() => handleAddItem(addingItemForMfr)}
                          disabled={addingItemLoading || !newItemName.trim()}
                          className="text-green-600 hover:text-green-700 disabled:opacity-40 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setAddingItemForMfr(null); setNewItemName(''); setNewItemSpec('') }}
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

                {/* Inline add-manufacturer form */}
                {addingMfr && (
                  <tr className="bg-blue-50/50">
                    <td className="px-3 py-2">
                      <input
                        autoFocus
                        type="text"
                        value={newMfrName}
                        onChange={e => setNewMfrName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddMfr(); if (e.key === 'Escape') { setAddingMfr(false); setNewMfrName('') } }}
                        placeholder="Manufacturer name"
                        className={INPUT_CLS}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 italic" colSpan={2}>Edit item name/spec after saving</td>
                    <td />
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
                          onClick={() => { setAddingMfr(false); setNewMfrName('') }}
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

          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4">
            {!addingMfr && (
              <button
                onClick={() => { setAddingMfr(true); setAddingItemForMfr(null) }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#014A99] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Manufacturer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sale price by customer */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Sale Price by Customer (per roll)</h2>
        {manufacturers.length === 0 ? (
          <p className="text-sm text-gray-400">No manufacturers registered.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Manufacturer tabs */}
            {manufacturers.length > 1 && (
              <div className="flex border-b border-gray-200 bg-gray-50/80">
                {manufacturers.map(mfr => {
                  const isActive = mfr === activeMfr
                  const hasChanges = customers.some(c =>
                    prices.filter(p => p.manufacturer === mfr).some(p =>
                      salePrices.get(spKey(mfr, p.item_name, c.id))?.changed
                    )
                  )
                  return (
                    <button
                      key={mfr}
                      onClick={() => setSelectedMfrTab(mfr)}
                      className={`relative px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                        isActive
                          ? 'border-[#014A99] text-[#014A99] bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
                      }`}
                    >
                      {mfr}
                      {hasChanges && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Sale price by item for selected manufacturer */}
            {customers.length > 0 && activeMfrItems.map((priceRow, idx) => (
              <div key={idx} className={idx > 0 ? 'border-t border-gray-200' : ''}>
                {/* Item header: shown only when there are 2+ items */}
                {activeMfrItems.length > 1 && (
                  <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-600">
                      {priceRow.item_name || '(Default Item)'}
                      {priceRow.spec && <span className="ml-2 font-normal text-gray-400">{priceRow.spec}</span>}
                    </span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[320px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                        <th className="px-4 py-2 text-left font-medium w-36">Customer</th>
                        <th className="px-4 py-2 text-right font-medium w-36">Sale Price per Roll</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customers.map(customer => {
                        const sp = salePrices.get(spKey(priceRow.manufacturer, priceRow.originalItemName, customer.id))
                        const rowChanged = sp?.changed ?? false
                        return (
                          <tr key={customer.id} className={rowChanged ? 'bg-amber-50' : 'hover:bg-gray-50/50 group'}>
                            <td className="px-4 py-2 font-medium text-gray-800">{customer.name}</td>
                            <td className="px-3 py-1.5 text-right">
                              <PriceInput
                                value={sp?.roll_sale_price ?? 0}
                                onChange={num => handleSalePriceChange(priceRow.manufacturer, priceRow.originalItemName, customer.id, num)}
                                className="w-32 text-right text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                onClick={() => { setModalName(customer.name); setModalError(''); setModalConfirmDelete(false); setCustomerModal({ mode: 'edit', customer }) }}
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
              </div>
            ))}

            <div className="px-4 py-2.5 border-t border-gray-100">
              <button
                onClick={() => { setModalName(''); setModalError(''); setModalConfirmDelete(false); setCustomerModal({ mode: 'add' }) }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#014A99] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Customer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rename manufacturer modal */}
      {renamingMfr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Rename Manufacturer</h2>
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameMfr(); if (e.key === 'Escape') setRenamingMfr(null) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
            />
            {renameError && <p className="text-xs text-red-500">{renameError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenamingMfr(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button
                onClick={handleRenameMfr}
                disabled={renameSaving || !renameValue.trim()}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: '#014A99' }}
              >
                {renameSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete manufacturer confirmation modal */}
      {deletingMfr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Delete Manufacturer</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  This will delete all items and sale prices for <span className="font-semibold text-gray-700">{deletingMfr}</span>.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingMfr(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button
                onClick={handleDeleteMfr}
                disabled={deletingMfrLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
              >
                {deletingMfrLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete item confirmation modal */}
      {deletingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Delete Item</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Delete <span className="font-semibold text-gray-700">{deletingRow.item_name || '(Default Item)'}</span>?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingRow(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button
                onClick={handleDeleteRow}
                disabled={deletingRowLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
              >
                {deletingRowLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex gap-2">
                  {customerModal.mode === 'edit' && (
                    <button onClick={() => setModalConfirmDelete(true)} className="px-3 py-2 text-sm text-red-500 hover:text-red-700 cursor-pointer">
                      Delete
                    </button>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => setCustomerModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
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
    </div>
  )
}
