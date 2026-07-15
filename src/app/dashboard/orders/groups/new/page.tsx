'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import type { OrderItem } from '@/lib/parse-order'
import { buildPriceMap, buildSealantMap, buildPipeSleeveStructure, buildManufacturerMaps, buildIlwidaegaMapByMfr, lookupSalePrice, type PriceRowMin } from '@/lib/price-utils'
import { PipeItemsTable } from '@/components/PipeItemsTable'
import { DuctItemsTable } from '@/components/DuctItemsTable'
import type { DuctItem } from '@/components/DuctItemsTable'
import { isProfireManufacturer } from '@/lib/vendor-mappings'

interface Customer { id: string; name: string; sale_pct: number }
interface DuctPrice { manufacturer: string; price_type: 'per_m' | 'per_item'; riser_price: number; wall_price: number; insul_50t_price?: number; insul_25t_price?: number }
interface DuctSalePrice { manufacturer: string; customer_id: string; riser_sale_price: number; wall_sale_price: number; insul_50t_sale_price?: number; insul_25t_sale_price?: number }

const DRAFT_KEY = 'draft_group_order'

const INPUT_CLS = 'border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] transition-colors w-full'
const today = () => new Date().toISOString().slice(0, 10)

export default function NewGroupOrderPage() {
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vendor, setVendor] = useState('')
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

  const [activeTab, setActiveTab] = useState<'배관' | '덕트'>('배관')

  const [pipeItems, setPipeItems] = useState<OrderItem[]>([{ no: 1, name: '', spec: '', unit: 'ea', quantity: 1 }])
  const [allPrices, setAllPrices] = useState<PriceRowMin[]>([])
  const [sealantMap, setSealantMap] = useState<Map<string, number>>(new Map())
  const { psByMfr, priceMapByMfr, manufacturers: pipeManufacturers } = useMemo(
    () => buildManufacturerMaps(allPrices),
    [allPrices]
  )
  const priceMap = useMemo(() => buildPriceMap(allPrices), [allPrices])
  const ps = useMemo(() => buildPipeSleeveStructure(allPrices), [allPrices])
  const ilwiRawMapByMfr = useMemo(() => buildIlwidaegaMapByMfr(allPrices), [allPrices])

  const [ductItems, setDuctItems] = useState<DuctItem[]>([{ id: 1, type: '입상', width: 0, height: 0, quantity: 1, unit_price: 0 }])
  const [ductPrices, setDuctPrices] = useState<DuctPrice[]>([])
  const [ductSalePrices, setDuctSalePrices] = useState<DuctSalePrice[]>([])
  const [insul50Qty, setInsul50Qty] = useState(0)
  const [insul25Qty, setInsul25Qty] = useState(0)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const pipeSaleTotal = useMemo(() => pipeItems.reduce((sum, it) => {
    const mfrMap = it.manufacturer ? (priceMapByMfr.get(it.manufacturer) ?? priceMap) : priceMap
    const up = it.unitPrice ?? (pct !== null && it.internalName
      ? lookupSalePrice(mfrMap, pct, it.internalName, it.pipeSpec, it.sleeveSpec)
      : undefined)
    return up != null ? sum + up * (it.quantity ?? 1) : sum
  }, 0), [pipeItems, priceMap, priceMapByMfr, pct])

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
    fetch('/api/duct-prices').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setDuctPrices(data)
    }).catch(() => {})
    fetch('/api/duct-sale-prices').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setDuctSalePrices(data)
    }).catch(() => {})
    if (localStorage.getItem(DRAFT_KEY)) setHasDraft(true)
  }, [])

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        vendor, pct, project, orderDate, deliveryDate, author, contactName, contactPhone,
        deliveryLocation, address, deliveryDest, notes,
        pipeItems, ductItems, insul50Qty, insul25Qty, activeTab,
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
      if (d.pipeItems) setPipeItems(d.pipeItems)
      if (d.ductItems) setDuctItems(d.ductItems)
      if (d.insul50Qty != null) setInsul50Qty(d.insul50Qty)
      if (d.insul25Qty != null) setInsul25Qty(d.insul25Qty)
      if (d.activeTab) setActiveTab(d.activeTab)
      setHasDraft(false)
      localStorage.removeItem(DRAFT_KEY)
      toast.success('Draft restored.')
    } catch {}
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  async function handleSave() {
    if (!vendor.trim()) { setError('Please select a vendor.'); return }
    if (!author.trim()) { setError('Please select the author.'); return }
    if (!deliveryDate) { setError('Please enter the requested delivery date.'); return }

    const filledPipe = pipeItems.filter(it => it.name.trim() || (it as any).internalName?.trim())
    if (filledPipe.length === 0 && ductItems.length === 0) {
      setError('Please enter at least one pipe or duct item.'); return
    }
    if (ductItems.some(it => it.type !== '수기 금액 추가' && (it.width <= 0 || it.height <= 0))) {
      setError('Please enter width/height for the duct items.'); return
    }
    if (filledPipe.some(it => it.internalName !== '수기 금액 추가' && !it.spec?.trim())) {
      setError('Please enter the spec for all pipe items.'); return
    }

    setError('')
    setSaving(true)

    try {
      const groupRes = await fetch('/api/order-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, orderClient: vendor, project, orderDate, author, contactName, contactPhone, deliveryLocation, address, deliveryDest, notes }),
      })
      const groupData = await groupRes.json()
      if (!groupRes.ok) throw new Error(groupData.error)
      const groupId: string = groupData.id
      const baseNo: string = groupData.baseNo

      if (filledPipe.length > 0) {
        const pipeMfrs = [...new Set(filledPipe.map((it: any) => it.manufacturer).filter(Boolean))]
        const pipePrimaryMfr = pipeMfrs[0] ?? '필립산업'
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor, orderClient: vendor, project, orderDate, deliveryDate, author, contactName, contactPhone,
            deliveryLocation, address, deliveryDest, notes,
            manufacturer: pipePrimaryMfr,
            groupId,
            orderNo: `${baseNo}-배관(${pipePrimaryMfr})`,
            items: filledPipe.map((it, i) => ({ ...it, no: i + 1 })),
          }),
        })
      }

      if (ductItems.length > 0) {
        const ductPrimaryMfr = ductItems[0]?.manufacturer ?? ''
        const profireMfr = ductItems.find(it => isProfireManufacturer(it.manufacturer))?.manufacturer ?? ''
        const isDuctProfire = !!profireMfr
        await fetch('/api/duct-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manufacturer: ductPrimaryMfr,
            customerName: vendor, project, orderDate, deliveryDate, author, contactName, contactPhone,
            deliveryLocation, address, deliveryDest, notes,
            groupId,
            orderNo: `${baseNo}-덕트(${ductPrimaryMfr})`,
            items: [
              ...ductItems.map(it => {
                if (it.type === '수기 금액 추가') {
                  return { type: it.type, manufacturer: null, width: 0, height: 0, perimeter: 0, quantity: it.quantity, unit_price: it.unit_price, amount: it.unit_price * it.quantity, note: it.note || null }
                }
                const mfr  = it.manufacturer ?? ''
                const dp   = ductPrices.find(d => d.manufacturer === mfr)
                const pt   = dp?.price_type ?? 'per_m'
                const peri = (it.width + it.height) * 2 / 1000
                const amt  = pt === 'per_m'
                  ? Math.round(it.unit_price * peri * it.quantity)
                  : Math.round(it.unit_price * it.quantity)
                return {
                  type: it.type, manufacturer: it.manufacturer || null,
                  width: it.width, height: it.height,
                  perimeter: Math.round(peri * 1000) / 1000,
                  quantity: it.quantity, unit_price: it.unit_price,
                  purchase_price: it.purchase_price ?? null,
                  amount: amt, note: it.note || null,
                }
              }),
              ...(isDuctProfire ? (() => {
                const dp  = ductPrices.find(d => d.manufacturer === profireMfr)
                const cid = customers.find(c => c.name === vendor)?.id
                const sp  = cid ? ductSalePrices.find(d => d.manufacturer === profireMfr && d.customer_id === cid) : null
                const p50 = (sp?.insul_50t_sale_price ?? 0) > 0 ? sp!.insul_50t_sale_price! : (dp?.insul_50t_price ?? 0)
                const p25 = (sp?.insul_25t_sale_price ?? 0) > 0 ? sp!.insul_25t_sale_price! : (dp?.insul_25t_price ?? 0)
                return [
                  ...(insul50Qty > 0 ? [{ type: '차열재', spec: '50T×400×3.6M', quantity: insul50Qty, unit_price: p50, amount: insul50Qty * p50 }] : []),
                  ...(insul25Qty > 0 ? [{ type: '차열재', spec: '25T×400×7.2M', quantity: insul25Qty, unit_price: p25, amount: insul25Qty * p25 }] : []),
                ]
              })() : []),
            ],
          }),
        })
      }

      toast.success('Group order saved.')
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/dashboard/orders/groups/${groupId}`)
    } catch (e: any) {
      setError(e.message ?? 'An error occurred while saving.')
      setSaving(false)
    }
  }

  const filledPipeForConfirm = pipeItems.filter(it => it.name.trim() || (it as any).internalName?.trim())

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/orders')} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Pipe + Duct Order</h1>
            <span className="text-xs text-gray-400">Manage pipe and duct items as a single order.</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveDraft} className="px-4 py-2.5 rounded-md text-sm font-medium text-amber-600 border border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer">Save Draft</button>
          <button onClick={() => router.back()} className="px-4 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
          <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-5 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer bg-purple-600">
            Save
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

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

      {/* Common info */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-purple-500 shrink-0" />
          <h2 className="font-semibold text-gray-800 text-sm">Common Info</h2>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Requesting Party" required>
            <select value={vendor} onChange={e => { setVendor(e.target.value); setPct(customers.find(c => c.name === e.target.value)?.sale_pct ?? null) }} className={INPUT_CLS}>
              <option value="">-- Select --</option>
              {customers.map(c => <option key={c.id} value={c.name}>{c.name} ({c.sale_pct}%)</option>)}
            </select>
          </Field>
          <Field label="Project" required>
            <input value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Apartment complex, Nonhyeon-dong, Gangnam-gu" className={INPUT_CLS} />
          </Field>
          <Field label="Order Date">
            <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="Requested Delivery Date" required>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="Author" required>
            <select value={author} onChange={e => setAuthor(e.target.value)} className={INPUT_CLS}>
              <option value="">-- Select --</option>
              {['이주헌', '이주선', '이주송', '이민수'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Contact Person">
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact person's name" className={INPUT_CLS} />
          </Field>
          <Field label="Contact Phone">
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="010-0000-0000" className={INPUT_CLS} />
          </Field>
          <Field label="Delivery Recipient">
            <input value={deliveryDest} onChange={e => setDeliveryDest(e.target.value)} placeholder="Delivery recipient" className={INPUT_CLS} />
          </Field>
          <Field label="Delivery Location">
            <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} placeholder="Delivery location" className={INPUT_CLS} />
          </Field>
          <Field label="Address">
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Site address" className={INPUT_CLS} />
          </Field>
          <Field label="Notes" className="col-span-2">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes" className={INPUT_CLS + ' resize-none'} />
          </Field>
        </div>
      </div>

      {/* Item list tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500 shrink-0" />
            <h2 className="font-semibold text-gray-800 text-sm">Item List</h2>
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          {(['배관', '덕트'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === tab ? (tab === '배관' ? 'border-[#014A99] text-[#014A99]' : 'border-orange-500 text-orange-600') : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full mr-1.5 ${tab === '배관' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>{tab === '배관' ? 'Pipe' : 'Duct'}</span>
              {tab === '배관' ? pipeItems.filter(it => it.name.trim() || (it as any).internalName?.trim()).length : ductItems.length}
            </button>
          ))}
        </div>

        {activeTab === '배관' && (
          <>
            <PipeItemsTable
              items={pipeItems}
              onChange={setPipeItems}
              ps={ps}
              priceMap={priceMap}
              sealantMap={sealantMap}
              pct={pct}
              showNote
              showHeatCalc
              showManufacturer
              manufacturers={pipeManufacturers}
              defaultManufacturer={pipeManufacturers[0]}
              psByManufacturer={psByMfr}
              priceMapByManufacturer={priceMapByMfr}
              ilwiRawMapByMfr={ilwiRawMapByMfr}
            />
            {pipeSaleTotal > 0 && (
              <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-end gap-2 bg-gray-50/50">
                <span className="text-xs text-gray-400">Total</span>
                <span className="text-sm font-bold text-gray-800">{pipeSaleTotal.toLocaleString()} KRW</span>
              </div>
            )}
          </>
        )}
        {activeTab === '덕트' && (
          <DuctItemsTable
            items={ductItems}
            onChange={setDuctItems}
            ductPrices={ductPrices}
            ductSalePrices={ductSalePrices}
            customers={customers}
            customerName={vendor}
            insul50Qty={insul50Qty}
            insul25Qty={insul25Qty}
            onInsulChange={(q50, q25) => { setInsul50Qty(q50); setInsul25Qty(q25) }}
          />
        )}
      </div>

      {/* Bottom buttons */}
      <div className="flex items-center justify-end gap-3 pb-8">
        {error && <span className="text-sm text-red-500">{error}</span>}
        <button onClick={() => router.back()} className="px-5 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
        <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-6 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer bg-purple-600">
          Save
        </button>
      </div>

      {/* Save confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Save Order</h2>
            <p className="text-sm text-gray-600 mb-5">
              {vendor && <><span className="font-medium">{vendor}</span> · </>}
              {project ? <span className="font-medium">{project}</span> : <span className="text-gray-400">No project name</span>}
              <br />
              Pipe {filledPipeForConfirm.length} item(s) · Duct {ductItems.length} item(s) — Save this order?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button
                onClick={() => { setShowConfirm(false); handleSave() }}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white rounded-md hover:opacity-90 disabled:opacity-60 cursor-pointer bg-purple-600"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, className, children }: {
  label: string; required?: boolean; className?: string; children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-xs font-medium text-gray-500">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}
