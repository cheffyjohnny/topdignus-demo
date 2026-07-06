'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MultiFileUploader from '@/components/MultiFileUploader'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import type { OrderItem } from '@/lib/parse-order'
import { buildPriceMap, buildSealantMap, buildPipeSleeveStructure, buildManufacturerMaps, buildIlwidaegaMapByMfr, lookupSalePrice, type PriceRowMin } from '@/lib/price-utils'
import { PipeItemsTable } from '@/components/PipeItemsTable'
import { DuctItemsTable } from '@/components/DuctItemsTable'
import type { DuctItem } from '@/components/DuctItemsTable'

export type QuoteType = 'pipe' | 'duct' | 'combined'

interface Customer { id: string; name: string; sale_pct: number }
interface DuctPrice { manufacturer: string; price_type: 'per_m' | 'per_item'; riser_price: number; wall_price: number; insul_50t_price?: number; insul_25t_price?: number }
interface DuctSalePrice { manufacturer: string; customer_id: string; riser_sale_price: number; wall_sale_price: number; insul_50t_sale_price?: number; insul_25t_sale_price?: number }

const INPUT_CLS = 'border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] transition-colors w-full'
const today = () => new Date().toISOString().slice(0, 10)

function colLabel(idx: number): string {
  let result = '', n = idx + 1
  while (n > 0) { n--; result = String.fromCharCode(65 + (n % 26)) + result; n = Math.floor(n / 26) }
  return result
}

