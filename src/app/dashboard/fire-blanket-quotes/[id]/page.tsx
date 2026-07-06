'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-toastify'
import { FireBlanketItemsTable } from '@/components/FireBlanketItemsTable'
import type { FireBlanketItem } from '@/components/FireBlanketItemsTable'

type QuoteStatus = '검토중' | '견적제출' | '수주' | '취소'

interface Quote {
  id: string
  quote_no: string | null
  manufacturer: string | null
  customer_name: string | null
  project: string | null
  delivery_location: string | null
  address: string | null
  delivery_dest: string | null
  contact_name: string | null
  contact_phone: string | null
  order_date: string | null
  delivery_date: string | null
  author: string | null
  notes: string | null
  items: FireBlanketItem[]
  status: QuoteStatus
  status_history: Array<{ status: string; changed_at: string }>
  image_url: string | null
  file_urls?: string[] | null
  sale_amount: number
  created_at: string
}

interface FireBlanketPrice { manufacturer: string; item_name: string; spec: string; roll_price: number }
interface Customer { id: string; name: string; sale_pct: number }
interface FireBlanketSalePrice { manufacturer: string; item_name: string; customer_id: string; roll_sale_price: number }

const STATUS_OPTIONS: QuoteStatus[] = ['검토중', '견적제출', '수주', '취소']

const STATUS_STYLE: Record<QuoteStatus, string> = {
  '검토중':  'bg-gray-100 text-gray-600',
  '견적제출': 'bg-blue-100 text-blue-700',
  '수주':    'bg-green-100 text-green-700',
  '취소':    'bg-gray-100 text-gray-400',
}

const INPUT_CLS = 'border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#014A99] transition-colors w-full'

function fmt(n: number) { return n.toLocaleString('ko-KR') }

