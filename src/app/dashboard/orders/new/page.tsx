'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-toastify'
import type { OrderItem, OrderHeader } from '@/lib/parse-order'
import { normalizeDeliveryDate } from '@/lib/parse-order'
import { buildPriceMap, buildSealantMap, buildPipeSleeveStructure, buildManufacturerMaps, buildIlwidaegaMapByMfr, lookupSalePrice, type PriceRowMin } from '@/lib/price-utils'
import { PipeItemsTable } from '@/components/PipeItemsTable'
import MultiFileUploader from '@/components/MultiFileUploader'

interface Customer { id: string; name: string; sale_pct: number; email: string | null }

const DRAFT_KEY = 'draft_pipe_order'

const INPUT_CLS = 'border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] transition-colors w-full'

type OrderType = '배관' | '사각덕트'

const today = () => new Date().toISOString().slice(0, 10)

function makeItem(no: number): OrderItem {
  return { no, name: '', spec: '', unit: 'ea', quantity: 1 }
}

interface HeaderDraft {
  vendor: string
  project: string
  deliveryDate: string
  deliveryDest: string
  contactName: string
  contactPhone: string
  deliveryLocation: string
  address: string
}

function buildHeaderDraft(h: OrderHeader, basisDate: string): HeaderDraft {
  return {
    vendor: h.companyName ?? '',
    project: h.project ?? '',
    deliveryDate: normalizeDeliveryDate(h.deliveryDate, basisDate),
    deliveryDest: h.companyName ?? '',
    contactName: h.representative ?? h.recipient ?? '',
    contactPhone: h.contact ?? '',
    deliveryLocation: h.deliveryAddress ?? '',
    address: h.address ?? '',
  }
}

function isHeaderDraftEmpty(d: HeaderDraft): boolean {
  return Object.values(d).every(v => !v)
}

