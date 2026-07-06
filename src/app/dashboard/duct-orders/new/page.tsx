'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { DuctItemsTable } from '@/components/DuctItemsTable'
import type { DuctItem } from '@/components/DuctItemsTable'
import MultiFileUploader from '@/components/MultiFileUploader'
import { isProfireManufacturer } from '@/lib/vendor-mappings'

interface DuctPrice {
  manufacturer: string
  price_type: 'per_m' | 'per_item'
  riser_price: number
  wall_price: number
  insul_50t_price?: number
  insul_25t_price?: number
}

interface Customer { id: string; name: string; sale_pct: number }
interface DuctSalePrice { manufacturer: string; customer_id: string; riser_sale_price: number; wall_sale_price: number; insul_50t_sale_price?: number; insul_25t_sale_price?: number }

const DRAFT_KEY = 'draft_duct_order'

const INPUT_CLS = 'border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] transition-colors w-full'
const today = () => new Date().toISOString().slice(0, 10)

function perimeter(item: DuctItem) {
  return (item.width + item.height) * 2 / 1000
}

function calcAmount(item: DuctItem, priceType: 'per_m' | 'per_item') {
  if (priceType === 'per_m') return Math.round(item.unit_price * perimeter(item) * item.quantity)
  return Math.round(item.unit_price * item.quantity)
}

let nextId = 2
function makeItem(unitPrice = 0): DuctItem {
  return { id: nextId++, type: '입상', width: 0, height: 0, quantity: 1, unit_price: unitPrice }
}

