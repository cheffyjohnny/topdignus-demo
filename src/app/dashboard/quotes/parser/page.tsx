'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import type { ParsedOrder, OrderItem } from '@/lib/parse-order'
import { buildPriceMap, buildSealantMap, buildPipeSleeveStructure } from '@/lib/price-utils'
import { PipeItemsTable } from '@/components/PipeItemsTable'

interface Customer { id: string; name: string; sale_pct: number; email: string | null }

type Tab = 'parsed' | 'raw'
type OrderType = 'pipe' | 'duct'



interface OrderFormState {
  author: string
  orderClient: string
  orderDate: string
  deliveryDate: string
  project: string
  deliveryLocation: string
  address: string
  contactName: string
  contactPhone: string
  notes: string
  deliveryDest: string
}

const today = () => new Date().toISOString().slice(0, 10)

export default function ParserPage() {
  const [orderType, setOrderType] = useState<OrderType>('pipe')
  const [vendor, setVendor] = useState('')
  const [vendorChosen, setVendorChosen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedOrder | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('parsed')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map())
  const [sealantMap, setSealantMap] = useState<Map<string, number>>(new Map())
  const [ps, setPs] = useState<ReturnType<typeof buildPipeSleeveStructure> | null>(null)
  const [pct, setPct] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<OrderFormState>({
    author: '',
    orderClient: '',
    orderDate: today(),
    deliveryDate: '',
    project: '',
    deliveryLocation: '',
    address: '',
    contactName: '',
    contactPhone: '',
    notes: '',
    deliveryDest: '',
  })
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCustomers(data)
    }).catch(() => {})
    fetch('/api/pipe-prices').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setPriceMap(buildPriceMap(data))
        setSealantMap(buildSealantMap(data))
        setPs(buildPipeSleeveStructure(data))
      }
    }).catch(() => {})
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setRawText(null)
    setParsed(null)
    setItems([])
    setError(null)
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    setFile(f)
    setRawText(null)
    setParsed(null)
    setItems([])
    setError(null)
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  async function handleSubmit() {
    if (!file) return
    setLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/quotes/parse-image', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRawText(data.text)
      setParsed(data.parsed)
      setItems(data.parsed?.items ?? [])
      setImageUrl(data.imageUrl ?? null)
      setTab('parsed')
      // Pre-fill form from OCR header
      const h = data.parsed?.header ?? {}
      setForm(prev => ({
        ...prev,
        orderDate: today(),
        deliveryDate: h.deliveryDate?.slice(0, 10) ?? '',
        project: h.project ?? '',
        deliveryLocation: h.deliveryAddress ?? '',
        address: h.address ?? '',
        contactName: h.representative ?? h.recipient ?? '',
        contactPhone: h.contact ?? '',
        deliveryDest: h.companyName ?? '',
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function openModal() {
    setShowModal(true)
  }

  async function handleCreateOrder() {
    if (!form.author.trim() || !form.orderClient.trim()) return
    setSubmitting(true)
    try {
      const body = {
        vendor,
        orderClient: form.orderClient,
        author: form.author,
        orderDate: form.orderDate,
        deliveryDate: form.deliveryDate,
        project: form.project,
        deliveryLocation: form.deliveryLocation,
        address: form.address,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        notes: form.notes,
        deliveryDest: form.deliveryDest,
        items,
        imageUrl: imageUrl ?? undefined,
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('수주서가 저장되었습니다.')
      if (data.ecount === 'ok') {
        toast.success('ECOUNT 주문서 등록 완료', { autoClose: 3000 })
      } else if (data.ecount === 'skipped') {
        toast.info('ECOUNT 품목코드가 없어 주문서 등록을 건너뛰었습니다.')
      } else {
        toast.error(`ECOUNT 주문서 등록 실패 (수주서는 저장됨)${data.ecountError ? `\n${data.ecountError}` : ''}`, { autoClose: false })
      }
      setShowModal(false)
      router.push(`/dashboard/orders/${data.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const hasResult = rawText !== null

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">수주서 파싱</h1>
        <p className="text-sm text-gray-500 mt-1">발주서 이미지를 업로드하면 OCR로 품목을 자동 추출합니다. 결과 확인 후 수정하여 사용하세요.</p>
      </div>

      {/* Step 1: 품목 유형 선택 */}
      <div className="flex items-center gap-6">
        <p className="text-sm font-medium text-gray-700 shrink-0">품목 유형</p>
        <div className="flex gap-5">
          {([
            { value: 'pipe', label: '배관', disabled: false },
            { value: 'duct', label: '사각덕트', disabled: true },
          ] as const).map(({ value, label, disabled }) => (
            <label
              key={value}
              className={`flex items-center gap-2 text-sm cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="orderType"
                value={value}
                checked={orderType === value}
                disabled={disabled}
                onChange={() => { setOrderType(value); setVendor(''); setVendorChosen(false) }}
                className="accent-[#014A99]"
              />
              {label}
              {disabled && <span className="text-xs text-gray-400">(준비 중)</span>}
            </label>
          ))}
        </div>
      </div>

      {/* Step 2: 업체 선택 */}
      {orderType === 'pipe' && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">업체 선택</label>
          <select
            value={vendor}
            onChange={e => {
              const name = e.target.value
              setVendor(name)
              setVendorChosen(true)
              const customer = customers.find(c => c.name === name)
              setPct(customer?.sale_pct ?? null)
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99] bg-white"
          >
            <option value="" disabled>-- 업체를 선택하세요 --</option>
            {customers.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          {vendorChosen && vendor && (
            <span className="text-xs text-green-600 font-medium">
              매핑 적용됨
              {pct != null && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">협가 × {pct}%</span>}
            </span>
          )}
          {vendorChosen && !vendor && <span className="text-xs text-gray-400">품목명 자동 매핑 없음</span>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 3: 업로드 영역 (업체 선택 후 표시) */}
        <div className="space-y-4">
          {!vendorChosen ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-300">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">업체 선택 후 업로드할 수 있습니다</p>
            </div>
          ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div className="space-y-2">
                {preview && <img src={preview} alt="preview" className="max-h-56 mx-auto rounded-lg object-contain" />}
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB — 클릭하여 변경</p>
              </div>
            ) : (
              <div className="space-y-2 text-gray-400">
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">이미지 또는 PDF 드래그 또는 클릭</p>
                <p className="text-xs">JPG · PNG · PDF 지원</p>
              </div>
            )}
          </div>
          )}

          {vendorChosen && (
            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#014A99' }}
            >
              {loading ? 'OCR 처리 중...' : 'OCR 파싱 시작'}
            </button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* 발주서 정보 — 편집 가능 */}
        {parsed && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5 text-sm">
            <p className="font-semibold text-gray-700 mb-3">발주서 정보</p>
            {parsed.header.serialNo && (
              <div className="flex gap-2 items-center">
                <span className="text-gray-400 w-20 shrink-0 text-xs">일련번호</span>
                <span className="text-gray-600 text-xs">{parsed.header.serialNo}</span>
              </div>
            )}
            {parsed.header.businessNo && (
              <div className="flex gap-2 items-center">
                <span className="text-gray-400 w-20 shrink-0 text-xs">사업자번호</span>
                <span className="text-gray-600 text-xs">{parsed.header.businessNo}</span>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <span className="text-gray-400 w-20 shrink-0 text-xs">작성자 <span className="text-red-500">*</span></span>
              <select
                value={form.author}
                onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                className="flex-1 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#014A99] text-gray-800 cursor-pointer"
              >
                <option value="">-- 선택 --</option>
                {['이주헌', '이주선', '이주송', '이민수'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-gray-400 w-20 shrink-0 text-xs">발주의뢰처</span>
              <input
                type="text"
                placeholder="의뢰 회사명"
                value={form.orderClient}
                onChange={e => setForm(p => ({ ...p, orderClient: e.target.value }))}
                className="flex-1 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#014A99] text-gray-800"
              />
            </div>
            {[
              { label: '수주일', key: 'orderDate' as const, type: 'date' },
              { label: '납품처', key: 'deliveryDest' as const },
              { label: '인수자', key: 'contactName' as const },
              { label: '연락처', key: 'contactPhone' as const },
              { label: '납기일자', key: 'deliveryDate' as const, type: 'date' },
              { label: '현장명', key: 'project' as const },
              { label: '납품장소', key: 'deliveryLocation' as const },
              { label: '주소', key: 'address' as const },
              { label: '비고', key: 'notes' as const },
            ].map(({ label, key, type }) => (
              <div key={key} className="flex gap-2 items-center">
                <span className="text-gray-400 w-20 shrink-0 text-xs">{label}</span>
                <input
                  type={type ?? 'text'}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="flex-1 bg-white border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-[#014A99] text-gray-800"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 결과 탭 */}
      {hasResult && (
        <div className="space-y-3">
          <div className="flex gap-1 border-b border-gray-200">
            {(['parsed', 'raw'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-[#014A99] text-[#014A99]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {t === 'parsed' ? `품목 목록 (${items.length}건)` : 'OCR 원문'}
              </button>
            ))}
          </div>

          {tab === 'parsed' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>OCR 자동 추출 결과입니다. 품목명·규격·수량을 원본 발주서와 반드시 대조 후 사용하세요.</span>
              </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <PipeItemsTable
                items={items}
                onChange={setItems}
                ps={ps}
                priceMap={priceMap}
                sealantMap={sealantMap}
                pct={pct}
                autoParseSpec
                rightAction={
                  items.length > 0 ? (
                    <button
                      onClick={openModal}
                      className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: '#014A99' }}
                    >
                      수주서 작성하기
                    </button>
                  ) : undefined
                }
                showHeatCalc
              />
            </div>
            </div>
          )}

          {tab === 'raw' && (
            <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed overflow-auto max-h-[500px]">
              {rawText}
            </pre>
          )}
        </div>
      )}

      {/* 최종 확인 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">작성 전 최종 확인</h2>
                <p className="text-xs text-gray-400 mt-0.5">내용을 확인하고 이상이 없으면 작성하기를 눌러주세요.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 max-h-[65vh] overflow-y-auto">
              {(!form.author.trim() || !form.orderClient.trim()) && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700 mb-4">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {!form.author.trim() ? '발주서 정보에서 작성자를 입력해주세요.' : '발주서 정보에서 발주의뢰처를 입력해주세요.'}
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {[
                  { label: '작성자', value: form.author, required: true },
                  { label: '발주의뢰처', value: form.orderClient, required: true },
                  { label: '수주일', value: form.orderDate },
                  { label: '납품희망일', value: form.deliveryDate },
                  { label: '납품처', value: form.deliveryDest },
                  { label: '현장명', value: form.project },
                  { label: '납품장소', value: form.deliveryLocation },
                  { label: '주소', value: form.address },
                  { label: '인수자', value: form.contactName },
                  { label: '연락처', value: form.contactPhone },
                  { label: '비고', value: form.notes },
                ].map(({ label, value, required = false }) => (
                  <div key={label} className="flex gap-3 py-2.5">
                    <span className="text-gray-400 text-xs w-20 shrink-0 mt-0.5">
                      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    <span className={`text-xs flex-1 leading-relaxed ${!value && required ? 'text-red-400 font-medium' : value ? 'text-gray-800' : 'text-gray-300'}`}>
                      {value || (required ? '미입력' : '—')}
                    </span>
                  </div>
                ))}
                <div className="flex gap-3 py-2.5">
                  <span className="text-gray-400 text-xs w-20 shrink-0">품목</span>
                  <span className="text-xs text-gray-800 font-medium">{items.length}건</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!form.author.trim() || !form.orderClient.trim() || submitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: '#014A99' }}
              >
                {submitting ? '작성 중...' : '작성하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