export default function NewOrderPage() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const step = (searchParams.get('step') ?? 'select') as 'select' | 'vendor' | 'form'
  const [orderType, setOrderType] = useState<OrderType | null>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vendor, setVendor] = useState('')
  const [vendorMode, setVendorMode] = useState<'existing' | 'new'>('existing')
  const [pct, setPct] = useState<number | null>(null)
  const [project, setProject] = useState('')
  const [orderDate, setOrderDate] = useState(today())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [author, setAuthor] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryDest, setDeliveryDest] = useState('')
  const [notes, setNotes] = useState('')

  const [allPrices, setAllPrices] = useState<PriceRowMin[]>([])
  const [sealantMap, setSealantMap] = useState<Map<string, number>>(new Map())
  const [items, setItems] = useState<OrderItem[]>([makeItem(1)])

  const { psByMfr, priceMapByMfr, manufacturers: pipeManufacturers } = useMemo(
    () => buildManufacturerMaps(allPrices),
    [allPrices]
  )
  const priceMap = useMemo(() => buildPriceMap(allPrices), [allPrices])
  const ps = useMemo(() => buildPipeSleeveStructure(allPrices), [allPrices])
  const ilwiRawMapByMfr = useMemo(() => buildIlwidaegaMapByMfr(allPrices), [allPrices])

  const saleTotal = useMemo(() => items.reduce((sum, it) => {
    const mfrMap = it.manufacturer ? (priceMapByMfr.get(it.manufacturer) ?? priceMap) : priceMap
    const up = it.unitPrice ?? (pct !== null && it.internalName
      ? lookupSalePrice(mfrMap, pct, it.internalName, it.pipeSpec, it.sleeveSpec)
      : undefined)
    return up != null ? sum + up * (it.quantity ?? 1) : sum
  }, 0), [items, priceMap, priceMapByMfr, pct])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // 파싱 모달
  const [parseOpen, setParseOpen]         = useState(false)
  const [parseFile, setParseFile]         = useState<File | null>(null)
  const [parsePreview, setParsePreview]   = useState<string | null>(null)
  const [parseParsing, setParseParsing]   = useState(false)
  const [parsedItems, setParsedItems]     = useState<any[] | null>(null)
  const [headerDraft, setHeaderDraft]     = useState<HeaderDraft | null>(null)
  const parseInputRef                     = useRef<HTMLInputElement>(null)
  const [fromQuoteId, setFromQuoteId] = useState<string | null>(null)
  const [prefillVendor, setPrefillVendor] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCustomers(data)
    }).catch(() => {})
    fetch('/api/pipe-prices').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setAllPrices(data)
        setSealantMap(buildSealantMap(data))
      }
    }).catch(() => {})

    const raw = sessionStorage.getItem('order_prefill')
    if (!raw && localStorage.getItem(DRAFT_KEY)) setHasDraft(true)
    if (!raw) return
    sessionStorage.removeItem('order_prefill')
    try {
      const p = JSON.parse(raw)
      setFromQuoteId(p.from_quote_id ?? null)
      setPrefillVendor(p.vendor ?? null)
      setProject(p.project ?? '')
      setDeliveryDate(p.deliveryDate ?? '')
      setAuthor(p.author ?? '')
      setContactName(p.contactName ?? '')
      setContactPhone(p.contactPhone ?? '')
      setDeliveryLocation(p.deliveryLocation ?? '')
      setAddress(p.address ?? '')
      setDeliveryDest(p.deliveryDest ?? '')
      setNotes(p.notes ?? '')
      if (Array.isArray(p.items) && p.items.length > 0) setItems(p.items)
    } catch {}
  }, [])

  // prefillVendor가 있고 customers가 로드된 후 vendor/pct 설정
  useEffect(() => {
    if (!prefillVendor || customers.length === 0) return
    const customer = customers.find(c => c.name === prefillVendor)
    setVendor(prefillVendor)
    setPct(customer?.sale_pct ?? null)
    setPrefillVendor(null)
  }, [prefillVendor, customers])

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        vendor, vendorMode, pct, project, orderDate, deliveryDate, author,
        contactName, contactPhone, deliveryLocation, address, deliveryDest, notes, items,
      }))
      toast.success('Draft saved.')
    } catch {}
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.vendor) setVendor(d.vendor)
      if (d.vendorMode) setVendorMode(d.vendorMode)
      if (d.pct != null) setPct(d.pct)
      if (d.project) setProject(d.project)
      if (d.orderDate) setOrderDate(d.orderDate)
      if (d.deliveryDate) setDeliveryDate(d.deliveryDate)
      if (d.author) setAuthor(d.author)
      if (d.contactName) setContactName(d.contactName)
      if (d.contactPhone) setContactPhone(d.contactPhone)
      if (d.deliveryLocation) setDeliveryLocation(d.deliveryLocation)
      if (d.address) setAddress(d.address)
      if (d.deliveryDest) setDeliveryDest(d.deliveryDest)
      if (d.notes) setNotes(d.notes)
      if (d.items) setItems(d.items)
      setHasDraft(false)
      localStorage.removeItem(DRAFT_KEY)
      router.push('/dashboard/orders/new?step=form')
      toast.success('Draft restored.')
    } catch {}
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  function resetParseModal() {
    setParseFile(null)
    setParsePreview(null)
    setParsedItems(null)
    setHeaderDraft(null)
  }

  function handleParseFileSelect(file: File) {
    setParseFile(file)
    setParsedItems(null)
    setHeaderDraft(null)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setParsePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setParsePreview(null)
    }
  }

  async function handleStartParse() {
    if (!parseFile) return
    setParseParsing(true)
    try {
      const fd = new FormData()
      fd.append('file', parseFile)
      const res = await fetch('/api/quotes/parse-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Parsing failed'); return }
      const items = data.parsed?.items ?? []
      if (items.length === 0) { toast.warning('No items were parsed.'); return }
      setParsedItems(items)
      setHeaderDraft(buildHeaderDraft(data.parsed?.header ?? {}, orderDate))
    } catch { toast.error('An error occurred while parsing.') }
    finally { setParseParsing(false) }
  }

  function updateParsedItem(index: number, patch: Partial<{ name: string; spec: string; quantity: number }>) {
    setParsedItems(prev => prev ? prev.map((it, i) => i === index ? { ...it, ...patch } : it) : prev)
  }

  function updateHeaderDraft(patch: Partial<HeaderDraft>) {
    setHeaderDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  function applyParsedItems() {
    if (!parsedItems) return
    setItems(parsedItems.map((it: any, i: number) => ({ ...it, no: i + 1 })))

    const h = headerDraft
    if (h) {
      if (h.vendor.trim()) {
        const trimmed = h.vendor.trim()
        const matched = customers.find(c => c.name === trimmed)
        if (matched) { setVendorMode('existing'); setVendor(matched.name); setPct(matched.sale_pct) }
        else { setVendorMode('new'); setVendor(trimmed) }
      }
      if (h.project) setProject(h.project)
      if (h.deliveryDate) setDeliveryDate(h.deliveryDate)
      if (h.contactName) setContactName(h.contactName)
      if (h.contactPhone) setContactPhone(h.contactPhone)
      if (h.deliveryLocation) setDeliveryLocation(h.deliveryLocation)
      if (h.address) setAddress(h.address)
      if (h.deliveryDest) setDeliveryDest(h.deliveryDest)
    }

    toast.success(`${parsedItems.length} item(s) applied. Please select the internal name manually.`)
    setParseOpen(false)
    resetParseModal()
  }

  function selectType(type: OrderType) {
    if (type === '사각덕트') { router.push('/dashboard/duct-orders/new'); return }
    setOrderType(type)
    router.push('/dashboard/orders/new?step=form')
  }

  async function handleSave() {
    if (!vendor.trim()) { setError('Please enter the requesting party.'); return }
    if (!project.trim()) { setError('Please enter the project name.'); return }
    if (!author.trim()) { setError('Please select the author.'); return }

    const filledItems = items.filter(it => it.name.trim() || it.internalName?.trim())
    if (filledItems.length === 0) { setError('Please enter at least one item.'); return }
    if (filledItems.some(it => it.internalName !== '수기 금액 추가' && !it.spec?.trim())) { setError('Please enter the spec for all items.'); return }

    setError('')
    setSaving(true)

    const fileUrls: string[] = []
    for (const f of imageFiles) {
      const fd = new FormData(); fd.append('file', f)
      const imgRes = await fetch('/api/orders/image', { method: 'POST', body: fd })
      const imgData = await imgRes.json()
      if (!imgRes.ok) { setError(imgData.error ?? 'Image upload failed'); setSaving(false); return }
      fileUrls.push(imgData.imageUrl)
    }

    const payload = {
      vendor, project,
      orderClient: vendor,
      manufacturer: [...new Set(filledItems.map(it => (it as any).manufacturer).filter(Boolean))].join(',') || '필립산업',
      orderDate: orderDate || today(),
      deliveryDate,
      author, contactName, contactPhone,
      deliveryLocation, address, deliveryDest, notes,
      items: filledItems.map((it, i) => ({
        no: i + 1,
        name: it.name,
        spec: it.spec,
        unit: it.unit,
        quantity: it.quantity,
        internalName: it.internalName || undefined,
        displayName: it.displayName || undefined,
        pipeSpec: it.pipeSpec || undefined,
        sleeveSpec: it.sleeveSpec || undefined,
        note: it.note || undefined,
      })),
      fileUrls,
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'An error occurred while saving.'); setSaving(false); return }

      if (fromQuoteId) {
        await fetch(`/api/pipe-quotes/${fromQuoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: '수주확정', converted_order_id: data.id }),
        }).catch(() => {})
      }

      toast.success('Order saved.')
      if (data.ecount === 'ok') {
        toast.success('[ECOUNT] Sale order registered', { autoClose: 3000 })
      } else if (data.ecount === 'skipped') {
        toast.info('Skipped ECOUNT sale order registration — no matching item code.')
      } else {
        toast.error(`ECOUNT sale order registration failed (order was still saved)\n${data.ecountError ?? ''}`, { autoClose: false })
      }
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/dashboard/orders/${data.id}`)
    } catch {
      setError('An error occurred while saving.')
      setSaving(false)
    }
  }

  return (
    <div className="w-full">
      {/* Type selection */}
      {step === 'select' && (
        <div className="transition-all duration-250 ease-in-out">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900">New Order</h1>
            <p className="text-sm text-gray-500 mt-0.5">Please select an item type.</p>
          </div>
          <div className="flex flex-col gap-3 max-w-lg">
            <button onClick={() => selectType('배관')}
              className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-blue-300 bg-blue-200 hover:border-blue-500 hover:bg-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left">
              <div>
                <p className="text-lg font-bold text-blue-800">Pipe</p>
                <p className="text-sm text-blue-700">Pipe fixture order</p>
              </div>
              <svg className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => router.push('/dashboard/duct-orders/new')}
              className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-orange-300 bg-orange-200 hover:border-orange-500 hover:bg-orange-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left">
              <div>
                <p className="text-lg font-bold text-orange-800">Rectangular Duct</p>
                <p className="text-sm text-orange-700">Rectangular duct order</p>
              </div>
              <svg className="w-4 h-4 text-orange-500 group-hover:text-orange-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => router.push('/dashboard/orders/groups/new')}
              className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-purple-300 bg-purple-200 hover:border-purple-500 hover:bg-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left">
              <div>
                <p className="text-lg font-bold text-purple-800">Pipe + Rectangular Duct</p>
                <p className="text-sm text-purple-700">Combined order (tabbed)</p>
              </div>
              <svg className="w-4 h-4 text-purple-500 group-hover:text-purple-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => router.push('/dashboard/fire-blanket-orders/new')}
              className="group flex items-center justify-between w-full px-7 py-5 rounded-xl border-2 border-red-300 bg-red-200 hover:border-red-500 hover:bg-red-300 hover:shadow-md transition-all duration-200 cursor-pointer text-left">
              <div>
                <p className="text-lg font-bold text-red-800">Fire Blanket</p>
                <p className="text-sm text-red-700">Fire blanket order</p>
              </div>
              <svg className="w-4 h-4 text-red-500 group-hover:text-red-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {step === 'form' && (
        <div className="transition-all duration-250 ease-in-out space-y-5" >
          {/* 헤더 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/orders/new')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">New Order</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#014A99]">{orderType === '배관' ? 'Pipe' : orderType}</span>
              </div>
              <button
                onClick={() => setParseOpen(true)}
                className="flex items-center gap-2 ml-2 px-3.5 py-2 rounded-lg border border-dashed border-[#014A99]/40 hover:border-[#014A99] hover:bg-blue-50/50 transition-colors cursor-pointer group"
              >
                <svg className="w-4 h-4 text-[#014A99]/60 group-hover:text-[#014A99] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#014A99]/80 group-hover:text-[#014A99] leading-tight">Parse Image</p>
                  <p className="text-xs text-gray-400 leading-tight">Fill out this form more easily from an image</p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveDraft} className="px-4 py-2.5 rounded-md text-sm font-medium text-amber-600 border border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer">Save Draft</button>
              <button onClick={() => router.back()} className="px-4 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-5 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors" style={{ backgroundColor: '#014A99' }}>
                Save
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
          )}

          {hasDraft && (
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-amber-800 font-medium">You have a saved draft.</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={restoreDraft} className="text-[#014A99] text-sm font-medium hover:underline cursor-pointer">Restore</button>
                <button onClick={clearDraft} className="text-gray-400 text-sm hover:text-gray-600 cursor-pointer">Dismiss</button>
              </div>
            </div>
          )}

          {/* Order info */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#014A99' }} />
              <h2 className="font-semibold text-gray-800 text-sm">Order Info</h2>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Requesting Party" required>
                <select
                  value={vendorMode === 'new' ? '__new__' : vendor}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '__new__') {
                      setVendorMode('new'); setVendor(''); setPct(null)
                    } else {
                      setVendorMode('existing'); setVendor(val)
                      const c = customers.find(x => x.name === val)
                      setPct(c?.sale_pct ?? null)
                    }
                  }}
                  className={INPUT_CLS + ' cursor-pointer'}
                >
                  <option value="">-- Select Vendor --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.sale_pct}%)</option>
                  ))}
                  <option value="__new__">Enter Manually (New Vendor)</option>
                </select>
                {vendorMode === 'new' && (
                  <input
                    value={vendor}
                    onChange={e => setVendor(e.target.value)}
                    placeholder="Enter new vendor name"
                    className={INPUT_CLS + ' mt-2'}
                  />
                )}
                {customers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No vendors registered.{' '}
                    <a href="/dashboard/customers" className="underline hover:text-amber-800">Register a vendor</a>
                    {' '}and try again.
                  </p>
                )}
              </Field>
              {pct != null && (
                <Field label="Sale Price Ratio">
                  <div className={INPUT_CLS + ' bg-gray-50 text-gray-500 cursor-default'}>
                    Negotiated price × {pct}%
                  </div>
                </Field>
              )}
              <Field label="Project" required>
                <input value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Apartment complex, Nonhyeon-dong, Gangnam-gu" className={INPUT_CLS} />
              </Field>
              <Field label="Order Date">
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Requested Delivery Date">
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Author" required>
                <select value={author} onChange={e => setAuthor(e.target.value)} className={INPUT_CLS}>
                  <option value="">-- Select --</option>
                  {['이주헌', '이주선', '이주송', '이민수'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Delivery Recipient">
                <input value={deliveryDest} onChange={e => setDeliveryDest(e.target.value)} placeholder="Delivery recipient" className={INPUT_CLS} />
              </Field>
              <Field label="Contact Person">
                <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact person's name" className={INPUT_CLS} />
              </Field>
              <Field label="Contact Phone">
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="010-0000-0000" className={INPUT_CLS} />
              </Field>
              <Field label="Delivery Location">
                <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} placeholder="Delivery location" className={INPUT_CLS} />
              </Field>
              <Field label="Address">
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Site address" className={INPUT_CLS} />
              </Field>
              <Field label="Notes" className="col-span-2">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes" className={INPUT_CLS + ' resize-y'} />
              </Field>
            </div>
          </div>

          {/* Image attachment */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#014A99' }} />
              <h2 className="font-semibold text-gray-800 text-sm">Order Image <span className="text-gray-400 font-normal">(optional)</span></h2>
            </div>
            <div className="p-5">
              <MultiFileUploader files={imageFiles} onChange={setImageFiles} />
            </div>
          </div>

          {/* Item table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: '#014A99' }} />
                <h2 className="font-semibold text-gray-800 text-sm">Item List</h2>
              </div>
            </div>
            <PipeItemsTable
              items={items}
              onChange={setItems}
              ps={ps}
              priceMap={priceMap}
              pct={pct}
              sealantMap={sealantMap}
              showNote
              showHeatCalc
              showManufacturer
              manufacturers={pipeManufacturers}
              defaultManufacturer={pipeManufacturers[0]}
              psByManufacturer={psByMfr}
              priceMapByManufacturer={priceMapByMfr}
              ilwiRawMapByMfr={ilwiRawMapByMfr}
            />
            {saleTotal > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-end gap-2 bg-gray-50/50">
                <span className="text-xs text-gray-400">Total</span>
                <span className="text-sm font-bold text-gray-800">{saleTotal.toLocaleString()} KRW</span>
              </div>
            )}
          </div>

          {/* Bottom buttons */}
          <div className="flex items-center justify-end gap-3 pb-8">
            {error && <span className="text-sm text-red-500">{error}</span>}
            <button onClick={() => router.back()} className="px-5 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-6 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors" style={{ backgroundColor: '#014A99' }}>
              Save
            </button>
          </div>
        </div>
      )}

      {/* Save confirmation modal */}
      {showConfirm && (() => {
        const filledItems = items.filter(it => it.name.trim() || it.internalName?.trim())
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
              <h2 className="font-bold text-gray-900 text-lg mb-1">Confirm Save</h2>
              <div className="text-sm text-gray-600 mb-4 flex items-center gap-2 flex-wrap">
                {vendor && <span className="font-semibold text-gray-800">{vendor}</span>}
                {vendor && project && <span className="text-gray-300">·</span>}
                {project ? <span className="font-semibold text-gray-800">{project}</span> : <span className="text-gray-400">No project name</span>}
                {deliveryDate && <><span className="text-gray-300">·</span><span className="text-gray-500">Delivery {deliveryDate}</span></>}
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <th className="px-3 py-2 text-left font-medium">Manufacturer</th>
                      <th className="px-3 py-2 text-left font-medium">Item Name</th>
                      <th className="px-3 py-2 text-left font-medium">Internal Name</th>
                      <th className="px-3 py-2 text-center font-medium">Spec</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filledItems.map((it, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-gray-500">{it.manufacturer || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{it.name || '—'}</td>
                        <td className="px-3 py-2 font-medium text-[#014A99]">{it.internalName || '—'}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{it.spec || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">{filledItems.length} item(s) total</span>
                <div className="flex gap-3">
                  <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">Cancel</button>
                  <button
                    onClick={() => { setShowConfirm(false); handleSave() }}
                    disabled={saving}
                    className="px-5 py-2 text-sm font-semibold text-white rounded-md hover:opacity-90 disabled:opacity-60 cursor-pointer"
                    style={{ backgroundColor: '#014A99' }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
      {/* Image parsing modal */}
      {parseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) { setParseOpen(false); resetParseModal() } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Parse Image</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill out this form more easily from an image</p>
              </div>
              <button onClick={() => { setParseOpen(false); resetParseModal() }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Image upload */}
              {!parsedItems && (
                <>
                  <input ref={parseInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleParseFileSelect(f) }} />
                  <div
                    onClick={() => parseInputRef.current?.click()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleParseFileSelect(f) }}
                    onDragOver={e => e.preventDefault()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#014A99] hover:bg-blue-50/30 transition-colors"
                  >
                    {parseFile ? (
                      <div className="space-y-2">
                        {parsePreview && <img src={parsePreview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />}
                        <p className="text-sm font-medium text-gray-700">{parseFile.name}</p>
                        <p className="text-xs text-gray-400">Click to change</p>
                      </div>
                    ) : (
                      <div className="space-y-2 text-gray-400 py-4">
                        <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Drag or click to upload an image or PDF</p>
                        <p className="text-xs">JPG · PNG · PDF supported</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleStartParse} disabled={!parseFile || parseParsing}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#014A99' }}>
                      {parseParsing ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                          Parsing...
                        </span>
                      ) : 'Start Parsing'}
                    </button>
                  </div>
                </>
              )}

              {/* Parsed result preview (editable) */}
              {parsedItems && (
                <>
                  {headerDraft && !isHeaderDraftEmpty(headerDraft) && (
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 bg-blue-50/40 border-b border-gray-200 text-xs font-medium text-blue-800">
                        Order Info (review and edit if needed)
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-2.5">
                        <ParseField label="Requesting Party">
                          <input value={headerDraft.vendor} onChange={e => updateHeaderDraft({ vendor: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                        <ParseField label="Project">
                          <input value={headerDraft.project} onChange={e => updateHeaderDraft({ project: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                        <ParseField label="Requested Delivery Date">
                          <input type="date" value={headerDraft.deliveryDate} onChange={e => updateHeaderDraft({ deliveryDate: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                        <ParseField label="Delivery Recipient">
                          <input value={headerDraft.deliveryDest} onChange={e => updateHeaderDraft({ deliveryDest: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                        <ParseField label="Contact Person">
                          <input value={headerDraft.contactName} onChange={e => updateHeaderDraft({ contactName: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                        <ParseField label="Contact Phone">
                          <input value={headerDraft.contactPhone} onChange={e => updateHeaderDraft({ contactPhone: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                        <ParseField label="Delivery Location">
                          <input value={headerDraft.deliveryLocation} onChange={e => updateHeaderDraft({ deliveryLocation: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                        <ParseField label="Address">
                          <input value={headerDraft.address} onChange={e => updateHeaderDraft({ address: e.target.value })} className={PARSE_INPUT_CLS} />
                        </ParseField>
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-medium">Item Name</th>
                          <th className="px-3 py-2.5 text-left font-medium w-24">Spec</th>
                          <th className="px-3 py-2.5 text-right font-medium w-14">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {parsedItems.map((it: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-1 py-1">
                              <input value={it.name ?? ''} onChange={e => updateParsedItem(i, { name: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-transparent hover:border-gray-200 focus:border-[#014A99] rounded outline-none bg-transparent" />
                            </td>
                            <td className="px-1 py-1">
                              <input value={it.spec ?? ''} onChange={e => updateParsedItem(i, { spec: e.target.value })}
                                className="w-full px-2 py-1.5 text-xs border border-transparent hover:border-gray-200 focus:border-[#014A99] rounded outline-none bg-transparent" />
                            </td>
                            <td className="px-1 py-1">
                              <input type="number" value={it.quantity ?? 1} onChange={e => updateParsedItem(i, { quantity: parseInt(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 text-xs text-right border border-transparent hover:border-gray-200 focus:border-[#014A99] rounded outline-none bg-transparent tabular-nums" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400">{parsedItems.length} item(s) parsed · Fix any OCR errors above before applying. Please select the internal name manually after applying.</p>
                  <div className="flex items-center justify-between">
                    <button onClick={resetParseModal}
                      className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
                      Re-upload
                    </button>
                    <button onClick={applyParsedItems}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#014A99' }}>
                      Apply Items
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, className, children }: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-xs font-medium text-gray-500">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const PARSE_INPUT_CLS = 'border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#014A99] transition-colors w-full'

function ParseField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-400">{label}</label>
      {children}
    </div>
  )
}