export default function NewDuctOrderPage() {
  const router = useRouter()

  const [ductPrices, setDuctPrices] = useState<DuctPrice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [ductSalePrices, setDuctSalePrices] = useState<DuctSalePrice[]>([])

  const [customerName, setCustomerName] = useState('')
  const [vendorMode, setVendorMode] = useState<'existing' | 'new'>('existing')

  // form fields
  const [project, setProject] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [address, setAddress] = useState('')
  const [deliveryDest, setDeliveryDest] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [orderDate, setOrderDate] = useState(today())
  const [deliveryDate, setDeliveryDate] = useState('')
  const [author, setAuthor] = useState('')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<DuctItem[]>([{ id: 1, type: '입상', manufacturer: undefined, width: 0, height: 0, quantity: 1, unit_price: 0 }])
  const [showConfirm, setShowConfirm] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const [fromQuoteId, setFromQuoteId] = useState<string | null>(null)

  // 차열재 수량 (DuctItemsTable에서 콜백으로 받음 — 저장 payload에 필요)
  const [insul50Qty, setInsul50Qty] = useState(0)
  const [insul25Qty, setInsul25Qty] = useState(0)

  useEffect(() => {
    fetch('/api/duct-prices').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setDuctPrices(d)
    }).catch(() => {})
    fetch('/api/customers').then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomers(d) }).catch(() => {})
    fetch('/api/duct-sale-prices').then(r => r.json()).then(d => { if (Array.isArray(d)) setDuctSalePrices(d) }).catch(() => {})

    const raw = sessionStorage.getItem('duct_order_prefill')
    if (!raw && localStorage.getItem(DRAFT_KEY)) setHasDraft(true)
    if (!raw) return
    sessionStorage.removeItem('duct_order_prefill')
    try {
      const p = JSON.parse(raw)
      setFromQuoteId(p.from_quote_id ?? null)
      if (p.customerName) setCustomerName(p.customerName)
      setProject(p.project ?? '')
      setDeliveryDate(p.deliveryDate ?? '')
      setAuthor(p.author ?? '')
      setContactName(p.contactName ?? '')
      setContactPhone(p.contactPhone ?? '')
      setDeliveryLocation(p.deliveryLocation ?? '')
      setAddress(p.address ?? '')
      setDeliveryDest(p.deliveryDest ?? '')
      setNotes(p.notes ?? '')
      if (Array.isArray(p.items) && p.items.length > 0) {
        setItems(p.items.map((it: any, i: number) => ({ ...it, id: i + 1 })))
      }
    } catch {}
  }, [])

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        customerName, vendorMode, project, deliveryLocation, address, deliveryDest,
        contactName, contactPhone, orderDate, deliveryDate, author, notes,
        items, insul50Qty, insul25Qty,
      }))
      toast.success('임시저장되었습니다.')
    } catch {}
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.customerName) setCustomerName(d.customerName)
      if (d.vendorMode) setVendorMode(d.vendorMode)
      if (d.project) setProject(d.project)
      if (d.deliveryLocation) setDeliveryLocation(d.deliveryLocation)
      if (d.address) setAddress(d.address)
      if (d.deliveryDest) setDeliveryDest(d.deliveryDest)
      if (d.contactName) setContactName(d.contactName)
      if (d.contactPhone) setContactPhone(d.contactPhone)
      if (d.orderDate) setOrderDate(d.orderDate)
      if (d.deliveryDate) setDeliveryDate(d.deliveryDate)
      if (d.author) setAuthor(d.author)
      if (d.notes) setNotes(d.notes)
      if (d.items) setItems(d.items)
      if (d.insul50Qty != null) setInsul50Qty(d.insul50Qty)
      if (d.insul25Qty != null) setInsul25Qty(d.insul25Qty)
      setHasDraft(false)
      localStorage.removeItem(DRAFT_KEY)
      toast.success('임시저장 내용을 불러왔습니다.')
    } catch {}
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
  }

  function handleVendorChange(val: string) {
    if (val === '__new__') {
      setVendorMode('new'); setCustomerName('')
    } else {
      setVendorMode('existing'); setCustomerName(val)
      const cid = customers.find(c => c.name === val)?.id
      setItems(prev => prev.map(it => {
        const mfr = it.manufacturer ?? ''
        const dp = ductPrices.find(d => d.manufacturer === mfr)
        if (!dp) return it
        const sp = cid ? ductSalePrices.find(d => d.manufacturer === mfr && d.customer_id === cid) ?? null : null
        return {
          ...it,
          unit_price: sp
            ? (it.type === '입상' ? sp.riser_sale_price : sp.wall_sale_price)
            : (it.type === '입상' ? dp.riser_price : dp.wall_price),
        }
      }))
    }
  }

  async function doSave() {
    if (!customerName.trim()) { setError('발주의뢰처를 입력해 주세요.'); return }
    if (!project.trim()) { setError('현장명을 입력해 주세요.'); return }
    if (!deliveryDate) { setError('납품희망일을 입력해 주세요.'); return }
    if (!author) { setError('작성자를 선택해 주세요.'); return }
    if (items.some(it => it.type !== '수기 금액 추가' && (it.width <= 0 || it.height <= 0))) {
      setError('덕트 품목의 가로/세로 치수를 입력해 주세요.'); return
    }
    setSaving(true)
    setError('')
    try {
      const fileUrls: string[] = []
      for (const f of imageFiles) {
        const fd = new FormData(); fd.append('file', f)
        const imgRes = await fetch('/api/orders/image', { method: 'POST', body: fd })
        const imgData = await imgRes.json()
        if (!imgRes.ok) { setError(imgData.error ?? '이미지 업로드 실패'); setSaving(false); return }
        fileUrls.push(imgData.imageUrl)
      }

      const profireMfr = items.find(it => isProfireManufacturer(it.manufacturer))?.manufacturer ?? ''
      const isProfire  = !!profireMfr
      const primaryMfr = items[0]?.manufacturer ?? ductPrices[0]?.manufacturer ?? ''

      const res = await fetch('/api/duct-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: primaryMfr,
          customerName: customerName || null,
          project: project || null,
          deliveryLocation: deliveryLocation || null,
          address: address || null,
          deliveryDest: deliveryDest || null,
          contactName: contactName || null,
          contactPhone: contactPhone || null,
          orderDate: orderDate || null,
          deliveryDate: deliveryDate || null,
          author: author || null,
          notes: notes || null,
          fileUrls,
          items: [
            ...items.map(it => {
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
                amount: amt, note: it.note || null,
              }
            }),
            ...(isProfire ? (() => {
              const dp  = ductPrices.find(d => d.manufacturer === profireMfr)
              const cid = customers.find(c => c.name === customerName)?.id
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
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '저장 실패'); return }
      const data = await res.json()

      if (fromQuoteId) {
        await fetch(`/api/duct-quotes/${fromQuoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: '수주확정', converted_duct_order_id: data.id }),
        }).catch(() => {})
      }

      toast.success('덕트 수주서가 저장되었습니다.')
      if (data.ecount === 'ok') {
        toast.success('[ECOUNT] 주문서 등록 완료', { autoClose: 3000 })
      } else if (data.ecount === 'skipped') {
        toast.info('ECOUNT 품목코드가 없어 주문입력을 건너뛰었습니다.')
      } else if (data.ecount === 'fail') {
        toast.error(`ECOUNT 주문입력 실패 (수주서는 저장됨)\n${data.ecountError ?? ''}`, { autoClose: false })
      }
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/dashboard/duct-orders/${data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">덕트 수주서 작성</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveDraft} className="px-4 py-2.5 rounded-md text-sm font-medium text-amber-600 border border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer">임시저장</button>
          <button onClick={() => router.back()} className="px-4 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">취소</button>
          <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-5 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer" style={{ backgroundColor: '#014A99' }}>
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

      {/* 발주 정보 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">발주 정보</h2>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="발주의뢰처" required>
            <select
              value={vendorMode === 'new' ? '__new__' : customerName}
              onChange={e => handleVendorChange(e.target.value)}
              className={INPUT_CLS + ' cursor-pointer'}
            >
              <option value="">-- 거래처 선택 --</option>
              {customers.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              <option value="__new__">직접입력 (신규 업체)</option>
            </select>
            {vendorMode === 'new' && (
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="신규 업체명 입력"
                className={INPUT_CLS + ' mt-2'}
              />
            )}
            {customers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                등록된 거래처가 없습니다.{' '}
                <a href="/dashboard/customers" className="underline hover:text-amber-800">거래처 등록</a>
                {' '}후 다시 시도해 주세요.
              </p>
            )}
          </Field>
          <Field label="현장명" required>
            <input value={project} onChange={e => setProject(e.target.value)} className={INPUT_CLS} placeholder="예) 강남구 논현동 공동주택" />
          </Field>
          <Field label="발주일">
            <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="납품희망일" required>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="작성자" required>
            <select value={author} onChange={e => setAuthor(e.target.value)} className={INPUT_CLS + ' cursor-pointer'}>
              <option value="">-- 선택 --</option>
              {['이주헌', '이주선', '이주송', '이민수'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="납품처">
            <input value={deliveryDest} onChange={e => setDeliveryDest(e.target.value)} className={INPUT_CLS} placeholder="납품처" />
          </Field>
          <Field label="인수자">
            <input value={contactName} onChange={e => setContactName(e.target.value)} className={INPUT_CLS} placeholder="인수자 성명" />
          </Field>
          <Field label="인수자 연락처">
            <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={INPUT_CLS} placeholder="010-0000-0000" />
          </Field>
          <Field label="납품장소">
            <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} className={INPUT_CLS} placeholder="납품 장소" />
          </Field>
          <Field label="주소">
            <input value={address} onChange={e => setAddress(e.target.value)} className={INPUT_CLS} placeholder="현장 주소" />
          </Field>
          <Field label="비고" className="col-span-2">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={INPUT_CLS + ' resize-y'} placeholder="비고" />
          </Field>
        </div>
      </div>

      {/* 이미지 첨부 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">발주서 이미지 <span className="text-gray-400 font-normal">(선택)</span></h2>
        </div>
        <div className="p-5">
          <MultiFileUploader files={imageFiles} onChange={setImageFiles} />
        </div>
      </div>

      {/* 품목 목록 */}
      <DuctItemsTable
        items={items}
        onChange={setItems}
        ductPrices={ductPrices}
        ductSalePrices={ductSalePrices}
        customers={customers}
        customerName={customerName}
        onInsulChange={(q50, q25) => { setInsul50Qty(q50); setInsul25Qty(q25) }}
      />

      {/* 하단 버튼 */}
      <div className="flex items-center justify-end gap-3 pb-8">
        {error && <span className="text-sm text-red-500">{error}</span>}
        <button onClick={() => router.back()} className="px-5 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">취소</button>
        <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-6 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer" style={{ backgroundColor: '#014A99' }}>
          저장
        </button>
      </div>

      {/* 저장 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
            <h2 className="font-bold text-gray-900 text-lg mb-1">수주서 저장 확인</h2>
            <div className="text-sm text-gray-600 mb-4 flex items-center gap-2 flex-wrap">
              {customerName && <span className="font-semibold text-gray-800">{customerName}</span>}
              {customerName && project && <span className="text-gray-300">·</span>}
              {project ? <span className="font-semibold text-gray-800">{project}</span> : <span className="text-gray-400">현장명 없음</span>}
              {deliveryDate && <><span className="text-gray-300">·</span><span className="text-gray-500">납품 {deliveryDate}</span></>}
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium">품명</th>
                    <th className="px-3 py-2 text-right font-medium">가로×세로 (mm)</th>
                    <th className="px-3 py-2 text-right font-medium">둘레 (M)</th>
                    <th className="px-3 py-2 text-right font-medium">수량</th>
                    <th className="px-3 py-2 text-right font-medium">단가</th>
                    <th className="px-3 py-2 text-right font-medium">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((it, i) => {
                    const peri = perimeter(it)
                    const amt = Math.round(it.unit_price * peri * it.quantity)
                    return (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {it.type}{it.manufacturer ? <span className="text-gray-400 font-normal ml-1">({it.manufacturer})</span> : ''}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{it.width || '—'}×{it.height || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{peri > 0 ? peri.toFixed(3) : '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{it.unit_price > 0 ? it.unit_price.toLocaleString() : '—'}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{amt > 0 ? amt.toLocaleString() : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">총 {items.length}건</span>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">취소</button>
                <button
                  onClick={() => { setShowConfirm(false); doSave() }}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white rounded-md hover:opacity-90 disabled:opacity-60 cursor-pointer"
                  style={{ backgroundColor: '#014A99' }}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
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
