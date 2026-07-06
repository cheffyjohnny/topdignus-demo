'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { FireBlanketItemsTable } from '@/components/FireBlanketItemsTable'
import type { FireBlanketItem } from '@/components/FireBlanketItemsTable'
import MultiFileUploader from '@/components/MultiFileUploader'

interface FireBlanketPrice { manufacturer: string; item_name: string; spec: string; roll_price: number }
interface Customer { id: string; name: string; sale_pct: number }
interface FireBlanketSalePrice { manufacturer: string; item_name: string; customer_id: string; roll_sale_price: number }

const DRAFT_KEY = 'draft_fire_blanket_order'

const INPUT_CLS = 'border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] transition-colors w-full'
const today = () => new Date().toISOString().slice(0, 10)

function calcAmount(item: FireBlanketItem) {
  return Math.round((item.unit_price || 0) * (item.quantity || 0))
}

export default function NewFireBlanketOrderPage() {
  const router = useRouter()

  const [fireBlanketPrices, setFireBlanketPrices] = useState<FireBlanketPrice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [fireBlanketSalePrices, setFireBlanketSalePrices] = useState<FireBlanketSalePrice[]>([])

  const [customerName, setCustomerName] = useState('')
  const [vendorMode, setVendorMode] = useState<'existing' | 'new'>('existing')

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

  const [items, setItems] = useState<FireBlanketItem[]>([{ id: 1, name: '', spec: '', manufacturer: undefined, quantity: 1, unit_price: 0 }])
  const [showConfirm, setShowConfirm] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    fetch('/api/fire-blanket-prices').then(r => r.json()).then(d => { if (Array.isArray(d)) setFireBlanketPrices(d) }).catch(() => {})
    fetch('/api/customers').then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomers(d) }).catch(() => {})
    fetch('/api/fire-blanket-sale-prices').then(r => r.json()).then(d => { if (Array.isArray(d)) setFireBlanketSalePrices(d) }).catch(() => {})
    if (localStorage.getItem(DRAFT_KEY)) setHasDraft(true)
  }, [])

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        customerName, vendorMode, project, deliveryLocation, address, deliveryDest,
        contactName, contactPhone, orderDate, deliveryDate, author, notes, items,
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
        if (!mfr) return it
        const sp = cid ? fireBlanketSalePrices.find(d => d.manufacturer === mfr && d.item_name === (it.name ?? '') && d.customer_id === cid) ?? null : null
        const fp = fireBlanketPrices.find(p => p.manufacturer === mfr && p.item_name === (it.name ?? ''))
        return { ...it, unit_price: (sp && (sp.roll_sale_price ?? 0) > 0) ? sp.roll_sale_price : (fp?.roll_price ?? it.unit_price) }
      }))
    }
  }

  async function doSave() {
    if (!customerName.trim()) { setError('발주의뢰처를 입력해 주세요.'); return }
    if (!project.trim()) { setError('현장명을 입력해 주세요.'); return }
    if (!deliveryDate) { setError('납품희망일을 입력해 주세요.'); return }
    if (!author) { setError('작성자를 선택해 주세요.'); return }
    setSaving(true); setError('')
    try {
      const fileUrls: string[] = []
      for (const f of imageFiles) {
        const fd = new FormData(); fd.append('file', f)
        const imgRes = await fetch('/api/orders/image', { method: 'POST', body: fd })
        const imgData = await imgRes.json()
        if (!imgRes.ok) { setError(imgData.error ?? '이미지 업로드 실패'); setSaving(false); return }
        fileUrls.push(imgData.imageUrl)
      }

      const primaryMfr = items[0]?.manufacturer ?? fireBlanketPrices[0]?.manufacturer ?? ''

      const res = await fetch('/api/fire-blanket-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: primaryMfr,
          customerName: customerName.trim() || null,
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
          items: items.map(it => ({
            name: it.name,
            spec: it.spec || null,
            manufacturer: it.manufacturer || null,
            quantity: it.quantity,
            unit_price: it.unit_price,
            amount: calcAmount(it),
            note: it.note || null,
          })),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '저장 실패'); return }
      const data = await res.json()

      toast.success('방화포 수주서가 저장되었습니다.')
      if (data.ecount === 'ok') {
        toast.success('[ECOUNT] 주문서 등록 완료', { autoClose: 3000 })
      } else if (data.ecount === 'skipped') {
        toast.info('ECOUNT 품목코드가 없어 주문입력을 건너뛰었습니다.')
      } else if (data.ecount === 'fail') {
        toast.error(`ECOUNT 주문입력 실패 (수주서는 저장됨)\n${data.ecountError ?? ''}`, { autoClose: false })
      }
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/dashboard/fire-blanket-orders/${data.id}`)
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
          <h1 className="text-xl font-bold text-gray-900">방화포 수주서 작성</h1>
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
              {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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

      {/* 발주서 이미지 */}
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
      <FireBlanketItemsTable
        items={items}
        onChange={setItems}
        fireBlanketPrices={fireBlanketPrices}
        fireBlanketSalePrices={fireBlanketSalePrices}
        customers={customers}
        customerName={customerName}
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
                    <th className="px-3 py-2 text-left font-medium">규격</th>
                    <th className="px-3 py-2 text-left font-medium">제조사</th>
                    <th className="px-3 py-2 text-right font-medium">수량 (롤)</th>
                    <th className="px-3 py-2 text-right font-medium">단가</th>
                    <th className="px-3 py-2 text-right font-medium">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((it, i) => {
                    const amt = calcAmount(it)
                    return (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-800">{it.name || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{it.spec || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{it.manufacturer || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{it.unit_price > 0 ? it.unit_price.toLocaleString() : '—'}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{amt > 0 ? amt.toLocaleString() : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">총 {items.length}건 · 합계 {items.reduce((s, it) => s + calcAmount(it), 0).toLocaleString()}원</span>
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