export default function FireBlanketQuoteDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [vendorMode, setVendorMode] = useState<'existing' | 'new'>('existing')

  const [fireBlanketPrices, setFireBlanketPrices] = useState<FireBlanketPrice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [fireBlanketSalePrices, setFireBlanketSalePrices] = useState<FireBlanketSalePrice[]>([])

  // edit state
  const [editData, setEditData] = useState<Partial<Quote>>({})
  const [editItems, setEditItems] = useState<FireBlanketItem[]>([])

  const load = useCallback(async () => {
    const res = await fetch(`/api/fire-blanket-quotes/${id}`)
    if (!res.ok) { router.push('/dashboard/fire-blanket-quotes'); return }
    const data: Quote = await res.json()
    setQuote(data)
    setEditData(data)
    setEditItems(Array.isArray(data.items) ? data.items.map((it, i) => ({ ...it, id: it.id ?? i + 1 })) : [])
  }, [id, router])

  useEffect(() => {
    load().finally(() => setLoading(false))
    fetch('/api/fire-blanket-prices').then(r => r.json()).then(d => { if (Array.isArray(d)) setFireBlanketPrices(d) }).catch(() => {})
    fetch('/api/customers').then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomers(d) }).catch(() => {})
    fetch('/api/fire-blanket-sale-prices').then(r => r.json()).then(d => { if (Array.isArray(d)) setFireBlanketSalePrices(d) }).catch(() => {})
  }, [load])

  async function changeStatus(status: QuoteStatus) {
    if (!quote || status === quote.status) return
    const res = await fetch(`/api/fire-blanket-quotes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error('상태 변경 실패'); return }
    const updated: Quote = await res.json()
    setQuote(updated)
    setEditData(updated)
    toast.success(`상태가 "${status}"로 변경되었습니다.`)
  }

  async function doSave() {
    if (!quote) return
    setSaving(true)
    try {
      const res = await fetch(`/api/fire-blanket-quotes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:     editData.customer_name,
          manufacturer:      editData.manufacturer,
          project:           editData.project,
          delivery_location: editData.delivery_location,
          address:           editData.address,
          delivery_dest:     editData.delivery_dest,
          contact_name:      editData.contact_name,
          contact_phone:     editData.contact_phone,
          order_date:        editData.order_date,
          delivery_date:     editData.delivery_date,
          author:            editData.author,
          notes:             editData.notes,
          items: editItems.map(it => ({
            name: it.name, spec: it.spec || null, manufacturer: it.manufacturer || null,
            quantity: it.quantity, unit_price: it.unit_price,
            amount: Math.round((it.unit_price || 0) * (it.quantity || 0)),
            note: it.note || null,
          })),
        }),
      })
      if (!res.ok) { toast.error('저장 실패'); return }
      const updated: Quote = await res.json()
      setQuote(updated)
      setEditData(updated)
      setEditItems(Array.isArray(updated.items) ? updated.items.map((it, i) => ({ ...it, id: it.id ?? i + 1 })) : [])
      setEditing(false)
      toast.success('견적서가 수정되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    const res = await fetch(`/api/fire-blanket-quotes/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('삭제 실패'); return }
    toast.success('견적서가 삭제되었습니다.')
    router.push('/dashboard/fire-blanket-quotes')
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">불러오는 중...</div>
  if (!quote) return null

  const saleVat = Math.round((quote.sale_amount || 0) * 1.1)

  return (
    <div className="w-full space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/fire-blanket-quotes')} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">방화포 견적서</h1>
              {quote.customer_name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{quote.customer_name}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{quote.project ?? '현장명 없음'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                편집
              </button>
              <button onClick={() => setShowDelete(true)} className="px-4 py-2 rounded-md text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer">
                삭제
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setVendorMode('existing'); setEditData(quote); setEditItems(Array.isArray(quote.items) ? quote.items.map((it, i) => ({ ...it, id: it.id ?? i + 1 })) : []) }} className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                취소
              </button>
              <button onClick={doSave} disabled={saving} className="px-5 py-2 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer" style={{ backgroundColor: '#014A99' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 상태 + 금액 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 상태 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">상태</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  quote.status === s ? STATUS_STYLE[s] + ' ring-1 ring-current' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 공급가액 */}
        <div className="bg-blue-50/60 rounded-lg border border-blue-100 p-4">
          <p className="text-xs text-gray-500 mb-1">공급가액</p>
          <p className="text-xl font-bold text-blue-700 tabular-nums">{fmt(quote.sale_amount)}원</p>
        </div>

        {/* 매출(VAT) */}
        <div className="bg-blue-50/60 rounded-lg border border-blue-100 p-4">
          <p className="text-xs text-gray-500 mb-1">매출 (VAT 포함)</p>
          <p className="text-xl font-bold text-blue-700 tabular-nums">{fmt(saleVat)}원</p>
        </div>
      </div>

      {/* 견적 정보 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">견적 정보</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {editing ? (
            <>
              <InfoFieldEdit label="발주의뢰처">
                <select
                  value={vendorMode === 'new' ? '__new__' : (editData.customer_name ?? '')}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '__new__') { setVendorMode('new'); setEditData(p => ({ ...p, customer_name: '' })) }
                    else { setVendorMode('existing'); setEditData(p => ({ ...p, customer_name: val })) }
                  }}
                  className={INPUT_CLS + ' cursor-pointer'}
                >
                  <option value="">-- 거래처 선택 --</option>
                  {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="__new__">직접입력 (신규 업체)</option>
                </select>
                {vendorMode === 'new' && (
                  <input
                    value={editData.customer_name ?? ''}
                    onChange={e => setEditData(p => ({ ...p, customer_name: e.target.value }))}
                    placeholder="신규 업체명 입력"
                    className={INPUT_CLS + ' mt-2'}
                  />
                )}
              </InfoFieldEdit>
              <InfoFieldEdit label="현장명">
                <input value={editData.project ?? ''} onChange={e => setEditData(p => ({ ...p, project: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="견적일">
                <input type="date" value={editData.order_date ?? ''} onChange={e => setEditData(p => ({ ...p, order_date: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="납품희망일">
                <input type="date" value={editData.delivery_date ?? ''} onChange={e => setEditData(p => ({ ...p, delivery_date: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="작성자">
                <select value={editData.author ?? ''} onChange={e => setEditData(p => ({ ...p, author: e.target.value }))} className={INPUT_CLS}>
                  <option value="">-- 선택 --</option>
                  {['이주헌', '이주선', '이주송', '이민수'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </InfoFieldEdit>
              <InfoFieldEdit label="납품처">
                <input value={editData.delivery_dest ?? ''} onChange={e => setEditData(p => ({ ...p, delivery_dest: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="인수자">
                <input value={editData.contact_name ?? ''} onChange={e => setEditData(p => ({ ...p, contact_name: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="인수자 연락처">
                <input value={editData.contact_phone ?? ''} onChange={e => setEditData(p => ({ ...p, contact_phone: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="납품장소">
                <input value={editData.delivery_location ?? ''} onChange={e => setEditData(p => ({ ...p, delivery_location: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="주소">
                <input value={editData.address ?? ''} onChange={e => setEditData(p => ({ ...p, address: e.target.value }))} className={INPUT_CLS} />
              </InfoFieldEdit>
              <InfoFieldEdit label="비고" className="col-span-2">
                <textarea value={editData.notes ?? ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))} rows={3} className={INPUT_CLS + ' resize-y'} />
              </InfoFieldEdit>
            </>
          ) : (
            <>
              <InfoField label="발주의뢰처" value={quote.customer_name} />
              <InfoField label="현장명" value={quote.project} />
              <InfoField label="견적일" value={quote.order_date} />
              <InfoField label="납품희망일" value={quote.delivery_date} />
              <InfoField label="작성자" value={quote.author} />
              <InfoField label="납품처" value={quote.delivery_dest} />
              <InfoField label="인수자" value={quote.contact_name} />
              <InfoField label="인수자 연락처" value={quote.contact_phone} />
              <InfoField label="납품장소" value={quote.delivery_location} />
              <InfoField label="주소" value={quote.address} />
              {quote.notes && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">비고</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{quote.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 첨부파일 */}
      {(() => {
        const effectiveUrls = (quote.file_urls && quote.file_urls.length > 0)
          ? quote.file_urls
          : quote.image_url ? [quote.image_url] : []
        if (effectiveUrls.length === 0) return null
        return (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
              <h2 className="font-semibold text-gray-800 text-sm">첨부파일 <span className="text-gray-400 font-normal text-xs">({effectiveUrls.length}개)</span></h2>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-3">
                {effectiveUrls.map((url, i) => {
                  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf')
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                      {isPdf ? (
                        <div className="w-24 h-24 rounded-lg border border-gray-200 bg-red-50 flex flex-col items-center justify-center gap-1 hover:bg-red-100 transition-colors">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs text-red-500 font-medium">PDF</span>
                        </div>
                      ) : (
                        <img src={url} alt={`첨부 ${i + 1}`} className="w-24 h-24 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer" />
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* 품목 목록 */}
      {editing ? (
        <FireBlanketItemsTable
          items={editItems}
          onChange={setEditItems}
          fireBlanketPrices={fireBlanketPrices}
          fireBlanketSalePrices={fireBlanketSalePrices}
          customers={customers}
          customerName={quote.customer_name ?? ''}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
            <h2 className="font-semibold text-gray-800 text-sm">품목 목록</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left">제조사</th>
                  <th className="px-4 py-2.5 text-left">품명</th>
                  <th className="px-4 py-2.5 text-left">규격</th>
                  <th className="px-4 py-2.5 text-right">수량 (롤)</th>
                  <th className="px-4 py-2.5 text-right">단가</th>
                  <th className="px-4 py-2.5 text-right">금액</th>
                  <th className="px-4 py-2.5 text-left">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(quote.items) ? quote.items : []).map((it: any, i: number) => {
                  const amt = Math.round((it.unit_price || 0) * (it.quantity || 0))
                  return (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-500">{it.manufacturer || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{it.name || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{it.spec || '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{it.quantity}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{it.unit_price > 0 ? fmt(it.unit_price) : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-700">{amt > 0 ? fmt(amt) : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-400">{it.note || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              {quote.sale_amount > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr className="text-xs font-semibold text-gray-700">
                    <td colSpan={5} className="px-4 py-3 text-right">공급가액 합계</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmt(quote.sale_amount)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 상태 이력 */}
      {Array.isArray(quote.status_history) && quote.status_history.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full flex-shrink-0 bg-gray-300" />
            <h2 className="font-semibold text-gray-800 text-sm">상태 이력</h2>
          </div>
          <div className="p-5">
            <ol className="space-y-2">
              {[...quote.status_history].reverse().map((h, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                  <span className={`font-medium ${STATUS_STYLE[h.status as QuoteStatus] ?? 'text-gray-600'} px-2 py-0.5 rounded-full text-xs`}>{h.status}</span>
                  <span className="text-gray-400 text-xs">{new Date(h.changed_at).toLocaleString('ko-KR')}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="font-bold text-gray-900 text-lg mb-2">견적서 삭제</h2>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">{quote.customer_name}</span>{quote.project ? ` · ${quote.project}` : ''}
            </p>
            <p className="text-sm text-gray-500 mb-6">이 견적서를 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">취소</button>
              <button onClick={doDelete} className="px-5 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md cursor-pointer">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

function InfoFieldEdit({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  )
}
