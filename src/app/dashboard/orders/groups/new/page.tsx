'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import type { OrderItem } from '@/lib/parse-order'
import { buildPriceMap, buildSealantMap, buildPipeSleeveStructure, buildManufacturerMaps, buildIlwidaegaMapByMfr, lookupSalePrice, type PriceRowMin } from '@/lib/price-utils'
import { PipeItemsTable } from '@/components/PipeItemsTable'
import { DuctItemsTable } from '@/components/DuctItemsTable'
import type { DuctItem } from '@/components/DuctItemsTable'

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
        vendor, pct, project, orderDate, author, contactName, contactPhone,
        deliveryLocation, address, deliveryDest, notes,
        pipeItems, ductItems, insul50Qty, insul25Qty, activeTab,
      }))
      toast.success('임시저장되었습니다.')
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
      toast.success('임시저장 내용을 불러왔습니다.')
    } catch {}
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  async function handleSave() {
    if (!vendor.trim()) { setError('업체를 선택해 주세요.'); return }
    if (!author.trim()) { setError('작성자를 입력해 주세요.'); return }

    const filledPipe = pipeItems.filter(it => it.name.trim() || (it as any).internalName?.trim())
    if (filledPipe.length === 0 && ductItems.length === 0) {
      setError('배관 또는 덕트 품목을 1개 이상 입력해 주세요.'); return
    }
    if (ductItems.some(it => it.type !== '수기 금액 추가' && (it.width <= 0 || it.height <= 0))) {
      setError('덕트 품목의 가로/세로 치수를 입력해 주세요.'); return
    }
    if (filledPipe.some(it => it.internalName !== '수기 금액 추가' && !it.spec?.trim())) {
      setError('배관 품목의 규격을 모두 입력해 주세요.'); return
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
            vendor, orderClient: vendor, project, orderDate, deliveryDate: '', author, contactName, contactPhone,
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
        await fetch('/api/duct-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manufacturer: ductPrimaryMfr,
            customerName: vendor, project, orderDate, deliveryDate: '', author, contactName, contactPhone,
            deliveryLocation, address, deliveryDest, notes,
            groupId,
            orderNo: `${baseNo}-덕트(${ductPrimaryMfr})`,
            items: ductItems.map(it => it.type === '수기 금액 추가'
              ? { ...it, manufacturer: null, width: 0, height: 0, perimeter: 0, amount: it.unit_price * it.quantity }
              : it),
          }),
        })
      }

      toast.success('그룹 수주서가 저장되었습니다.')
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/dashboard/orders/groups/${groupId}`)
    } catch (e: any) {
      setError(e.message ?? '저장 중 오류가 발생했습니다.')
      setSaving(false)
    }
  }

  const filledPipeForConfirm = pipeItems.filter(it => it.name.trim() || (it as any).internalName?.trim())

  return (
    <div className="w-full space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/orders')} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">배관 + 사각덕트 수주서 작성</h1>
            <span className="text-xs text-gray-400">배관·덕트를 하나의 수주서로 관리합니다.</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveDraft} className="px-4 py-2.5 rounded-md text-sm font-medium text-amber-600 border border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer">임시저장</button>
          <button onClick={() => router.back()} className="px-4 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">취소</button>
          <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-5 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer bg-purple-600">
            저장
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
            <span className="text-amber-800 font-medium">임시저장된 내용이 있습니다.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={restoreDraft} className="text-[#014A99] text-sm font-medium hover:underline cursor-pointer">불러오기</button>
            <button onClick={clearDraft} className="text-gray-400 text-sm hover:text-gray-600 cursor-pointer">무시</button>
          </div>
        </div>
      )}

      {/* 공통 정보 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-purple-500 shrink-0" />
          <h2 className="font-semibold text-gray-800 text-sm">공통 정보</h2>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="발주의뢰처" required>
            <select value={vendor} onChange={e => { setVendor(e.target.value); setPct(customers.find(c => c.name === e.target.value)?.sale_pct ?? null) }} className={INPUT_CLS}>
              <option value="">-- 선택 --</option>
              {customers.map(c => <option key={c.id} value={c.name}>{c.name} ({c.sale_pct}%)</option>)}
            </select>
          </Field>
          <Field label="현장명" required>
            <input value={project} onChange={e => setProject(e.target.value)} placeholder="예) 강남구 논현동 공동주택" className={INPUT_CLS} />
          </Field>
          <Field label="수주일">
            <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="작성자" required>
            <select value={author} onChange={e => setAuthor(e.target.value)} className={INPUT_CLS}>
              <option value="">-- 선택 --</option>
              {['이주헌', '이주선', '이주송', '이민수'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="인수자">
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="인수자 성명" className={INPUT_CLS} />
          </Field>
          <Field label="인수자 연락처">
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="010-0000-0000" className={INPUT_CLS} />
          </Field>
          <Field label="납품처">
            <input value={deliveryDest} onChange={e => setDeliveryDest(e.target.value)} placeholder="납품처" className={INPUT_CLS} />
          </Field>
          <Field label="납품장소">
            <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} placeholder="납품 장소" className={INPUT_CLS} />
          </Field>
          <Field label="주소">
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="현장 주소" className={INPUT_CLS} />
          </Field>
          <Field label="비고" className="col-span-2">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="비고" className={INPUT_CLS + ' resize-none'} />
          </Field>
        </div>
      </div>

      {/* 품목 목록 탭 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500 shrink-0" />
            <h2 className="font-semibold text-gray-800 text-sm">품목 목록</h2>
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          {(['배관', '덕트'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === tab ? (tab === '배관' ? 'border-[#014A99] text-[#014A99]' : 'border-orange-500 text-orange-600') : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full mr-1.5 ${tab === '배관' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>{tab}</span>
              {tab === '배관' ? pipeItems.filter(it => it.name.trim() || (it as any).internalName?.trim()).length : ductItems.length}건
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
                <span className="text-xs text-gray-400">합계</span>
                <span className="text-sm font-bold text-gray-800">{pipeSaleTotal.toLocaleString()}원</span>
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

      {/* 하단 버튼 */}
      <div className="flex items-center justify-end gap-3 pb-8">
        {error && <span className="text-sm text-red-500">{error}</span>}
        <button onClick={() => router.back()} className="px-5 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">취소</button>
        <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-6 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer bg-purple-600">
          저장
        </button>
      </div>

      {/* 저장 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="font-bold text-gray-900 text-lg mb-1">수주서 저장</h2>
            <p className="text-sm text-gray-600 mb-5">
              {vendor && <><span className="font-medium">{vendor}</span> · </>}
              {project ? <span className="font-medium">{project}</span> : <span className="text-gray-400">현장명 없음</span>}
              <br />
              배관 {filledPipeForConfirm.length}건 · 덕트 {ductItems.length}건 — 저장하시겠습니까?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">취소</button>
              <button
                onClick={() => { setShowConfirm(false); handleSave() }}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white rounded-md hover:opacity-90 disabled:opacity-60 cursor-pointer bg-purple-600"
              >
                {saving ? '저장 중...' : '확인'}
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