export default function QuoteFormPage({ type }: { type: QuoteType }) {
  const router = useRouter()
  const draftKey = `draft_${type}_quote`

  // ── 공통 상태 ──
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vendor, setVendor] = useState('')
  const [pct, setPct] = useState<number | null>(null)
  const [vendorMode, setVendorMode] = useState<'existing' | 'new'>('existing')
  const [project, setProject] = useState('')
  const [orderDate, setOrderDate] = useState(today())
  const [agreeDate, setAgreeDate] = useState('')
  const [author, setAuthor] = useState('')
  const [notes, setNotes] = useState('')
  const [attachFiles, setAttachFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [hasDraft, setHasDraft] = useState(false)

  // ── 배관 전용 ──
  const [manufacturer, setManufacturer] = useState('필립산업')
  const [allPrices, setAllPrices] = useState<PriceRowMin[]>([])
  const [sealantMap, setSealantMap] = useState<Map<string, number>>(new Map())
  const { psByMfr, priceMapByMfr, manufacturers: pipeManufacturers } = useMemo(
    () => buildManufacturerMaps(allPrices),
    [allPrices]
  )
  const priceMap = useMemo(() => buildPriceMap(allPrices), [allPrices])
  const ps = useMemo(() => buildPipeSleeveStructure(allPrices), [allPrices])
  const ilwiRawMapByMfr = useMemo(() => buildIlwidaegaMapByMfr(allPrices), [allPrices])
  const [pipeItems, setPipeItems] = useState<OrderItem[]>([{ no: 1, name: '', spec: '', unit: 'ea', quantity: 1 }])
  // 엑셀 가져오기
  const [showExcel, setShowExcel] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelSheets, setExcelSheets] = useState<string[]>([])
  const [excelSelectedSheet, setExcelSelectedSheet] = useState('')
  const [excelRows, setExcelRows] = useState<string[][]>([])
  const [excelHeaderRowIdx, setExcelHeaderRowIdx] = useState(0)
  const [excelNameCol, setExcelNameCol] = useState<number | null>(null)
  const [excelSpecCol, setExcelSpecCol] = useState<number | null>(null)
  const [excelQtyCol, setExcelQtyCol] = useState<number | null>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)

  // ── 덕트 전용 ──
  const [ductPrices, setDuctPrices] = useState<DuctPrice[]>([])
  const [ductSalePrices, setDuctSalePrices] = useState<DuctSalePrice[]>([])
  const [ductItems, setDuctItems] = useState<DuctItem[]>([{ id: 1, type: '입상', width: 0, height: 0, quantity: 1, unit_price: 0 }])
  const [insul50Qty, setInsul50Qty] = useState(0)
  const [insul25Qty, setInsul25Qty] = useState(0)

  // ── combined 전용 ──
  const [activeTab, setActiveTab] = useState<'배관' | '덕트'>('배관')

  const pipeSaleTotal = useMemo(() => pipeItems.reduce((sum, it) => {
    const mfrMap = it.manufacturer ? (priceMapByMfr.get(it.manufacturer) ?? priceMap) : priceMap
    const up = it.unitPrice ?? (pct !== null && it.internalName
      ? lookupSalePrice(mfrMap, pct, it.internalName, it.pipeSpec, it.sleeveSpec)
      : undefined)
    return up != null ? sum + up * (it.quantity ?? 1) : sum
  }, 0), [pipeItems, priceMap, priceMapByMfr, pct])

  // ── 데이터 로드 ──
  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => { if (Array.isArray(d)) setCustomers(d) }).catch(() => {})
    if (type === 'pipe' || type === 'combined') {
      fetch('/api/pipe-prices').then(r => r.json()).then(d => {
        if (Array.isArray(d)) { setAllPrices(d); setSealantMap(buildSealantMap(d)) }
      }).catch(() => {})
    }
    if (type === 'duct' || type === 'combined') {
      fetch('/api/duct-prices').then(r => r.json()).then(d => { if (Array.isArray(d)) setDuctPrices(d) }).catch(() => {})
      fetch('/api/duct-sale-prices').then(r => r.json()).then(d => { if (Array.isArray(d)) setDuctSalePrices(d) }).catch(() => {})
    }
    if (localStorage.getItem(`draft_${type}_quote`)) setHasDraft(true)
  }, [type])

  // ── 엑셀 파싱 (배관) ──
  const fetchExcel = useCallback(async (file: File, sheet?: string) => {
    setExcelLoading(true)
    const fd = new FormData(); fd.append('file', file)
    if (sheet) fd.append('sheet', sheet)
    try {
      const res = await fetch('/api/quotes/parse-excel', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '파싱 오류'); return }
      setExcelSheets(data.sheets ?? []); setExcelSelectedSheet(data.selectedSheet ?? '')
      setExcelRows(data.rows ?? []); setExcelHeaderRowIdx(data.detected?.headerRowIdx ?? 0)
      setExcelNameCol(data.detected?.nameCol ?? null); setExcelSpecCol(data.detected?.specCol ?? null)
      setExcelQtyCol(data.detected?.qtyCol ?? null)
    } finally { setExcelLoading(false) }
  }, [])

  function handleExcelImport() {
    if (excelNameCol === null || excelRows.length === 0) return
    const dataRows = excelRows.slice(excelHeaderRowIdx + 1)
    const filtered = dataRows.filter(row =>
      (row[excelNameCol] ?? '').includes('내화') ||
      (excelSpecCol !== null && (row[excelSpecCol] ?? '').includes('내화'))
    )
    if (filtered.length === 0) { alert("'내화' 포함 품목을 찾지 못했습니다."); return }
    const base = pipeItems.filter(it => it.name.trim() || it.internalName?.trim())
    const newItems: OrderItem[] = filtered.map((row, i) => ({
      no: base.length + i + 1, name: row[excelNameCol] ?? '',
      spec: excelSpecCol !== null ? (row[excelSpecCol] ?? '') : '',
      unit: 'ea', quantity: excelQtyCol !== null ? (Math.round(parseFloat(row[excelQtyCol]) || 1)) : 1,
    }))
    setPipeItems([...base, ...newItems]); setShowExcel(false); setExcelFile(null); setExcelRows([])
  }

  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        vendor, vendorMode, pct, project, orderDate, agreeDate, author, notes,
        pipeItems, ductItems, insul50Qty, insul25Qty, manufacturer, activeTab,
      }))
      toast.success('임시저장되었습니다.')
    } catch {}
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.vendor) setVendor(d.vendor)
      if (d.vendorMode) setVendorMode(d.vendorMode)
      if (d.pct != null) setPct(d.pct)
      if (d.project) setProject(d.project)
      if (d.orderDate) setOrderDate(d.orderDate)
      if (d.agreeDate) setAgreeDate(d.agreeDate)
      if (d.author) setAuthor(d.author)
      if (d.notes) setNotes(d.notes)
      if (d.pipeItems) setPipeItems(d.pipeItems)
      if (d.ductItems) setDuctItems(d.ductItems)
      if (d.insul50Qty != null) setInsul50Qty(d.insul50Qty)
      if (d.insul25Qty != null) setInsul25Qty(d.insul25Qty)
      if (d.manufacturer) setManufacturer(d.manufacturer)
      if (d.activeTab) setActiveTab(d.activeTab)
      setHasDraft(false)
      localStorage.removeItem(draftKey)
      toast.success('임시저장 내용을 불러왔습니다.')
    } catch {}
  }

  function clearDraft() {
    localStorage.removeItem(draftKey)
    setHasDraft(false)
  }

  // ── 저장 ──
  async function handleSave() {
    if (!vendor.trim()) { setError('발주의뢰처를 선택해 주세요.'); return }
    if (!author.trim()) { setError('작성자를 입력해 주세요.'); return }
    if (vendorMode === 'new' && (pct == null || pct <= 0 || pct > 100)) {
      setError('판매가 비율(1~100)을 입력해 주세요.'); return
    }
    if (type === 'pipe' && !pipeItems.some(it => it.name.trim() || it.internalName?.trim())) {
      setError('배관 품목을 1개 이상 입력해 주세요.'); return
    }
    if (type === 'combined' && !pipeItems.some(it => it.name.trim() || it.internalName?.trim()) && ductItems.length === 0) {
      setError('배관 또는 덕트 품목을 입력해 주세요.'); return
    }
    if ((type === 'pipe' || type === 'combined') && pipeItems.some(it => (it.name?.trim() || it.internalName?.trim()) && it.internalName !== '수기 금액 추가' && !it.spec?.trim())) {
      setError('배관 품목의 규격을 모두 입력해 주세요.'); return
    }
    if ((type === 'duct' || type === 'combined') && ductItems.some(it => it.type !== '수기 금액 추가' && (it.width <= 0 || it.height <= 0))) {
      setError('덕트 품목의 가로/세로 치수를 입력해 주세요.'); return
    }
    setError(''); setSaving(true)
    try {
      if (vendorMode === 'new') {
        const filledDuctItems = ductItems.filter(it => it.width > 0 && it.height > 0 && it.manufacturer)
        const ductMfrs = [...new Set(filledDuctItems.map(it => it.manufacturer!))]
          .filter(mfr => ductPrices.find(d => d.manufacturer === mfr)?.price_type === 'per_m')
        const ductSalePricesPayload = ductMfrs.map(mfr => ({
          manufacturer: mfr,
          riser_sale_price: filledDuctItems.find(it => it.manufacturer === mfr && it.type === '입상')?.unit_price ?? 0,
          wall_sale_price: filledDuctItems.find(it => it.manufacturer === mfr && it.type === '벽체')?.unit_price ?? 0,
        }))

        const regRes = await fetch('/api/customers/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: vendor.trim(), sale_pct: pct, ductSalePrices: ductSalePricesPayload }),
        })
        const regData = await regRes.json()
        if (!regRes.ok) { setError(regData.error ?? '거래처 등록 오류'); return }
        toast.success(`신규 거래처 '${vendor.trim()}'가 등록되었습니다.`)
        if (ductSalePricesPayload.length > 0) toast.success('덕트 단가도 함께 등록되었습니다.')
        if (regData.ecount === 'ok') toast.success('[ECOUNT] 거래처 등록 완료')
        else if (regData.ecount === 'fail') toast.warning('ECOUNT 거래처 등록에 실패했습니다.')
      }

      const fileUrls: string[] = []
      for (const f of attachFiles) {
        const fd = new FormData(); fd.append('file', f)
        const res = await fetch('/api/orders/image', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? '파일 업로드 실패'); setSaving(false); return }
        fileUrls.push(data.imageUrl)
      }

      let payload: any
      let endpoint: string

      if (type === 'pipe') {
        const filledItems = pipeItems.filter(it => it.name.trim() || it.internalName?.trim())
        const derivedMfr = [...new Set(filledItems.map(it => (it as any).manufacturer).filter(Boolean))].join(',') || manufacturer
        payload = {
          vendor, manufacturer: derivedMfr, project,
          orderDate: orderDate || today(), agreeDate,
          author, notes,
          items: filledItems.map((it, i) => ({
            no: i + 1, name: it.name, spec: it.spec, unit: it.unit, quantity: it.quantity,
            internalName: it.internalName || undefined, displayName: it.displayName || undefined,
            pipeSpec: it.pipeSpec || undefined, sleeveSpec: it.sleeveSpec || undefined,
            unitPrice: it.unitPrice, note: it.note || undefined, manufacturer: (it as any).manufacturer || undefined,
          })),
          fileUrls,
        }
        endpoint = '/api/pipe-quotes'
      } else {
        const profireMfr = ductItems.find(it => (it.manufacturer ?? '').startsWith('프로화이어'))?.manufacturer ?? ''
        const isProfire = !!profireMfr
        const primaryMfr = ductItems[0]?.manufacturer ?? ductPrices[0]?.manufacturer ?? ''
        const dp = ductPrices.find(d => d.manufacturer === profireMfr)
        const cid = customers.find(c => c.name === vendor)?.id
        const sp = cid ? ductSalePrices.find(d => d.manufacturer === profireMfr && d.customer_id === cid) : null
        const p50 = (sp?.insul_50t_sale_price ?? 0) > 0 ? sp!.insul_50t_sale_price! : (dp?.insul_50t_price ?? 0)
        const p25 = (sp?.insul_25t_sale_price ?? 0) > 0 ? sp!.insul_25t_sale_price! : (dp?.insul_25t_price ?? 0)
        payload = {
          manufacturer: primaryMfr, customerName: vendor, project,
          orderDate: orderDate || today(), agreeDate,
          author, notes, fileUrls,
          items: [
            ...ductItems.map(it => {
              const peri = (it.width + it.height) * 2 / 1000
              return { type: it.type, manufacturer: it.manufacturer || null, width: it.width, height: it.height,
                perimeter: Math.round(peri * 1000) / 1000, quantity: it.quantity, unit_price: it.unit_price,
                amount: it.unit_price * peri * it.quantity, note: it.note || null }
            }),
            ...(isProfire ? [
              ...(insul50Qty > 0 ? [{ type: '차열재', spec: '50T×400×3.6M', quantity: insul50Qty, unit_price: p50, amount: insul50Qty * p50 }] : []),
              ...(insul25Qty > 0 ? [{ type: '차열재', spec: '25T×400×7.2M', quantity: insul25Qty, unit_price: p25, amount: insul25Qty * p25 }] : []),
            ] : []),
          ],
        }
        endpoint = '/api/duct-quotes'
      }

      if (type === 'combined') {
        // 1. quote_group 먼저 생성
        const groupRes = await fetch('/api/quote-groups', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor, project, orderDate: orderDate || today(), author, notes }),
        })
        if (!groupRes.ok) { setError('그룹 생성 오류'); setSaving(false); return }
        const { id: groupId } = await groupRes.json()

        // 2. 배관 + 덕트 견적서 각각 저장 (group_id 포함)
        const commonInfo = { vendor, project, orderDate: orderDate || today(), agreeDate, author, notes, fileUrls, groupId }
        const filledPipe = pipeItems.filter(it => it.name.trim() || it.internalName?.trim())
        const pipeMfrDerived = [...new Set(filledPipe.map(it => (it as any).manufacturer).filter(Boolean))].join(',') || manufacturer

        if (filledPipe.length > 0) {
          const pipeRes = await fetch('/api/pipe-quotes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...commonInfo, manufacturer: pipeMfrDerived,
              items: filledPipe.map((it, i) => ({ no: i+1, name: it.name, spec: it.spec, unit: it.unit, quantity: it.quantity, internalName: it.internalName || undefined, pipeSpec: it.pipeSpec || undefined, sleeveSpec: it.sleeveSpec || undefined, unitPrice: it.unitPrice, note: it.note || undefined, manufacturer: (it as any).manufacturer || undefined })),
            }),
          })
          if (pipeRes.ok) {
            const pd = await pipeRes.json()
            if (pd.ecount === 'ok') toast.success('[ECOUNT] 배관 견적서 등록 완료')
            else if (pd.ecount === 'skipped') toast.info('ECOUNT 품목코드가 없어 배관 견적서 등록을 건너뛰었습니다.')
            else if (pd.ecount === 'fail') toast.error(`ECOUNT 배관 견적서 등록 실패${pd.ecountError ? `\n${pd.ecountError}` : ''}`, { autoClose: false })
          }
        }

        if (ductItems.length > 0) {
          const profireMfr = ductItems.find(it => (it.manufacturer ?? '').startsWith('프로화이어'))?.manufacturer ?? ''
          const isProfire = !!profireMfr
          const ductPrimaryMfr = ductItems[0]?.manufacturer ?? ductPrices[0]?.manufacturer ?? ''
          const dp = ductPrices.find(d => d.manufacturer === profireMfr)
          const cid = customers.find(c => c.name === vendor)?.id
          const sp = cid ? ductSalePrices.find(d => d.manufacturer === profireMfr && d.customer_id === cid) : null
          const p50 = (sp?.insul_50t_sale_price ?? 0) > 0 ? sp!.insul_50t_sale_price! : (dp?.insul_50t_price ?? 0)
          const p25 = (sp?.insul_25t_sale_price ?? 0) > 0 ? sp!.insul_25t_sale_price! : (dp?.insul_25t_price ?? 0)
          const ductRes = await fetch('/api/duct-quotes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...commonInfo, manufacturer: ductPrimaryMfr, customerName: vendor,
              items: [
                ...ductItems.map(it => {
                  if (it.type === '수기 금액 추가') return { type: it.type, manufacturer: null, width: 0, height: 0, perimeter: 0, quantity: it.quantity, unit_price: it.unit_price, amount: it.unit_price * it.quantity, note: it.note||null }
                  const peri = (it.width+it.height)*2/1000; return { type: it.type, manufacturer: it.manufacturer||null, width: it.width, height: it.height, perimeter: Math.round(peri*1000)/1000, quantity: it.quantity, unit_price: it.unit_price, amount: it.unit_price*peri*it.quantity, note: it.note||null }
                }),
                ...(isProfire ? [
                  ...(insul50Qty > 0 ? [{ type:'차열재', spec:'50T×400×3.6M', quantity:insul50Qty, unit_price:p50, amount:insul50Qty*p50 }] : []),
                  ...(insul25Qty > 0 ? [{ type:'차열재', spec:'25T×400×7.2M', quantity:insul25Qty, unit_price:p25, amount:insul25Qty*p25 }] : []),
                ] : []),
              ],
            }),
          })
          if (ductRes.ok) {
            const dd = await ductRes.json()
            if (dd.ecount === 'ok') toast.success('[ECOUNT] 덕트 견적서 등록 완료')
            else if (dd.ecount === 'skipped') toast.info('ECOUNT 품목코드가 없어 덕트 견적서 등록을 건너뛰었습니다.')
            else if (dd.ecount === 'fail') toast.error(`ECOUNT 덕트 견적서 등록 실패${dd.ecountError ? `\n${dd.ecountError}` : ''}`, { autoClose: false })
          }
        }

        toast.success('복합 견적서가 저장되었습니다.')
        localStorage.removeItem(draftKey)
        router.push(`/dashboard/quotes/groups/${groupId}`)
        return
      }

      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '저장 오류'); return }
      const msg = type === 'pipe' ? '배관 견적서가 저장되었습니다.' : '덕트 견적서가 저장되었습니다.'
      sessionStorage.setItem('quote_toast', JSON.stringify({ msg, ecount: data.ecount, ecountError: data.ecountError ?? null }))
      const detailPath = type === 'pipe' ? `/dashboard/pipe-quotes/${data.id}` : `/dashboard/duct-quotes/${data.id}`
      localStorage.removeItem(draftKey)
      router.push(detailPath)
    } finally { setSaving(false) }
  }

  const colOptions = excelRows[excelHeaderRowIdx]?.map((val, idx) => ({ idx, label: `${colLabel(idx)}열${val ? ` (${val.slice(0, 12)})` : ''}` })) ?? []
  const previewRows = excelRows.slice(0, excelHeaderRowIdx + 1 + 20)
  const filteredCount = excelNameCol !== null
    ? excelRows.slice(excelHeaderRowIdx + 1).filter(r => (r[excelNameCol!] ?? '').includes('내화') || (excelSpecCol !== null && (r[excelSpecCol] ?? '').includes('내화'))).length
    : 0

  return (
    <div className="w-full space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/quotes/new')} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {type === 'pipe' ? '배관' : type === 'duct' ? '사각덕트' : '배관 + 사각덕트'} 견적서 작성
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveDraft} className="px-4 py-2.5 rounded-md text-sm font-medium text-amber-600 border border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer">임시저장</button>
          <button onClick={() => router.back()} className="px-4 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">취소</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer" style={{ backgroundColor: '#014A99' }}>
            {saving ? '저장 중...' : '저장'}
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

      {/* 견적 정보 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">견적 정보</h2>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="발주의뢰처" required>
            <select
              value={vendorMode === 'new' ? '__new__' : vendor}
              onChange={e => {
                const val = e.target.value
                if (val === '__new__') {
                  setVendorMode('new'); setVendor(''); setPct(55)
                } else {
                  setVendorMode('existing'); setVendor(val)
                  const c = customers.find(x => x.name === val)
                  setPct(c?.sale_pct ?? null)
                }
              }}
              className={INPUT_CLS + ' cursor-pointer'}
            >
              <option value="">-- 거래처 선택 --</option>
              {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__new__">직접입력 (신규 업체)</option>
            </select>
            {vendorMode === 'new' && (
              <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="신규 업체명 입력" className={INPUT_CLS + ' mt-2'} />
            )}
            {customers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                등록된 거래처가 없습니다.{' '}
                <a href="/dashboard/customers" className="underline hover:text-amber-800">거래처 등록</a>
                {' '}후 다시 시도해 주세요.
              </p>
            )}
          </Field>
          <Field label="제조사">
            <input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="필립산업" className={INPUT_CLS} />
          </Field>
          {(pct != null || vendorMode === 'new') && (
            <Field label="판매가 비율">
              {vendorMode === 'new' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">협가 ×</span>
                  <input type="number" min={1} max={100} value={pct ?? ''} onChange={e => setPct(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS + ' w-24'} />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              ) : (
                <div className={INPUT_CLS + ' bg-gray-50 text-gray-500 cursor-default'}>협가 × {pct}%</div>
              )}
            </Field>
          )}
          <Field label="현장명">
            <input value={project} onChange={e => setProject(e.target.value)} placeholder="예) 강남구 논현동 공동주택" className={INPUT_CLS} />
          </Field>
          <Field label="작성일">
            <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="유효기간">
            <input type="date" value={agreeDate} onChange={e => setAgreeDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="작성자" required>
            <select value={author} onChange={e => setAuthor(e.target.value)} className={INPUT_CLS}>
              <option value="">-- 선택 --</option>
              {['이주헌', '이주선', '이주송', '이민수'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="비고" className="col-span-2">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="비고" className={INPUT_CLS + ' resize-y'} />
          </Field>
        </div>
      </div>

      {/* 파일 첨부 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
          <h2 className="font-semibold text-gray-800 text-sm">파일 첨부 <span className="text-gray-400 font-normal">(선택)</span></h2>
        </div>
        <div className="p-5">
          <MultiFileUploader files={attachFiles} onChange={setAttachFiles} />
        </div>
      </div>

      {/* 품목 목록 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
            <h2 className="font-semibold text-gray-800 text-sm">품목 목록</h2>
          </div>
          {(type === 'pipe' || (type === 'combined' && activeTab === '배관')) && (
            <div className="flex items-center gap-3">
              <button onClick={() => setShowExcel(true)} className="flex items-center gap-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-md px-2.5 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                엑셀 가져오기
              </button>
            </div>
          )}
        </div>
        {/* combined: 탭 구성 */}
        {type === 'combined' && (
          <div className="flex border-b border-gray-200">
            {(['배관', '덕트'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === tab ? (tab === '배관' ? 'border-[#014A99] text-[#014A99]' : 'border-orange-500 text-orange-600') : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <span className={`text-xs px-2 py-0.5 rounded-full mr-1.5 ${tab === '배관' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>{tab}</span>
                {tab === '배관' ? pipeItems.filter(it => it.name.trim() || it.internalName?.trim()).length : ductItems.length}건
              </button>
            ))}
          </div>
        )}

        {(type === 'pipe' || (type === 'combined' && activeTab === '배관')) && (
          <>
            <PipeItemsTable items={pipeItems} onChange={setPipeItems} ps={ps} priceMap={priceMap} sealantMap={sealantMap} pct={pct}
              showNote showHeatCalc
              showManufacturer manufacturers={pipeManufacturers} defaultManufacturer={pipeManufacturers[0]}
              psByManufacturer={psByMfr} priceMapByManufacturer={priceMapByMfr}
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
        {(type === 'duct' || (type === 'combined' && activeTab === '덕트')) && (
          <DuctItemsTable items={ductItems} onChange={setDuctItems}
            ductPrices={ductPrices} ductSalePrices={ductSalePrices} customers={customers} customerName={vendor}
            newVendor={vendorMode === 'new'}
            insul50Qty={insul50Qty} insul25Qty={insul25Qty}
            onInsulChange={(q50, q25) => { setInsul50Qty(q50); setInsul25Qty(q25) }}
          />
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center justify-end gap-3 pb-8">
        {error && <span className="text-sm text-red-500">{error}</span>}
        <button onClick={() => router.back()} className="px-5 py-2.5 rounded-md text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">취소</button>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-colors cursor-pointer" style={{ backgroundColor: '#014A99' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 엑셀 가져오기 모달 (배관) */}
      {(type === 'pipe' || type === 'combined') && showExcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div><h2 className="text-base font-bold text-gray-900">엑셀에서 품목 가져오기</h2><p className="text-xs text-gray-400 mt-0.5">공내역서 엑셀에서 '내화' 포함 품목만 추출합니다.</p></div>
              <button onClick={() => { setShowExcel(false); setExcelFile(null); setExcelRows([]) }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setExcelFile(f); setExcelRows([]); setExcelSheets([]); fetchExcel(f) } }} />
              {!excelFile ? (
                <div onClick={() => excelInputRef.current?.click()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { setExcelFile(f); fetchExcel(f) } }} onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-[#014A99] hover:bg-blue-50/20 transition-colors">
                  <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm text-gray-500">엑셀 파일 드래그 또는 클릭하여 선택</p>
                  <p className="text-xs text-gray-300 mt-1">.xlsx · .xls · .xlsm</p>
                </div>
              ) : excelLoading ? (
                <div className="text-center py-10 text-sm text-gray-400">파싱 중...</div>
              ) : excelRows.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="font-medium text-gray-700">{excelFile.name}</span>
                    <button onClick={() => { setExcelFile(null); setExcelRows([]) }} className="ml-auto text-xs text-gray-400 hover:text-red-400 cursor-pointer">파일 변경</button>
                  </div>
                  {excelSheets.length > 1 && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 shrink-0">시트 선택</span>
                      <select value={excelSelectedSheet} onChange={e => { setExcelSelectedSheet(e.target.value); if (excelFile) fetchExcel(excelFile, e.target.value) }} className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white cursor-pointer">
                        {excelSheets.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-600">컬럼 매핑</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ label:'품명', value:excelNameCol, setter:setExcelNameCol, required:true }, { label:'규격', value:excelSpecCol, setter:setExcelSpecCol, required:false }, { label:'수량', value:excelQtyCol, setter:setExcelQtyCol, required:false }].map(({ label, value, setter, required }) => (
                        <div key={label} className="flex flex-col gap-1">
                          <label className="text-xs text-gray-500">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
                          <select value={value??''} onChange={e => setter(e.target.value===''?null:Number(e.target.value))} className="border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#014A99] bg-white cursor-pointer">
                            <option value="">-- 선택 안함 --</option>
                            {colOptions.map(o => <option key={o.idx} value={o.idx}>{o.label}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    {excelNameCol !== null && <p className="text-xs text-blue-600 font-medium">'내화' 포함 품목: {filteredCount}건</p>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">미리보기 (상위 {previewRows.length}행)</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="text-xs w-full">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-medium text-gray-400 w-10">#</th>
                          {colOptions.map(o => <th key={o.idx} className={`px-3 py-2 text-left font-medium whitespace-nowrap ${o.idx===excelNameCol?'bg-blue-50 text-blue-700':o.idx===excelSpecCol?'bg-green-50 text-green-700':o.idx===excelQtyCol?'bg-amber-50 text-amber-700':'text-gray-400'}`}>{o.label}</th>)}
                        </tr></thead>
                        <tbody>
                          {previewRows.map((row, ri) => {
                            const isHeader = ri === excelHeaderRowIdx
                            const hasNH = excelNameCol !== null && ((row[excelNameCol]??'').includes('내화') || (excelSpecCol!==null&&(row[excelSpecCol]??'').includes('내화')))
                            return <tr key={ri} className={`border-b border-gray-100 ${isHeader?'bg-gray-100 font-semibold':hasNH?'bg-blue-50/60':''}`}>
                              <td className="px-3 py-1.5 text-gray-300 text-center">{ri+1}</td>
                              {row.map((cell,ci) => <td key={ci} className="px-3 py-1.5 whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis">{cell}</td>)}
                            </tr>
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => { setShowExcel(false); setExcelFile(null); setExcelRows([]) }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">취소</button>
              <button onClick={handleExcelImport} disabled={excelNameCol===null||filteredCount===0} className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 cursor-pointer" style={{ backgroundColor:'#014A99' }}>
                {filteredCount>0?`${filteredCount}개 품목 가져오기`:'가져오기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-xs font-medium text-gray-500">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}
