'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { calcNegoPrice, calcSalePrice, calcIlwidaegaRaw, calcIlwidaegaSale, getHeatRollLength, buildHeatPriceMapByMfr, buildSealantPriceMapByMfr } from '@/lib/price-utils'
import { PriceInput } from '@/components/PriceInput'

interface PriceRow {
  prod_key: string
  manufacturer: string
  internal_name: string
  pipe_spec: string | null
  sleeve_spec: string | null
  unit_price: number
  heat_type: string[] | null     // 차열재 타입 배열 (중복 = 개수)
  heat_length_mm: number | null  // 개소당 공통 길이 (mm)
  sealant_volume: string | null
  note: string | null
  changed: boolean
}

interface Customer {
  id: string
  name: string
  sale_pct: number
}

export default function PricesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const importRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<PriceRow[]>([])
  const [selectedMfr, setSelectedMfr] = useState<string>('')
  const allManufacturers = useMemo(() => Array.from(new Set(rows.map(r => r.manufacturer ?? '필립산업'))).sort(), [rows])
  const filteredRows = useMemo(() => selectedMfr ? rows.filter(r => (r.manufacturer ?? '필립산업') === selectedMfr) : rows, [rows, selectedMfr])
  const existingNames = useMemo(() => Array.from(new Set(
    filteredRows.filter(r => r.internal_name).map(r => r.internal_name as string)
  )).sort((a, b) => a.localeCompare(b, 'en')), [filteredRows])

  // 차열재 구성 모달용: internal_name='차열재'인 행의 pipe_spec(종류) + unit_price(롤당가격)
  // 제조사별로 구분해서 모달에서 필터링
  const availableHeatTypes = useMemo(() => {
    return rows
      .filter(r => r.internal_name === '차열재' && r.pipe_spec)
      .map(r => ({
        manufacturer: r.manufacturer ?? '필립산업',
        type: r.pipe_spec!,
        price: r.unit_price,
      }))
      .sort((a, b) => a.type.localeCompare(b.type))
  }, [rows])

  // 제조사별 실란트 단가: internal_name='실란트' 행의 unit_price
  const sealantPriceByMfr = useMemo(() => buildSealantPriceMapByMfr(rows), [rows])

  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<PriceRow[] | null>(null)
  const [importSaving, setImportSaving] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PriceRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [preEditRows, setPreEditRows] = useState<PriceRow[]>([])

  // 거래처 추가/편집 모달
  const [customerModal, setCustomerModal] = useState<null | { mode: 'add' } | { mode: 'edit'; customer: Customer }>(null)
  const [modalName, setModalName] = useState('')
  const [modalPct, setModalPct] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalConfirmDelete, setModalConfirmDelete] = useState(false)
  const [modalDeleting, setModalDeleting] = useState(false)

  // 신규 품목 추가 모달
  const [addItemModal, setAddItemModal] = useState(false)
  const [addMfr, setAddMfr] = useState<string>('필립산업')
  const [addMfrCustom, setAddMfrCustom] = useState('')
  const [addName, setAddName] = useState('')
  const [addNameCustom, setAddNameCustom] = useState('')
  const [addPipeSpec, setAddPipeSpec] = useState('')
  const [addSleeveSpec, setAddSleeveSpec] = useState('')
  const [addUnitPrice, setAddUnitPrice] = useState(0)
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') router.replace('/dashboard')
  }, [status, session, router])

  const loadPrices = useCallback(async () => {
    setLoading(true)
    try {
      const [pricesRes, customersRes] = await Promise.all([
        fetch('/api/pipe-prices'),
        fetch('/api/customers'),
      ])
      const pricesData = await pricesRes.json()
      const customersData = await customersRes.json()
      const priceRows = Array.isArray(pricesData) ? pricesData.map((r: any) => ({ ...r, manufacturer: r.manufacturer ?? '필립산업', changed: false })) : []
      setRows(priceRows)
      if (priceRows.length > 0 && !selectedMfr) {
        const mfrs = Array.from(new Set(priceRows.map((r: any) => r.manufacturer ?? '필립산업'))).sort() as string[]
        setSelectedMfr(mfrs[0] ?? '')
      }
      if (Array.isArray(customersData)) {
        setCustomers(customersData)
        if (customersData.length > 0) setSelectedCustomerId(customersData[0].id)
      }
    } catch {
      setRows([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') loadPrices()
  }, [status, session, loadPrices])

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) ?? null

  function enterEditMode() {
    setPreEditRows(rows.map(r => ({ ...r })))
    setEditMode(true)
    setMessage(null)
  }

  function cancelEdit() {
    setRows(preEditRows)
    setEditMode(false)
    setMessage(null)
  }

  function isRowChanged(imported: Omit<PriceRow, 'changed'>): boolean {
    const cur = rows.find(r => r.prod_key === imported.prod_key && (r.manufacturer ?? '필립산업') === (imported.manufacturer ?? '필립산업'))
    if (!cur) return true
    return (
      (cur.manufacturer ?? '필립산업') !== (imported.manufacturer ?? '필립산업') ||
      (cur.internal_name ?? null) !== (imported.internal_name ?? null) ||
      (cur.pipe_spec ?? null) !== (imported.pipe_spec ?? null) ||
      (cur.sleeve_spec ?? null) !== (imported.sleeve_spec ?? null) ||
      cur.unit_price !== imported.unit_price ||
      JSON.stringify(cur.heat_type ?? null) !== JSON.stringify(imported.heat_type ?? null) ||
      (cur.heat_length_mm ?? null) !== (imported.heat_length_mm ?? null) ||
      (cur.sealant_volume ?? null) !== (imported.sealant_volume ?? null) ||
      (cur.note ?? null) !== (imported.note ?? null)
    )
  }

  function handleChange(prod_key: string, manufacturer: string, field: keyof PriceRow, value: number | string | string[] | null) {
    setRows(prev => prev.map(r =>
      r.prod_key === prod_key && (r.manufacturer ?? '필립산업') === manufacturer ? { ...r, [field]: value, changed: true } : r
    ))
  }

  function handleImportChange(prod_key: string, manufacturer: string, field: string, value: number | string | null) {
    setImportPreview(prev => prev?.map(r => {
      if (r.prod_key !== prod_key || (r.manufacturer ?? '필립산업') !== manufacturer) return r
      const updated = { ...r, [field]: value }
      return { ...updated, changed: isRowChanged(updated) }
    }) ?? null)
  }

  async function handleSave() {
    const changed = rows.filter(r => r.changed)
    if (changed.length === 0) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/pipe-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changed.map(({ changed: _, ...r }) => r)),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }
      setRows(prev => prev.map(r => ({ ...r, changed: false })))
      setEditMode(false)
      setMessage({ type: 'success', text: `${changed.length} item(s) saved` })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'An error occurred' })
    }
    setSaving(false)
  }

  function handleExport() {
    window.location.href = '/api/pipe-prices/export'
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setShowImportDialog(false)
    setImporting(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/pipe-prices/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parsing failed')
      setImportPreview(data.rows.map((r: any) => ({ ...r, changed: isRowChanged(r) })))
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'File processing error' })
    }
    setImporting(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/pipe-prices?prod_key=${encodeURIComponent(deleteTarget.prod_key)}&manufacturer=${encodeURIComponent(deleteTarget.manufacturer ?? '필립산업')}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setRows(prev => prev.filter(r => !(r.prod_key === deleteTarget.prod_key && (r.manufacturer ?? '필립산업') === (deleteTarget.manufacturer ?? '필립산업'))))
      setMessage({ type: 'success', text: 'Deleted successfully.' })
      setDeleteTarget(null)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Delete error' })
    }
    setDeleting(false)
  }

  async function handleImportSave() {
    if (!importPreview) return
    const changedRows = importPreview.filter(r => r.changed)
    if (changedRows.length === 0) {
      setImportPreview(null)
      setMessage({ type: 'success', text: 'No items changed.' })
      return
    }
    setImportSaving(true)
    try {
      const res = await fetch('/api/pipe-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedRows.map(({ changed: _, ...r }) => r)),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }
      setImportPreview(null)
      setMessage({ type: 'success', text: `${changedRows.length} item(s) updated` })
      await loadPrices()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? 'Save error' })
    }
    setImportSaving(false)
  }

  async function handleSaveCustomer() {
    const pct = Number(modalPct)
    if (!modalName.trim() || isNaN(pct) || pct <= 0 || pct > 100) {
      setModalError('Please enter a company name and sale price % (1–100).')
      return
    }
    setModalSaving(true)
    setModalError('')
    try {
      const body: any = { name: modalName.trim(), sale_pct: pct }
      if (customerModal?.mode === 'edit') body.id = (customerModal as any).customer.id
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setCustomerModal(null)
      await loadPrices()
    } catch (e: any) {
      setModalError(e.message ?? 'An error occurred')
    }
    setModalSaving(false)
  }

  function openAddItem() {
    setAddMfr(selectedMfr || '필립산업')
    setAddMfrCustom('')
    setAddName(existingNames[0] ?? '__custom__')
    setAddNameCustom('')
    setAddPipeSpec('')
    setAddSleeveSpec('')
    setAddUnitPrice(0)
    setAddError('')
    setAddItemModal(true)
  }

  function buildProdKey(internalName: string, pipeSpec: string, sleeveSpec: string): string {
    return [internalName, pipeSpec, sleeveSpec].filter(Boolean).join('_')
  }

  async function handleAddItem() {
    const mfr = (addMfr === '__custom__' ? addMfrCustom : addMfr).trim() || '필립산업'
    const internalName = (addName === '__custom__' ? addNameCustom : addName).trim()
    const pipeSpec = addPipeSpec.trim()
    const sleeveSpec = addSleeveSpec.trim()
    if (!internalName || !pipeSpec) {
      setAddError('Please enter an item name and pipe spec.')
      return
    }
    const prodKey = buildProdKey(internalName, pipeSpec, sleeveSpec)
    if (rows.some(r => r.prod_key === prodKey && (r.manufacturer ?? '필립산업') === mfr)) {
      setAddError('This item already exists (duplicate manufacturer + product key).')
      return
    }
    setAddSaving(true)
    setAddError('')
    try {
      const res = await fetch('/api/pipe-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          prod_key: prodKey,
          manufacturer: mfr,
          internal_name: internalName,
          pipe_spec: pipeSpec,
          sleeve_spec: sleeveSpec || null,
          unit_price: addUnitPrice,
        }]),
      })
      if (!res.ok) throw new Error('Save failed')
      setAddItemModal(false)
      setMessage({ type: 'success', text: 'Item added.' })
      await loadPrices()
    } catch (e: any) {
      setAddError(e.message ?? 'An error occurred')
    }
    setAddSaving(false)
  }

  function openAddCustomer() {
    setModalName('')
    setModalPct('')
    setModalError('')
    setModalConfirmDelete(false)
    setCustomerModal({ mode: 'add' })
  }

  function openEditCustomer(c: Customer) {
    setModalName(c.name)
    setModalPct(String(c.sale_pct))
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
      if (selectedCustomerId === id) setSelectedCustomerId('')
      await loadPrices()
    } catch (e: any) {
      setModalError(e.message ?? 'Delete error')
      setModalConfirmDelete(false)
    }
    setModalDeleting(false)
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>
  }

  const changedCount = rows.filter(r => r.changed).length

  function specToNum(s: string | null): number {
    if (!s) return Infinity
    const m = s.match(/^(\d+)/)
    return m ? parseInt(m[1], 10) : Infinity
  }

  function sortRows(a: PriceRow, b: PriceRow): number {
    const pa = specToNum(a.pipe_spec), pb = specToNum(b.pipe_spec)
    if (pa !== pb) {
      if (pa === Infinity && pb === Infinity) return (a.pipe_spec ?? '').localeCompare(b.pipe_spec ?? '')
      return pa - pb
    }
    const sa = specToNum(a.sleeve_spec), sb = specToNum(b.sleeve_spec)
    if (sa !== sb) {
      if (sa === Infinity && sb === Infinity) return (a.sleeve_spec ?? '').localeCompare(b.sleeve_spec ?? '')
      return sa - sb
    }
    return 0
  }

  const allItems = existingNames.map(name => ({
    name,
    rows: filteredRows.filter(r => r.internal_name === name).sort(sortRows),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Pipe Pricing Management</h1>
          {/* Customer select dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white"
            >
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={openAddCustomer}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-[#014A99] hover:border-[#014A99] transition-colors cursor-pointer"
              title="Add Customer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {selectedCustomer && (
              <div className="flex items-center gap-1">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                  Negotiated × {selectedCustomer.sale_pct}%
                </span>
                <button
                  onClick={() => openEditCustomer(selectedCustomer)}
                  className="text-gray-300 hover:text-[#014A99] transition-colors cursor-pointer"
                  title="Edit Customer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {message && (
            <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </span>
          )}
          {!editMode && <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>}
          {!editMode && (
            <button
              onClick={openAddItem}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Item
            </button>
          )}
          <input ref={importRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
          {!editMode && (
            <button
              onClick={() => setShowImportDialog(true)}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
              {importing ? 'Processing...' : 'Import'}
            </button>
          )}
          {editMode ? (
            <>
              <button onClick={cancelEdit} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || changedCount === 0}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition-opacity cursor-pointer"
                style={{ backgroundColor: '#014A99' }}
              >
                {saving ? 'Saving...' : `Save${changedCount > 0 ? ` (${changedCount})` : ''}`}
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Manufacturer tabs */}
      {allManufacturers.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {allManufacturers.map(mfr => (
            <button
              key={mfr}
              onClick={() => setSelectedMfr(mfr)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                selectedMfr === mfr
                  ? 'bg-[#014A99] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mfr}
              <span className={`ml-1.5 text-xs ${selectedMfr === mfr ? 'text-blue-200' : 'text-gray-400'}`}>
                {rows.filter(r => (r.manufacturer ?? '필립산업') === mfr).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Price table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-sm text-gray-400 space-y-2">
          <p>No pricing data.</p>
          <p className="text-xs">Run the seed script or add data via Excel import.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <PriceGroup
            items={allItems}
            selectedPct={selectedCustomer?.sale_pct ?? null}
            editMode={editMode}
            onChange={handleChange}
            onDelete={setDeleteTarget}
            availableHeatTypes={availableHeatTypes}
            sealantPriceByMfr={sealantPriceByMfr}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Delete Item</p>
                <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 text-xs text-gray-700">
              <p><span className="text-gray-400">Item</span> {deleteTarget.internal_name}</p>
              {deleteTarget.pipe_spec && <p><span className="text-gray-400">Pipe</span> {deleteTarget.pipe_spec}</p>}
              {deleteTarget.sleeve_spec && <p><span className="text-gray-400">Sleeve</span> {deleteTarget.sleeve_spec}</p>}
              <p><span className="text-gray-400">Product Key</span> <span className="font-mono text-gray-500">{deleteTarget.prod_key}</span></p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 cursor-pointer transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import instructions dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Import Prices</h2>
              <button onClick={() => setShowImportDialog(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Steps */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#014A99] text-white text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Get the current price file via Export</p>
                    <p className="text-xs text-gray-500 mt-0.5">Click the <span className="font-medium text-gray-700">Export</span> button above to download the Excel file. You must base your edits on this file.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#014A99] text-white text-xs font-bold flex items-center justify-center">2</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Edit the columns you want to change</p>
                    <p className="text-xs text-gray-500 mt-0.5">You can freely edit the unit price, heat insulator type/length/count/price, sealant volume/price, and note columns. Negotiated price and sale price are calculated automatically.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#014A99] text-white text-xs font-bold flex items-center justify-center">3</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Save the edited file and upload it below</p>
                    <p className="text-xs text-gray-500 mt-0.5">Save in Excel (Ctrl+S), then upload. A preview screen will show the changes, and you must click the final <span className="font-medium text-gray-700">Save</span> button for them to take effect.</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-semibold text-amber-800">⚠ Notes</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Never edit the product key, item name, pipe, or sleeve columns. Changing them breaks the link to existing data.</li>
                  <li>The negotiated price column is read-only (auto-calculated) — do not edit it.</li>
                  <li>Keep the <span className="font-medium">단가표</span> sheet name in the file unchanged.</li>
                  <li>Only use the file (.xlsx) obtained via Export. A manually created file may not match the expected format.</li>
                </ul>
              </div>

              {/* File upload area */}
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-[#014A99] hover:bg-blue-50/30 transition-colors cursor-pointer group"
              >
                <svg className="w-8 h-8 text-gray-300 group-hover:text-[#014A99] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-500 group-hover:text-[#014A99] transition-colors">Choose Excel File (.xlsx)</span>
                <span className="text-xs text-gray-400">Click to select a file</span>
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowImportDialog(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
                Cancel
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
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sale Price %</label>
                    <input
                      type="number"
                      value={modalPct}
                      onChange={e => setModalPct(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCustomer() }}
                      placeholder="e.g. 55"
                      min={1}
                      max={100}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Negotiated price × this % = sale price (1–100)</p>
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

      {/* Add new item modal */}
      {addItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Add New Item</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Manufacturer</label>
                <select
                  value={addMfr}
                  onChange={e => setAddMfr(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99] bg-white"
                >
                  {allManufacturers.length > 0 ? allManufacturers.map(mfr => (
                    <option key={mfr} value={mfr}>{mfr}</option>
                  )) : (
                    <option value="필립산업">필립산업</option>
                  )}
                  <option value="__custom__">Enter manually...</option>
                </select>
                {addMfr === '__custom__' && (
                  <input
                    autoFocus
                    type="text"
                    value={addMfrCustom}
                    onChange={e => setAddMfrCustom(e.target.value)}
                    placeholder="Enter manufacturer name"
                    className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Name</label>
                <select
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99] bg-white"
                >
                  {existingNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="__custom__">Enter manually...</option>
                </select>
                {addName === '__custom__' && (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={addNameCustom}
                      onChange={e => setAddNameCustom(e.target.value)}
                      placeholder="e.g. 바닥_금속관_보온_ABS고정구일체형"
                      className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
                    />
                    <p className="text-xs text-amber-600 mt-1">Use _ instead of spaces. (e.g. 바닥 금속관 → 바닥_금속관)</p>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pipe Spec</label>
                  <input
                    type="text"
                    value={addPipeSpec}
                    onChange={e => setAddPipeSpec(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
                    placeholder="e.g. 20A"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sleeve Spec (optional)</label>
                  <input
                    type="text"
                    value={addSleeveSpec}
                    onChange={e => setAddSleeveSpec(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
                    placeholder="e.g. 75A"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                <PriceInput
                  value={addUnitPrice}
                  onChange={setAddUnitPrice}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99] font-medium"
                />
              </div>
              <p className="text-xs text-gray-400">
                Product Key:{' '}
                <span className="font-mono text-gray-500">
                  {buildProdKey((addName === '__custom__' ? addNameCustom : addName).trim(), addPipeSpec.trim(), addSleeveSpec.trim()) || '—'}
                </span>
              </p>
              {addError && <p className="text-xs text-red-500">{addError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddItemModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={addSaving}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: '#014A99' }}
              >
                {addSaving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import preview modal */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Import Preview</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {importPreview.filter(r => r.changed).length} of {importPreview.length} total{' '}
                  <span className="text-amber-600 font-medium">changed</span>
                  {' '}detected. Only changed items will be saved.
                </p>
              </div>
              <button onClick={() => setImportPreview(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <th className="px-3 py-2 text-end font-medium w-24">Manufacturer</th>
                    <th className="px-3 py-2 text-end font-medium">Item</th>
                    <th className="px-3 py-2 text-end font-medium w-16">Pipe</th>
                    <th className="px-3 py-2 text-end font-medium w-20">Sleeve</th>
                    <th className="px-3 py-2 text-end font-medium w-24 text-blue-600">Unit Price</th>
                    <th className="px-3 py-2 text-end font-medium w-20 text-gray-400">Negotiated</th>
                    {selectedCustomer && (
                      <th className="px-3 py-2 text-end font-medium w-24 text-gray-500">
                        Sale Price ({selectedCustomer.name})
                      </th>
                    )}
                    <th className="px-3 py-2 text-end font-medium w-24 text-gray-400">Heat Insulator</th>
                    <th className="px-3 py-2 text-end font-medium w-28 text-gray-400">Heat Length (mm)</th>
                    <th className="px-3 py-2 text-end font-medium w-20 text-gray-400">Sealant</th>
                    <th className="px-3 py-2 text-end font-medium min-w-[13rem] text-gray-400">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importPreview.map(row => {
                    const nego = calcNegoPrice(row.unit_price)
                    return (
                      <tr key={`${row.manufacturer}_${row.prod_key}`} className={row.changed ? 'bg-amber-50' : 'hover:bg-gray-50 opacity-50'}>
                        <td className="px-3 py-1.5 text-gray-500 text-xs">{row.manufacturer ?? '필립산업'}</td>
                        <td className="px-3 py-1.5 text-gray-700">{row.internal_name}</td>
                        <td className="px-3 py-1.5 text-center text-gray-500">{row.pipe_spec ?? '—'}</td>
                        <td className="px-3 py-1.5 text-center text-gray-400">{row.sleeve_spec ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          <PriceInput
                            value={row.unit_price ?? 0}
                            onChange={num => handleImportChange(row.prod_key, row.manufacturer ?? '필립산업', 'unit_price', num)}
                            className="w-20 text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium text-blue-700"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{nego.toLocaleString()}</td>
                        {selectedCustomer && (
                          <td className="px-3 py-1.5 text-right text-gray-600 font-medium">
                            {calcSalePrice(row.unit_price, selectedCustomer.sale_pct).toLocaleString()}
                          </td>
                        )}
                        <td className="px-3 py-1.5 text-right text-xs text-gray-400">
                          {Array.isArray(row.heat_type) && row.heat_type.length > 0 ? row.heat_type.length + ' types' : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={row.heat_length_mm ?? ''} onChange={e => handleImportChange(row.prod_key, row.manufacturer ?? '필립산업', 'heat_length_mm', e.target.value !== '' ? Number(e.target.value) : null)} className="w-16 text-xs text-end border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]" placeholder="—" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={row.sealant_volume ?? ''} onChange={e => handleImportChange(row.prod_key, row.manufacturer ?? '필립산업', 'sealant_volume', e.target.value || null)} className="w-16 text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]" placeholder="—" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={row.note ?? ''} onChange={e => handleImportChange(row.prod_key, row.manufacturer ?? '필립산업', 'note', e.target.value || null)} className="w-48 text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]" placeholder="—" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
              <button onClick={() => setImportPreview(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleImportSave}
                disabled={importSaving}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: '#014A99' }}
              >
                {importSaving ? 'Saving...' : `Save (${importPreview.filter(r => r.changed).length} changed)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 차열재 구성 모달 ─────────────────────────────────────────────────────────

interface HeatComponentsModalProps {
  row: PriceRow
  availableHeatTypes: { manufacturer: string; type: string; price: number }[]
  onClose: () => void
  onSave: (heatType: string[], heatLengthMm: number) => void
}

function HeatComponentsModal({ row, availableHeatTypes, onClose, onSave }: HeatComponentsModalProps) {
  const mfr = row.manufacturer ?? '필립산업'
  const filteredHeatTypes = availableHeatTypes.filter(h => h.manufacturer === mfr)

  // 기존 heat_type 배열에서 타입별 개수 초기화
  const [typeCounts, setTypeCounts] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    if (Array.isArray(row.heat_type)) {
      for (const t of row.heat_type) map.set(t, (map.get(t) ?? 0) + 1)
    }
    return map
  })
  const [sharedLength, setSharedLength] = useState<number>(row.heat_length_mm ?? 0)

  function toggleType(type: string) {
    setTypeCounts(prev => {
      const next = new Map(prev)
      if (next.has(type)) next.delete(type)
      else next.set(type, 1)
      return next
    })
  }

  function setCount(type: string, count: number) {
    setTypeCounts(prev => {
      const next = new Map(prev)
      if (count <= 0) next.delete(type)
      else next.set(type, count)
      return next
    })
  }

  function handleSave() {
    const arr: string[] = []
    for (const [type, count] of typeCounts) {
      for (let i = 0; i < count; i++) arr.push(type)
    }
    onSave(arr, sharedLength)
    onClose()
  }

  const totalCost = useMemo(() => {
    let total = 0
    for (const [type, count] of typeCounts) {
      if (sharedLength <= 0) continue
      const price = filteredHeatTypes.find(h => h.type === type)?.price ?? 0
      if (price <= 0) continue
      const rollLen = getHeatRollLength(type)
      total += (price * sharedLength / rollLen) * count
    }
    return total
  }, [typeCounts, sharedLength, filteredHeatTypes])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-sm font-bold text-gray-900">Edit Heat Insulator Config</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {row.internal_name} {row.pipe_spec ?? ''} {row.sleeve_spec ?? ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shared length input */}
        <div className="px-5 pt-4 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-medium text-gray-600 shrink-0">Length per spot (shared)</span>
          <input
            type="number"
            value={sharedLength || ''}
            onChange={e => setSharedLength(Number(e.target.value))}
            className="w-24 text-xs text-end border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-[#014A99]"
            placeholder="0"
            min={0}
          />
          <span className="text-xs text-gray-400">mm</span>
          {typeCounts.size > 0 && sharedLength > 0 && (
            <span className="text-xs text-gray-400 ml-auto">Applied to all types</span>
          )}
        </div>

        {/* Body — heat insulator type list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {filteredHeatTypes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No heat insulator data for {mfr}.<br/>
              Please register an internal_name=&apos;차열재&apos; item in pipe pricing first.
            </p>
          ) : (
            filteredHeatTypes.map(({ type, price }) => {
              const count = typeCounts.get(type) ?? 0
              const isChecked = count > 0
              const rollLen = getHeatRollLength(type)
              const perCost = sharedLength > 0 && price > 0 && isChecked
                ? (price * sharedLength / rollLen) * count
                : null

              return (
                <div key={type} className={`rounded-lg border transition-colors ${isChecked ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50/50'}`}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleType(type)}
                      className="accent-orange-500 w-4 h-4 flex-shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-700">{type}</span>
                      <span className="text-xs text-gray-400 ml-2">₩{price.toLocaleString()}/roll · roll length {rollLen.toLocaleString()}mm</span>
                    </div>
                    {isChecked && (
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.preventDefault()}>
                        <span className="text-xs text-gray-500">×</span>
                        <input
                          type="number"
                          value={count}
                          onChange={e => setCount(type, Number(e.target.value))}
                          className="w-14 text-xs text-center border border-orange-200 rounded px-2 py-1 focus:outline-none focus:border-orange-400"
                          min={1}
                        />
                        <span className="text-xs text-gray-400">pcs</span>
                        {perCost !== null && (
                          <span className="text-xs text-orange-600 tabular-nums font-medium w-20 text-right">
                            ≈ ₩{Math.round(perCost).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </label>
                </div>
              )
            })
          )}
        </div>

        {/* Calculation preview + footer buttons */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-3">
          {typeCounts.size > 0 && totalCost > 0 && (
            <div className="bg-orange-50 rounded-lg px-4 py-3 space-y-1">
              {Array.from(typeCounts).map(([type, count]) => {
                const price = filteredHeatTypes.find(h => h.type === type)?.price ?? 0
                const rollLen = getHeatRollLength(type)
                const cost = sharedLength > 0 ? (price * sharedLength / rollLen) * count : 0
                return (
                  <div key={type} className="flex justify-between text-xs text-gray-600">
                    <span>{type}: {price.toLocaleString()} × {sharedLength}/{rollLen} × {count} pcs</span>
                    <span className="tabular-nums">₩{Math.round(cost).toLocaleString()}</span>
                  </div>
                )
              })}
              <div className="flex justify-between text-xs font-bold text-orange-700 pt-1 border-t border-orange-200">
                <span>Total</span>
                <span className="tabular-nums">₩{Math.round(totalCost).toLocaleString()}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            {typeCounts.size > 0 && (
              <button
                onClick={() => setTypeCounts(new Map())}
                className="px-3 py-2 text-xs text-gray-400 hover:text-red-500 cursor-pointer"
              >
                Reset
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: '#014A99' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── heatTypeLabel — array → label text ─────────────────────────────────────

function heatTypeLabel(row: PriceRow): string {
  if (!Array.isArray(row.heat_type) || row.heat_type.length === 0) return '— None'
  const counts = new Map<string, number>()
  for (const t of row.heat_type) counts.set(t, (counts.get(t) ?? 0) + 1)
  const lengthSuffix = row.heat_length_mm ? ` · ${row.heat_length_mm}mm` : ''
  if (counts.size === 1) {
    const [[type, count]] = Array.from(counts)
    return count === 1 ? `${type}${lengthSuffix}` : `${type} ×${count}${lengthSuffix}`
  }
  const summary = Array.from(counts).map(([t, c]) => `${t}×${c}`).join(', ')
  return `Mixed ${counts.size} types${lengthSuffix} (${summary})`
}

// ── Sealant label ─────────────────────────────────────────────────────────────

function sealantLabel(row: PriceRow): string {
  if (!row.sealant_volume) return '— None'
  return `×${row.sealant_volume} units`
}

// ── Sealant modal ──────────────────────────────────────────────────────────────

function SealantModal({ row, sealantPrice, onClose, onSave }: {
  row: PriceRow
  sealantPrice: number   // 실란트 행 unit_price (런타임 조회)
  onClose: () => void
  onSave: (volume: string | null) => void
}) {
  const [volume, setVolume] = useState(row.sealant_volume ?? '')
  const vol = parseFloat(volume || '0')
  const cost = !isNaN(vol) && vol > 0 && sealantPrice > 0 ? sealantPrice * vol : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-sm font-bold text-gray-900">Edit Sealant Config</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {row.internal_name} {row.pipe_spec ?? ''} {row.sleeve_spec ?? ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {!sealantPrice && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              No sealant price row found. Add a &ldquo;실란트&rdquo; item to the price table first.
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 shrink-0">Amount used per spot</span>
            <input
              autoFocus
              type="number"
              value={volume}
              onChange={e => setVolume(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onSave(volume || null); onClose() } }}
              className="flex-1 text-xs text-end border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-[#014A99]"
              placeholder="0"
              min={0}
              step="0.1"
            />
            <span className="text-xs text-gray-400 shrink-0">units</span>
          </div>

          {cost !== null && (
            <div className="bg-amber-50 rounded-lg px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>₩{sealantPrice.toLocaleString()}/unit × {vol}</span>
                <span className="tabular-nums">₩{Math.round(cost).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-amber-700 border-t border-amber-200 pt-1.5">
                <span>Sealant cost per spot</span>
                <span className="tabular-nums">₩{Math.round(cost).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2 justify-end">
          {row.sealant_volume && (
            <button
              onClick={() => { onSave(null); onClose() }}
              className="px-3 py-2 text-xs text-gray-400 hover:text-red-500 cursor-pointer"
            >
              Reset
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
          <button
            onClick={() => { onSave(volume || null); onClose() }}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg cursor-pointer"
            style={{ backgroundColor: '#014A99' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ResizeHandle ──────────────────────────────────────────────────────────────

function ResizeHandle({
  col,
  widths,
  setWidths,
  storageKey,
}: {
  col: string
  widths: Record<string, number>
  setWidths: React.Dispatch<React.SetStateAction<Record<string, number>>>
  storageKey: string
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
          el.removeEventListener('pointermove', onMove as EventListener)
          el.removeEventListener('pointerup', onUp)
          setWidths(prev => {
            try { localStorage.setItem(storageKey, JSON.stringify(prev)) } catch {}
            return prev
          })
        }
        el.addEventListener('pointermove', onMove as EventListener)
        el.addEventListener('pointerup', onUp)
      }}
    />
  )
}

const PIPE_PRICE_COL_KEY = 'pipe_prices_col_widths'
const PIPE_PRICE_COL_DEFAULTS: Record<string, number> = {
  name: 176, pipe: 56, sleeve: 68, price: 88, nego: 88, sale: 88,
  ilwi: 88, ilwi_sale: 88, heat: 200, sealant: 80, note: 200,
}

// ── PriceGroup ─────────────────────────────────────────────────────────────────

function PriceGroup({
  items,
  selectedPct,
  editMode,
  onChange,
  onDelete,
  availableHeatTypes,
  sealantPriceByMfr,
}: {
  items: { name: string; rows: PriceRow[] }[]
  selectedPct: number | null
  editMode: boolean
  onChange: (prod_key: string, manufacturer: string, field: keyof PriceRow, value: number | string | string[] | null) => void
  onDelete: (row: PriceRow) => void
  availableHeatTypes: { manufacturer: string; type: string; price: number }[]
  sealantPriceByMfr: Map<string, number>
}) {
  const [heatEditTarget, setHeatEditTarget] = useState<PriceRow | null>(null)
  const [sealantEditTarget, setSealantEditTarget] = useState<PriceRow | null>(null)
  const heatPriceMapByMfr = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const ht of availableHeatTypes) {
      if (!map.has(ht.manufacturer)) map.set(ht.manufacturer, new Map())
      map.get(ht.manufacturer)!.set(ht.type, ht.price)
    }
    return map
  }, [availableHeatTypes])
  const [colW, setColW] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PIPE_PRICE_COL_KEY) ?? 'null')
      return saved ? { ...PIPE_PRICE_COL_DEFAULTS, ...saved } : PIPE_PRICE_COL_DEFAULTS
    } catch { return PIPE_PRICE_COL_DEFAULTS }
  })
  const rh = (col: string) => <ResizeHandle col={col} widths={colW} setWidths={setColW} storageKey={PIPE_PRICE_COL_KEY} />

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="relative group/th px-3 py-2.5 text-end font-medium" style={{ width: colW.name }}>Item{rh('name')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium" style={{ width: colW.pipe }}>Pipe{rh('pipe')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium" style={{ width: colW.sleeve }}>Sleeve{rh('sleeve')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium text-blue-600" style={{ width: colW.price }}>Unit Price{rh('price')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium text-gray-400" style={{ width: colW.nego }}>Negotiated{rh('nego')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium text-gray-600" style={{ width: colW.sale }}>Sale Price{rh('sale')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium text-orange-500" style={{ width: colW.ilwi }}>Unit Cost{rh('ilwi')}</th>
                {selectedPct != null && (
                  <th className="relative group/th px-3 py-2.5 text-end font-medium text-orange-600" style={{ width: colW.ilwi_sale }}>Unit Cost (Sale){rh('ilwi_sale')}</th>
                )}
                <th className="relative group/th px-3 py-2.5 text-end font-medium text-gray-400" style={{ width: colW.heat }}>Heat Insulator{rh('heat')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium text-gray-400" style={{ width: colW.sealant }}>Sealant{rh('sealant')}</th>
                <th className="relative group/th px-3 py-2.5 text-end font-medium" style={{ width: colW.note }}>Note{rh('note')}</th>
                <th className="px-3 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item =>
                item.rows.map((row, idx) => {
                  const mfr = row.manufacturer ?? '필립산업'
                  const nego = calcNegoPrice(row.unit_price)
                  const salePrice = selectedPct != null ? calcSalePrice(row.unit_price, selectedPct) : null
                  const heatPriceMap = heatPriceMapByMfr.get(mfr) ?? new Map()
                  const sealantUnitPrice = sealantPriceByMfr.get(mfr)
                  const ilwiRaw = calcIlwidaegaRaw(row, heatPriceMap, sealantUnitPrice)
                  const hasIlwi = ilwiRaw > row.unit_price
                  return (
                    <tr key={`${mfr}_${row.prod_key}`} className={row.changed ? 'bg-amber-50' : 'hover:bg-gray-50/50 group'}>
                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <input type="text" value={row.internal_name ?? ''} onChange={e => onChange(row.prod_key, mfr, 'internal_name', e.target.value || null)} className="w-full text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]" placeholder="—" />
                        ) : (
                          <span className="block text-end text-xs text-gray-700">{idx === 0 ? item.name : ''}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <input type="text" value={row.pipe_spec ?? ''} onChange={e => onChange(row.prod_key, mfr, 'pipe_spec', e.target.value || null)} className="w-full text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]" placeholder="—" />
                        ) : (
                          <span className="block text-end text-xs text-gray-500">{row.pipe_spec ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <input type="text" value={row.sleeve_spec ?? ''} onChange={e => onChange(row.prod_key, mfr, 'sleeve_spec', e.target.value || null)} className="w-full text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]" placeholder="—" />
                        ) : (
                          <span className="block text-end text-xs text-gray-400">{row.sleeve_spec ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <PriceInput value={row.unit_price ?? 0} onChange={num => onChange(row.prod_key, mfr, 'unit_price', num)} className="w-20 text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] font-medium" />
                        ) : (
                          <span className="block text-end text-xs font-medium tabular-nums">{row.unit_price?.toLocaleString() ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-end text-xs text-gray-400 tabular-nums">{nego.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-end text-xs tabular-nums font-medium text-gray-700">
                        {salePrice != null ? salePrice.toLocaleString() : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-end text-xs tabular-nums text-orange-600">
                        {hasIlwi ? Math.round(ilwiRaw).toLocaleString() : <span className="text-gray-200">—</span>}
                      </td>
                      {selectedPct != null && (
                        <td className="px-3 py-1.5 text-end text-xs tabular-nums font-medium text-orange-700">
                          {hasIlwi ? calcIlwidaegaSale(ilwiRaw, selectedPct).toLocaleString() : <span className="text-gray-200">—</span>}
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <button
                            type="button"
                            onClick={() => setHeatEditTarget(row)}
                            className={`w-full text-end text-xs border rounded px-2 py-1 cursor-pointer transition-colors text-left ${
                              Array.isArray(row.heat_type) && row.heat_type.length > 0
                                ? 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-400'
                                : 'border-gray-300 bg-white text-gray-400 hover:border-[#014A99]'
                            }`}
                          >
                            {heatTypeLabel(row)}
                          </button>
                        ) : (
                          <span className="block text-end text-xs text-gray-500">{heatTypeLabel(row)}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <button
                            type="button"
                            onClick={() => setSealantEditTarget(row)}
                            className={`w-full text-end text-xs border rounded px-2 py-1 cursor-pointer transition-colors text-left ${
                              row.sealant_volume
                                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400'
                                : 'border-gray-300 bg-white text-gray-400 hover:border-[#014A99]'
                            }`}
                          >
                            {sealantLabel(row)}
                          </button>
                        ) : (
                          <span className="block text-end text-xs text-gray-500">{sealantLabel(row)}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <input type="text" value={row.note ?? ''} onChange={e => onChange(row.prod_key, mfr, 'note', e.target.value || null)} className="w-full text-end text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#014A99]" placeholder="—" />
                        ) : (
                          <span className="block text-end text-xs text-gray-500 truncate">{row.note ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-end">
                        {editMode && (
                          <button
                            onClick={() => onDelete(row)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* 차열재 구성 모달 */}
      {heatEditTarget && (
        <HeatComponentsModal
          row={heatEditTarget}
          availableHeatTypes={availableHeatTypes}
          onClose={() => setHeatEditTarget(null)}
          onSave={(heatType, heatLengthMm) => {
            const mfr = heatEditTarget.manufacturer ?? '필립산업'
            onChange(heatEditTarget.prod_key, mfr, 'heat_type', heatType.length > 0 ? heatType : null)
            onChange(heatEditTarget.prod_key, mfr, 'heat_length_mm', heatLengthMm > 0 ? heatLengthMm : null)
            setHeatEditTarget(null)
          }}
        />
      )}
      {/* 실란트 구성 모달 */}
      {sealantEditTarget && (
        <SealantModal
          row={sealantEditTarget}
          sealantPrice={sealantPriceByMfr.get(sealantEditTarget.manufacturer ?? '필립산업') ?? 0}
          onClose={() => setSealantEditTarget(null)}
          onSave={volume => {
            onChange(sealantEditTarget.prod_key, sealantEditTarget.manufacturer ?? '필립산업', 'sealant_volume', volume)
            setSealantEditTarget(null)
          }}
        />
      )}
    </div>
  )
}
