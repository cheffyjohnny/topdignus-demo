'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { buildPriceMap, buildPipeSleeveStructure, buildManufacturerMaps, lookupSalePrice } from '@/lib/price-utils'
import { isProfireManufacturer } from '@/lib/vendor-mappings'
import {
  type EmailSignature,
  loadSignatures,
  saveSignatures,
  loadSelectedSigId,
  saveSelectedSigId,
  DEFAULT_SIGNATURE,
} from '@/lib/signatures'
import { InfoCard, InfoRow, EditCard, EditRow, INPUT_CLS } from './InfoComponents'

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrderType = 'pipe' | 'duct'
type OrderStatus = '수주' | '발주' | '납품' | '취소'
type HistoryEntry =
  | { type: 'status'; value: string; at: string }
  | { type: 'send'; to: string; subject: string; fileUrl?: string; fileName?: string; at: string }
  | { type: 'delivered'; to: string; at: string }

interface PipeItem {
  no: number; name: string; spec: string; quantity: number; unit: string
  internalName?: string; pipeSpec?: string; sleeveSpec?: string
  unitPrice?: number; note?: string; manufacturer?: string
}

type DuctItemType = '입상' | '벽체' | '차열재'
interface DuctItem {
  type: DuctItemType; width?: number; height?: number
  perimeter?: number; quantity: number; unit_price: number; amount: number
  note?: string | null; spec?: string
}

interface Order {
  id: string; order_no?: string
  vendor: string        // pipe: vendor, duct: customer_name (normalized)
  order_client?: string // pipe only
  project: string; delivery_location: string; address: string
  contact_name: string; contact_phone: string
  order_date: string; delivery_date: string; author: string
  manufacturer: string; notes: string; delivery_dest: string
  freight: number; sale_amount: number; purchase_amount: number
  no_invoice: boolean
  status: OrderStatus; items: any[]
  image_url: string | null; file_urls?: string[] | null; status_history: HistoryEntry[]; created_at: string
}

interface DuctSalePrice {
  manufacturer: string; customer_id: string
  riser_sale_price: number; wall_sale_price: number
  insul_50t_sale_price?: number; insul_25t_sale_price?: number
}
interface DuctPriceRow { manufacturer: string; insul_50t_price?: number; insul_25t_price?: number }
interface Customer { id: string; name: string }

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LIST: OrderStatus[] = ['수주', '발주', '납품', '취소']
const STATUS_COLORS: Record<OrderStatus, string> = {
  '수주': 'bg-blue-50 text-blue-700 border-blue-200',
  '발주': 'bg-amber-50 text-amber-700 border-amber-200',
  '납품': 'bg-green-50 text-green-700 border-green-200',
  '취소': 'bg-gray-50 text-gray-500 border-gray-200',
}

function fmtNum(n?: number | null) { return n ? n.toLocaleString('ko-KR') : '0' }
function toKST(iso: string) {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
}
function makeSigId() { return `sig_${Date.now()}` }

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OrderDetailPage({ type }: { type: OrderType }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const apiBase = type === 'pipe' ? '/api/orders' : '/api/duct-orders'

  // ── Common state ──
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [showFreightModal, setShowFreightModal] = useState(false)
  const [freightInput, setFreightInput] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  // send dialog
  const [sendMfr, setSendMfr] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailBody, setEmailBody] = useState('')
  // signatures
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [selectedSigId, setSelectedSigId] = useState('')
  const [showSigManager, setShowSigManager] = useState(false)
  const [sigFormMode, setSigFormMode] = useState<'none' | 'add' | 'edit'>('none')
  const [sigDraft, setSigDraft] = useState<EmailSignature | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // ── Pipe-specific state ──
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map())
  const [priceMapByMfr, setPriceMapByMfr] = useState<Map<string, Map<string, number>>>(new Map())
  const [internalNames, setInternalNames] = useState<string[]>([])
  const [discountPct, setDiscountPct] = useState<number | null>(null)
  const [activeMfrTab, setActiveMfrTab] = useState<string | null>(null)

  // ── Duct-specific state ──
  const [ductPricesData, setDuctPricesData] = useState<DuctPriceRow[]>([])
  const [ductSalePrices, setDuctSalePrices] = useState<DuctSalePrice[]>([])
  const [detailCustomers, setDetailCustomers] = useState<Customer[]>([])
  const [showInsulCalcWall, setShowInsulCalcWall] = useState(true)
  const [showInsulCalcRiser, setShowInsulCalcRiser] = useState(true)
  const [showAppliedCalcDetail, setShowAppliedCalcDetail] = useState(true)

  // ── Effects ──
  useEffect(() => {
    const sigs = loadSignatures()
    const selId = loadSelectedSigId()
    setSignatures(sigs)
    setSelectedSigId(sigs.find(s => s.id === selId)?.id ?? sigs[0]?.id ?? '')
  }, [])

  useEffect(() => {
    fetch(`${apiBase}/${id}`)
      .then(r => r.json())
      .then(async (raw: any) => {
        const normalized: Order = type === 'duct'
          ? { ...raw, vendor: raw.customer_name ?? raw.vendor ?? '' }
          : raw
        setOrder(normalized)
        setLoading(false)
        if (type === 'pipe') {
          const [pr, cr] = await Promise.all([fetch('/api/pipe-prices'), fetch('/api/customers')])
          const prices = await pr.json(); const customers = await cr.json()
          const priceRows = Array.isArray(prices) ? prices : []
          setPriceMap(buildPriceMap(priceRows))
          const { priceMapByMfr: byMfr } = buildManufacturerMaps(priceRows)
          setPriceMapByMfr(byMfr)
          setInternalNames(buildPipeSleeveStructure(priceRows).allNames)
          const cust = Array.isArray(customers) ? customers.find((c: any) => c.name?.trim() === normalized.vendor?.trim()) : null
          setDiscountPct(cust?.sale_pct ?? null)
        } else {
          const [dpr, cr, dspr] = await Promise.all([fetch('/api/duct-prices'), fetch('/api/customers'), fetch('/api/duct-sale-prices')])
          const dp = await dpr.json(); const dc = await cr.json(); const dsp = await dspr.json()
          if (Array.isArray(dp)) setDuctPricesData(dp)
          if (Array.isArray(dc)) setDetailCustomers(dc)
          if (Array.isArray(dsp)) setDuctSalePrices(dsp)
        }
      })
      .catch(() => setLoading(false))
  }, [id, type, apiBase])

  // ── Duct computed ──
  const d = editMode && editData ? editData : order
  const ductRegularItems = useMemo(() => type !== 'duct' || !d ? [] : (d.items as DuctItem[]).filter(it => it.type !== '차열재'), [type, d])
  const ductInsulItems   = useMemo(() => type !== 'duct' || !d ? [] : (d.items as DuctItem[]).filter(it => it.type === '차열재'), [type, d])
  const ductTotalAmount  = useMemo(() => ductRegularItems.reduce((s, it) => s + (it.amount ?? 0), 0), [ductRegularItems])
  const isProfire        = useMemo(() => type === 'duct' && isProfireManufacturer(d?.manufacturer), [type, d])

  const insulCalc = useMemo(() => {
    if (!isProfire || !d) return null
    const walls  = ductRegularItems.filter(it => it.type === '벽체').map(it => { const pMm = ((it.width??0)+(it.height??0))*2; return { it, pMm, mm50: pMm*4*it.quantity } })
    const risers = ductRegularItems.filter(it => it.type === '입상').map(it => { const pMm = ((it.width??0)+(it.height??0))*2; return { it, pMm, mm50: pMm*2*it.quantity, mm25: pMm*3*it.quantity } })
    const wMm50 = walls.reduce((s,r) => s+r.mm50, 0), rMm50 = risers.reduce((s,r)=>s+r.mm50,0), rMm25 = risers.reduce((s,r)=>s+r.mm25,0)
    if (wMm50+rMm50+rMm25 === 0) return null
    return { wallRows: walls, riserRows: risers, wallMm50: wMm50, riserMm50: rMm50, riserMm25: rMm25,
      rolls50: Math.ceil(wMm50/3600)+Math.ceil(rMm50/3600), rolls25: Math.ceil(rMm25/7200) }
  }, [isProfire, d, ductRegularItems])

  const detailSalePrice = useMemo(() => {
    if (!isProfire || !d) return null
    const cid = detailCustomers.find(c => c.name === d.vendor)?.id
    if (!cid) return null
    return ductSalePrices.find(sp => sp.manufacturer === d.manufacturer && sp.customer_id === cid) ?? null
  }, [isProfire, d, detailCustomers, ductSalePrices])

  const profireDuctPrice = useMemo(() => isProfire && d ? ductPricesData.find(dp => dp.manufacturer === d.manufacturer) ?? null : null, [isProfire, d, ductPricesData])
  const effectiveInsul50 = useMemo(() => (detailSalePrice && (detailSalePrice.insul_50t_sale_price??0)>0) ? detailSalePrice.insul_50t_sale_price! : (profireDuctPrice?.insul_50t_price ?? 0), [detailSalePrice, profireDuctPrice])
  const effectiveInsul25 = useMemo(() => (detailSalePrice && (detailSalePrice.insul_25t_sale_price??0)>0) ? detailSalePrice.insul_25t_sale_price! : (profireDuctPrice?.insul_25t_price ?? 0), [detailSalePrice, profireDuctPrice])

  const detailAppliedCalc = useMemo(() => {
    if (!insulCalc || !detailSalePrice) return null
    const { riserRows: rr, wallRows: wr, riserMm50, riserMm25, wallMm50 } = insulCalc
    const rTotalM = rr.reduce((s,r)=>s+(r.pMm/1000)*r.it.quantity,0), rInsul = Math.ceil(riserMm50/3600)*effectiveInsul50+Math.ceil(riserMm25/7200)*effectiveInsul25
    const rApp = rTotalM>0 ? Math.round((detailSalePrice.riser_sale_price*rTotalM-rInsul)/rTotalM/1000)*1000 : 0
    const wTotalM = wr.reduce((s,r)=>s+(r.pMm/1000)*r.it.quantity,0), wInsul = Math.ceil(wallMm50/3600)*effectiveInsul50
    const wApp = wTotalM>0 ? Math.round((detailSalePrice.wall_sale_price*wTotalM-wInsul)/wTotalM/1000)*1000 : 0
    return { riserApplied: rApp, wallApplied: wApp, riserTotalM: rTotalM, wallTotalM: wTotalM, riserInsulCost: rInsul, wallInsulCost: wInsul }
  }, [insulCalc, detailSalePrice, effectiveInsul50, effectiveInsul25])

  // ── Pipe computed ──
  const pipeItems = useMemo(() => type === 'pipe' && d ? d.items as PipeItem[] : [], [type, d])
  const pipeMfrs  = useMemo(() => [...new Set(pipeItems.map(it => it.manufacturer).filter(Boolean))] as string[], [pipeItems])

  // 배관 sale_amount가 0이면 items에서 계산 (구 데이터 호환). no_invoice이면 0
  const displaySaleAmount = useMemo(() => {
    if (!order) return 0
    if (order.no_invoice) return 0
    const stored = (order.sale_amount ?? 0) + (order.freight ?? 0)
    if (stored > 0 || type !== 'pipe') return stored
    const itemTotal = pipeItems.reduce((sum, item) => {
      const mfrMap = item.manufacturer ? (priceMapByMfr.get(item.manufacturer) ?? priceMap) : priceMap
      const up = item.unitPrice ?? (discountPct !== null && item.internalName
        ? lookupSalePrice(mfrMap, discountPct, item.internalName, item.pipeSpec, item.sleeveSpec)
        : undefined)
      return up != null ? sum + up * item.quantity : sum
    }, 0)
    return itemTotal + (order.freight ?? 0)
  }, [order, type, pipeItems, priceMap, priceMapByMfr, discountPct])

  // ── Signature helpers ──
  const selectedSig = signatures.find(s => s.id === selectedSigId) ?? signatures[0] ?? DEFAULT_SIGNATURE
  function selectSig(sid: string) { setSelectedSigId(sid); saveSelectedSigId(sid) }
  function openSigManager()  { setShowSigManager(true); setSigFormMode('none'); setSigDraft(null) }
  function closeSigManager() { setShowSigManager(false); setSigFormMode('none'); setSigDraft(null) }
  function startAddSig()  { setSigDraft({ id: makeSigId(), label:'', name:'', title:'', phone:'', email:'', web:'', address:'' }); setSigFormMode('add') }
  function startEditSig(sig: EmailSignature) { setSigDraft({ ...sig }); setSigFormMode('edit') }
  function saveSigDraft() {
    if (!sigDraft) return
    const next = sigFormMode === 'add' ? [...signatures, sigDraft] : signatures.map(s => s.id === sigDraft.id ? sigDraft : s)
    setSignatures(next); saveSignatures(next)
    if (sigFormMode === 'add') { setSelectedSigId(sigDraft.id); saveSelectedSigId(sigDraft.id) }
    setSigFormMode('none'); setSigDraft(null)
  }
  function deleteSig(sid: string) {
    const next = signatures.filter(s => s.id !== sid); setSignatures(next); saveSignatures(next)
    if (selectedSigId === sid) { const n = next[0]?.id ?? ''; setSelectedSigId(n); saveSelectedSigId(n) }
  }

  // ── getMfrEmail ──
  function getMfrEmail(mfr: string): string {
    if (type === 'pipe') return mfr === '필립산업' ? 'pl3077@naver.com' : ''
    return (isProfireManufacturer(mfr) || mfr?.includes('킹스아시아')) ? 'profire905@gmail.com' : ''
  }

  // ── Status update ──
  async function updateStatus(status: OrderStatus, freight?: number) {
    const body: Record<string, unknown> = { status }
    if (status === '납품' && freight) body.freight = freight
    const res = await fetch(`${apiBase}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { toast.error(data.error ?? '상태 변경 실패'); return }
    const now = new Date().toISOString()
    setOrder(prev => {
      if (!prev) return prev
      const updates: Partial<Order> = { status, status_history: [...(prev.status_history ?? []), { type: 'status', value: status, at: now }] }
      if (status === '납품' && freight) updates.freight = freight
      return { ...prev, ...updates }
    })
    toast.success(`"${status}"로 변경되었습니다.`)
    if (status === '납품') {
      if (data.ecount === 'ok') toast.success('[ECOUNT] 판매/구매입력 완료', { autoClose: 3000 })
      else if (data.ecount === 'skipped') toast.info('ECOUNT 품목코드가 없어 판매/구매입력을 건너뛰었습니다.')
      else if (data.ecount === 'fail') toast.error(`ECOUNT 입력 실패${data.ecountError ? `\n${data.ecountError}` : ''}`, { autoClose: false })
    }
  }

  // ── No Invoice toggle ──
  async function toggleNoInvoice() {
    if (!order) return
    const next = !order.no_invoice
    const res = await fetch(`${apiBase}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no_invoice: next }),
    })
    if (!res.ok) { toast.error('변경 실패'); return }
    setOrder(prev => prev ? { ...prev, no_invoice: next } : prev)
    toast.success(next ? '세금계산서 미발행으로 설정되었습니다.' : '세금계산서 발행으로 변경되었습니다.')
  }

  // ── Edit ──
  function startEdit() { if (!order) return; setEditData(JSON.parse(JSON.stringify(order))); setEditMode(true) }
  function cancelEdit() { setEditMode(false); setEditData(null) }
  function setField(key: string, val: any) { setEditData(prev => prev ? { ...prev, [key]: val } : prev) }

  function setItemField(idx: number, key: string, val: any) {
    setEditData(prev => {
      if (!prev) return prev
      const items = [...prev.items]
      if (type === 'pipe') {
        items[idx] = { ...items[idx], [key]: val }
      } else {
        const item = { ...items[idx], [key]: val }
        if (['width','height'].includes(key)) {
          const w = key === 'width' ? Number(val) : (item.width??0), h = key === 'height' ? Number(val) : (item.height??0)
          item.perimeter = Math.round(((w+h)*2)/1000*100)/100
          item.amount = Math.round((item.perimeter??0)*item.quantity*item.unit_price)
        }
        if (['quantity','unit_price'].includes(key)) item.amount = Math.round((item.perimeter??0)*item.quantity*item.unit_price)
        items[idx] = item
      }
      return { ...prev, items }
    })
  }

  function addItem() {
    setEditData(prev => {
      if (!prev) return prev
      if (type === 'pipe') {
        const items = prev.items as PipeItem[]
        const nextNo = items.length > 0 ? Math.max(...items.map(i=>i.no))+1 : 1
        return { ...prev, items: [...items, { no: nextNo, name:'', spec:'', unit:'ea', quantity: 1 }] }
      } else {
        return { ...prev, items: [...prev.items, { type: '입상' as DuctItemType, width:0, height:0, perimeter:0, quantity:1, unit_price:0, amount:0 }] }
      }
    })
  }

  function removeItem(idx: number) {
    setEditData(prev => {
      if (!prev) return prev
      const items = prev.items.filter((_,i) => i !== idx)
      if (type === 'pipe') return { ...prev, items: items.map((it,i) => ({ ...it, no: i+1 })) }
      return { ...prev, items }
    })
  }

  function setInsulItem(spec: string, qty: number, price: number) {
    setEditData(prev => {
      if (!prev) return prev
      const items = [...prev.items] as DuctItem[]
      const idx = items.findIndex(it => it.type === '차열재' && it.spec === spec)
      if (qty === 0) return idx >= 0 ? { ...prev, items: items.filter((_,i)=>i!==idx) } : prev
      const ni: DuctItem = { type:'차열재', spec, quantity:qty, unit_price:price, amount:qty*price }
      if (idx >= 0) { items[idx] = ni; return { ...prev, items } }
      return { ...prev, items: [...items, ni] }
    })
  }

  async function saveEdit() {
    if (!editData) return
    setSaving(true)
    const payload: any = { _full: true, ...editData }
    if (type === 'duct') payload.customer_name = editData.vendor
    const res = await fetch(`${apiBase}/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    if (res.ok) { setOrder(editData); setEditMode(false); setEditData(null); toast.success('저장되었습니다.') }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`${apiBase}/${id}`, { method: 'DELETE' })
    router.push('/dashboard/orders')
  }

  // ── Download ──
  async function handleDownloadPdf(mfr?: string) {
    setDownloading(true); setPdfError(null)
    try {
      let url = `${apiBase}/${id}/pdf`
      if (type === 'pipe' && mfr) url += `?manufacturer=${encodeURIComponent(mfr)}`
      const res = await fetch(url)
      if (!res.ok) { const d = await res.json().catch(()=>({})); setPdfError(d.error ?? `오류 ${res.status}`); return }
      const blob = await res.blob()
      const match = res.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''(.+)/)
      const filename = match ? decodeURIComponent(match[1]) : '발주서.pdf'
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = objUrl; a.download = filename; a.click(); URL.revokeObjectURL(objUrl)
    } catch(e) { setPdfError(e instanceof Error ? e.message : '알 수 없는 오류') }
    finally { setDownloading(false) }
  }

  async function handleDownloadExcel(mfr?: string) {
    setDownloading(true)
    try {
      let url = `${apiBase}/${id}/excel`
      if (type === 'pipe' && mfr) url += `?manufacturer=${encodeURIComponent(mfr)}`
      const res = await fetch(url)
      if (!res.ok) return
      const blob = await res.blob()
      const match = res.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''(.+)/)
      const filename = match ? decodeURIComponent(match[1]) : '수주서.xlsx'
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = objUrl; a.download = filename; a.click(); URL.revokeObjectURL(objUrl)
    } finally { setDownloading(false) }
  }

  // ── Send dialog ──
  function openSendDialog(mfr: string) {
    setSendMfr(mfr); setSendResult(null); setAttachedFile(null)
    setRecipientEmail(getMfrEmail(mfr))
    setEmailBody(`안녕하세요, 탑디뉴스입니다.\n\n'${order?.project ?? ''}' 현장의 발주를 요청합니다.\n납기일에 문제가 있을 경우 연락 부탁드립니다.\n\n감사합니다.`)
  }
  function closeSendDialog() { setSendMfr(null); setAttachedFile(null); setSendResult(null); setRecipientEmail(''); setEmailBody('') }
  const showSendDialog = sendMfr !== null

  async function handleSendOrder() {
    if (!attachedFile || !order) return
    setSending(true); setSendResult(null); setSendError(null)
    try {
      const fd = new FormData()
      fd.append('attachment', attachedFile); fd.append('recipientEmail', recipientEmail)
      if (selectedSig) fd.append('signature', JSON.stringify(selectedSig))
      fd.append('emailBody', emailBody)
      const res = await fetch(`${apiBase}/${id}/send`, { method:'POST', body: fd })
      const rd = await res.json().catch(()=>({}))
      if (!res.ok) { setSendError(rd.error ?? '오류'); setSendResult('error'); toast.error(rd.error ?? '전송 오류', { autoClose: false }); return }
      setSendResult('success'); toast.success(`${recipientEmail}로 전송되었습니다.`)
      const now = new Date().toISOString()
      setOrder(prev => {
        if (!prev) return prev
        return { ...prev, status:'발주', status_history: [...(prev.status_history??[]),
          { type:'send' as const, to:recipientEmail, subject:`[발주서] ${order.project}`, fileUrl:rd.fileUrl, fileName:rd.fileName, at:now },
          { type:'status' as const, value:'발주', at:now }] }
      })
    } catch { setSendResult('error'); toast.error('전송 중 오류', { autoClose: false }) }
    finally { setSending(false) }
  }

  // ── Render ──
  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">불러오는 중...</div>
  if (!order || !d)  return <div className="text-sm text-red-500 p-6">수주서를 찾을 수 없습니다.</div>

  return (
    <>
      {type === 'pipe' && <style>{`@media print { body > * { display:none!important; } #print-area { display:block!important; position:fixed; top:0; left:0; width:100%; } }`}</style>}

      <div className="w-full space-y-6 pb-16 print:hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => editMode ? cancelEdit() : router.back()} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{d.project || '(현장명 없음)'}</h1>
                {order.order_no && <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{order.order_no}</span>}
                {order.no_invoice && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 border border-gray-300">세금계산서 미발행</span>}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{d.vendor} · {d.order_date?.slice(0,10) ?? '-'} · {type === 'pipe' ? '배관' : '사각덕트'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {editMode ? (
              <>
                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">취소</button>
                <button onClick={saveEdit} disabled={saving} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 cursor-pointer" style={{ backgroundColor: '#014A99' }}>{saving ? '저장 중...' : '저장'}</button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleNoInvoice}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                    order.no_invoice
                      ? 'text-gray-500 border-gray-300 bg-gray-100 hover:bg-gray-200'
                      : 'text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                  }`}
                  title={order.no_invoice ? '세금계산서 발행으로 변경' : '세금계산서 미발행으로 설정'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {order.no_invoice ? '계산서 발행 전환' : '계산서 미발행 전환'}
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>삭제
                </button>
                <button onClick={() => handleDownloadExcel()} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 border border-green-300 hover:bg-green-50 disabled:opacity-40 transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                  {downloading ? '생성 중...' : '엑셀'}
                </button>
                <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" /></svg>편집
                </button>
                <select value={order.status} onChange={e => { const s = e.target.value as OrderStatus; if (s === order.status) return; if (s === '납품') { setShowFreightModal(true); return } setPendingStatus(s) }}
                  className={`text-sm font-medium px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LIST.map(s => <option key={s} value={s} disabled={s === '납품' && order.status !== '발주'}>{s}</option>)}
                </select>
              </>
            )}
          </div>
        </div>

        {pdfError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{pdfError}</p>}

        {/* ── Info cards ── */}
        {editMode ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditCard title="발주 정보">
              {type === 'pipe' ? (
                <>
                  <EditRow label="발주의뢰처"><input value={d.vendor ?? ''} onChange={e => setField('vendor', e.target.value)} className={INPUT_CLS} /></EditRow>
                  <EditRow label="납품처"><input value={d.delivery_dest ?? ''} onChange={e => setField('delivery_dest', e.target.value)} className={INPUT_CLS} /></EditRow>
                </>
              ) : (
                <>
                  <EditRow label="제조사"><input value={d.manufacturer ?? ''} onChange={e => setField('manufacturer', e.target.value)} className={INPUT_CLS} /></EditRow>
                  <EditRow label="발주의뢰처"><input value={d.vendor ?? ''} onChange={e => setField('vendor', e.target.value)} className={INPUT_CLS} /></EditRow>
                </>
              )}
              <EditRow label="현장명"><input value={d.project ?? ''} onChange={e => setField('project', e.target.value)} className={INPUT_CLS} /></EditRow>
              {type === 'pipe' && <EditRow label="제조사"><input value={d.manufacturer ?? ''} onChange={e => setField('manufacturer', e.target.value)} className={INPUT_CLS} /></EditRow>}
              <EditRow label="수주일"><input type="date" value={d.order_date?.slice(0,10) ?? ''} onChange={e => setField('order_date', e.target.value)} className={INPUT_CLS} /></EditRow>
              <EditRow label="납품희망일"><input type="date" value={d.delivery_date?.slice(0,10) ?? ''} onChange={e => setField('delivery_date', e.target.value)} className={INPUT_CLS} /></EditRow>
              <EditRow label="작성자"><input value={d.author ?? ''} onChange={e => setField('author', e.target.value)} className={INPUT_CLS} /></EditRow>
              <EditRow label="비고"><textarea value={d.notes ?? ''} onChange={e => setField('notes', e.target.value)} rows={3} className={INPUT_CLS + ' resize-y'} /></EditRow>
            </EditCard>
            <EditCard title="납품 정보">
              <EditRow label="인수자"><input value={d.contact_name ?? ''} onChange={e => setField('contact_name', e.target.value)} className={INPUT_CLS} /></EditRow>
              <EditRow label="인수자 연락처"><input value={d.contact_phone ?? ''} onChange={e => setField('contact_phone', e.target.value)} className={INPUT_CLS} /></EditRow>
              <EditRow label="납품장소"><input value={d.delivery_location ?? ''} onChange={e => setField('delivery_location', e.target.value)} className={INPUT_CLS} /></EditRow>
              <EditRow label="주소"><input value={d.address ?? ''} onChange={e => setField('address', e.target.value)} className={INPUT_CLS} /></EditRow>
              {type === 'duct' && <EditRow label="납품처"><input value={d.delivery_dest ?? ''} onChange={e => setField('delivery_dest', e.target.value)} className={INPUT_CLS} /></EditRow>}
            </EditCard>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard title="발주 정보">
              {type === 'pipe' ? (
                <><InfoRow label="발주의뢰처" value={order.vendor} /><InfoRow label="납품처" value={order.delivery_dest} /></>
              ) : (
                <><InfoRow label="제조사" value={order.manufacturer} /><InfoRow label="발주의뢰처" value={order.vendor} /></>
              )}
              <InfoRow label="현장명" value={order.project} />
              {type === 'pipe' && <InfoRow label="제조사" value={order.manufacturer} />}
              <InfoRow label="수주일" value={order.order_date?.slice(0,10)} />
              <InfoRow label="납품희망일" value={order.delivery_date?.slice(0,10)} />
              <InfoRow label="작성자" value={order.author} />
              <InfoRow label="비고" value={order.notes} />
            </InfoCard>
            <InfoCard title="납품 정보">
              <InfoRow label="인수자" value={order.contact_name} />
              <InfoRow label="연락처" value={order.contact_phone} />
              <InfoRow label="납품장소" value={order.delivery_location} />
              <InfoRow label="주소" value={order.address} />
              {type === 'duct' && <InfoRow label="납품처" value={order.delivery_dest} />}
            </InfoCard>
          </div>
        )}

        {/* ── Attachments ── */}
        {!editMode && (() => {
          const effectiveUrls = (order.file_urls && order.file_urls.length > 0)
            ? order.file_urls
            : order.image_url ? [order.image_url] : []
          if (effectiveUrls.length === 0) return null
          return (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 px-4 py-3 border-b border-gray-100">첨부파일 ({effectiveUrls.length}개)</p>
              <ul className="divide-y divide-gray-100">
                {effectiveUrls.map((url, i) => {
                  const hash = url.split('#')[1] ?? ''; const cleanUrl = url.split('#')[0]
                  const fname = hash.startsWith('name=') ? decodeURIComponent(hash.slice(5)) : decodeURIComponent(cleanUrl.split('/').pop()?.split('?')[0] ?? '').replace(/^\d{13}\./, '')
                  const lower = fname.toLowerCase()
                  const isImg = /\.(jpe?g|png|gif|webp|bmp|svg)$/.test(lower)
                  const isPdf = /\.pdf$/.test(lower)
                  const isExcel = /\.(xlsx?|csv)$/.test(lower)
                  const iconColor = isPdf ? 'text-red-400' : isExcel ? 'text-green-500' : isImg ? 'text-blue-400' : 'text-gray-400'
                  const badge = isPdf ? 'PDF' : isExcel ? 'Excel' : isImg ? '이미지' : '파일'
                  const badgeColor = isPdf ? 'bg-red-50 text-red-500' : isExcel ? 'bg-green-50 text-green-600' : isImg ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  return (
                    <li key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <svg className={`w-5 h-5 shrink-0 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="flex-1 text-sm text-gray-700 truncate">{fname}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${badgeColor}`}>{badge}</span>
                      <a href={isImg ? cleanUrl : `/api/download?url=${encodeURIComponent(cleanUrl)}&name=${encodeURIComponent(fname)}`}
                        target={isImg ? '_blank' : '_self'} rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline shrink-0">{isImg ? '열기' : '다운로드'}</a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })()}

        {/* ── Items section ── */}
        {type === 'pipe' ? (
          <PipeItemsSection
            order={order} editMode={editMode} editData={editData} d={d}
            priceMap={priceMap} priceMapByMfr={priceMapByMfr} internalNames={internalNames} discountPct={discountPct}
            pipeMfrs={pipeMfrs} activeMfrTab={activeMfrTab} setActiveMfrTab={setActiveMfrTab}
            setItemField={setItemField} addItem={addItem} removeItem={removeItem}
            openSendDialog={openSendDialog} handleDownloadPdf={handleDownloadPdf} downloading={downloading}
            displaySaleAmount={displaySaleAmount}
          />
        ) : (
          <DuctItemsSection
            order={order} editMode={editMode} editData={editData} d={d}
            regularItems={ductRegularItems} insulItems={ductInsulItems} totalAmount={ductTotalAmount}
            setItemField={setItemField} addItem={addItem} removeItem={removeItem} setInsulItem={setInsulItem}
            openSendDialog={openSendDialog} handleDownloadPdf={() => handleDownloadPdf()} downloading={downloading}
          />
        )}

        {/* ── Duct profire: insul calc ── */}
        {type === 'duct' && isProfire && insulCalc && (
          <div className="rounded-xl border border-orange-200 overflow-hidden">
            <div className="px-5 py-2.5 bg-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-orange-700">차열재 계산 참고</span>
                <span className="flex items-center gap-1.5 text-xs text-orange-600">
                  50T×400 <span className="bg-orange-200 text-orange-900 font-semibold px-1.5 py-0.5 rounded">{insulCalc.rolls50}롤</span>
                  {insulCalc.rolls25 > 0 && <> · 25T×400 <span className="bg-orange-200 text-orange-900 font-semibold px-1.5 py-0.5 rounded">{insulCalc.rolls25}롤</span></>}
                </span>
              </div>
              <div className="flex gap-3">
                {insulCalc.wallRows.length > 0 && <button onClick={() => setShowInsulCalcWall(v=>!v)} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 cursor-pointer">벽체 <svg className={`w-3.5 h-3.5 transition-transform ${showInsulCalcWall?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>}
                {insulCalc.riserRows.length > 0 && <button onClick={() => setShowInsulCalcRiser(v=>!v)} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 cursor-pointer">입상 <svg className={`w-3.5 h-3.5 transition-transform ${showInsulCalcRiser?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>}
              </div>
            </div>
            {showInsulCalcWall && insulCalc.wallRows.length > 0 && (
              <div className="border-t-2 border-orange-200">
                <div className="px-5 py-2 bg-orange-100/60 border-b border-orange-200"><span className="text-xs font-bold text-orange-700">벽체</span> <span className="text-xs text-orange-400">50T×400</span></div>
                <div className="px-5 py-3 text-xs text-orange-900">
                  <table className="w-full border-collapse"><thead><tr className="text-orange-500 border-b border-orange-200"><th className="text-left py-1 pr-4">치수</th><th className="text-left py-1 pr-4">수량</th><th className="text-left py-1 pr-4">계산식</th><th className="text-right py-1">롤</th></tr></thead>
                    <tbody>{insulCalc.wallRows.map((r,i)=><tr key={i} className="border-b border-orange-100"><td className="py-1 pr-4">{r.it.width}×{r.it.height}</td><td className="py-1 pr-4">{r.it.quantity}개</td><td className="py-1 pr-4 font-mono">둘레 {r.pMm.toLocaleString()}mm×2×2×{r.it.quantity} = {r.mm50.toLocaleString()}mm</td><td className="py-1 text-right">{Math.ceil(r.mm50/3600)}롤</td></tr>)}</tbody>
                  </table>
                  <div className="pt-1.5 mt-1 border-t border-orange-200 font-semibold text-orange-800">합계: {insulCalc.wallMm50.toLocaleString()}mm ÷ 3,600 = <strong>{Math.ceil(insulCalc.wallMm50/3600)}롤</strong></div>
                </div>
              </div>
            )}
            {showInsulCalcRiser && insulCalc.riserRows.length > 0 && (
              <div className="border-t-2 border-orange-300">
                <div className="px-5 py-2 bg-amber-50 border-b border-orange-200"><span className="text-xs font-bold text-orange-700">입상</span> <span className="text-xs text-orange-400">50T×400 · 25T×400</span></div>
                <div className="px-5 py-3 text-xs text-orange-900 space-y-3">
                  <div>
                    <p className="font-semibold mb-1 text-orange-600">1·2단 (50T)</p>
                    <table className="w-full border-collapse"><thead><tr className="text-orange-500 border-b border-orange-200"><th className="text-left py-1 pr-4">치수</th><th className="text-left py-1 pr-4">수량</th><th className="text-left py-1 pr-4">계산식</th><th className="text-right py-1">롤</th></tr></thead>
                      <tbody>{insulCalc.riserRows.map((r,i)=><tr key={i} className="border-b border-orange-100"><td className="py-1 pr-4">{r.it.width}×{r.it.height}</td><td className="py-1 pr-4">{r.it.quantity}개</td><td className="py-1 pr-4 font-mono">둘레 {r.pMm.toLocaleString()}mm×2×{r.it.quantity} = {r.mm50.toLocaleString()}mm</td><td className="py-1 text-right">{Math.ceil(r.mm50/3600)}롤</td></tr>)}</tbody>
                    </table>
                    <div className="pt-1.5 mt-1 border-t border-orange-200 font-semibold text-orange-800">합계: {insulCalc.riserMm50.toLocaleString()}mm ÷ 3,600 = <strong>{Math.ceil(insulCalc.riserMm50/3600)}롤</strong></div>
                  </div>
                  <div className="border-t border-dashed border-orange-200 pt-3">
                    <p className="font-semibold mb-1 text-orange-600">1·2·3단 (25T)</p>
                    <table className="w-full border-collapse"><thead><tr className="text-orange-500 border-b border-orange-200"><th className="text-left py-1 pr-4">치수</th><th className="text-left py-1 pr-4">수량</th><th className="text-left py-1 pr-4">계산식</th><th className="text-right py-1">롤</th></tr></thead>
                      <tbody>{insulCalc.riserRows.map((r,i)=><tr key={i} className="border-b border-orange-100"><td className="py-1 pr-4">{r.it.width}×{r.it.height}</td><td className="py-1 pr-4">{r.it.quantity}개</td><td className="py-1 pr-4 font-mono">둘레 {r.pMm.toLocaleString()}mm×3×{r.it.quantity} = {r.mm25.toLocaleString()}mm</td><td className="py-1 text-right">{Math.ceil(r.mm25/7200)}롤</td></tr>)}</tbody>
                    </table>
                    <div className="pt-1.5 mt-1 border-t border-orange-200 font-semibold text-orange-800">합계: {insulCalc.riserMm25.toLocaleString()}mm ÷ 7,200 = <strong>{Math.ceil(insulCalc.riserMm25/7200)}롤</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Duct profire: applied calc ── */}
        {type === 'duct' && isProfire && detailAppliedCalc && detailSalePrice && insulCalc && (
          <div className="rounded-xl border border-blue-200 overflow-hidden">
            <div className="px-5 py-2.5 bg-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700">적용단가 계산식</span>
                <span className="flex items-center gap-3 text-xs text-blue-600">
                  {detailAppliedCalc.riserTotalM > 0 && <span>입상 <span className="bg-blue-200 text-blue-900 font-semibold px-1.5 py-0.5 rounded">{detailAppliedCalc.riserApplied.toLocaleString()}원/M</span></span>}
                  {detailAppliedCalc.wallTotalM  > 0 && <span>벽체 <span className="bg-blue-200 text-blue-900 font-semibold px-1.5 py-0.5 rounded">{detailAppliedCalc.wallApplied.toLocaleString()}원/M</span></span>}
                </span>
              </div>
              <button onClick={() => setShowAppliedCalcDetail(v=>!v)} className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer flex items-center gap-1">계산 보기 <svg className={`w-3.5 h-3.5 transition-transform ${showAppliedCalcDetail?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
            </div>
            {showAppliedCalcDetail && (
              <div className="px-5 py-4 space-y-5 text-xs text-blue-900 border-t border-blue-100">
                <p className="text-blue-500 font-semibold">공식: ( 판매단가 × 총M - 차열재가격 ) / 총M → 천원 단위 반올림</p>
                {detailAppliedCalc.riserTotalM > 0 && (
                  <div><p className="font-bold text-blue-700 mb-2">입상</p>
                    <table className="w-full border-collapse"><tbody className="divide-y divide-blue-100">
                      <tr><td className="py-1.5 pr-4 text-blue-500 w-28">판매단가</td><td className="py-1.5 font-mono">{detailSalePrice.riser_sale_price.toLocaleString()}원/M</td></tr>
                      <tr><td className="py-1.5 pr-4 text-blue-500">총 M</td><td className="py-1.5 font-mono">{detailAppliedCalc.riserTotalM.toFixed(3)}M</td></tr>
                      <tr><td className="py-1.5 pr-4 text-blue-500">차열재가격</td><td className="py-1.5 font-mono">{detailAppliedCalc.riserInsulCost.toLocaleString()}원</td></tr>
                      <tr className="text-blue-700 font-semibold"><td className="py-1.5 pr-4">적용단가</td><td className="py-1.5">{detailAppliedCalc.riserApplied.toLocaleString()}원/M</td></tr>
                    </tbody></table>
                  </div>
                )}
                {detailAppliedCalc.wallTotalM > 0 && (
                  <div><p className="font-bold text-blue-700 mb-2">벽체</p>
                    <table className="w-full border-collapse"><tbody className="divide-y divide-blue-100">
                      <tr><td className="py-1.5 pr-4 text-blue-500 w-28">판매단가</td><td className="py-1.5 font-mono">{detailSalePrice.wall_sale_price.toLocaleString()}원/M</td></tr>
                      <tr><td className="py-1.5 pr-4 text-blue-500">총 M</td><td className="py-1.5 font-mono">{detailAppliedCalc.wallTotalM.toFixed(3)}M</td></tr>
                      <tr><td className="py-1.5 pr-4 text-blue-500">차열재가격</td><td className="py-1.5 font-mono">{detailAppliedCalc.wallInsulCost.toLocaleString()}원</td></tr>
                      <tr className="text-blue-700 font-semibold"><td className="py-1.5 pr-4">적용단가</td><td className="py-1.5">{detailAppliedCalc.wallApplied.toLocaleString()}원/M</td></tr>
                    </tbody></table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Freight ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200">
          <span className="text-sm text-gray-500">운임비</span>
          {editMode ? (
            <div className="flex flex-col items-end gap-1">
              <input type="number" min={0} value={editData?.freight || ''} onChange={e => setField('freight', Number(e.target.value)||0)}
                className="w-40 border border-gray-300 rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:border-[#014A99]" placeholder="0" />
              <span className="text-xs text-amber-500">수정 시 ECOUNT는 수동 업데이트 필요</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-800">{(order.freight??0) > 0 ? `${fmtNum(order.freight)}원` : '—'}</span>
          )}
        </div>


        {/* ── Send history ── */}
        {!editMode && (() => {
          const events = (order.status_history??[]).filter(e => e.type === 'send' || e.type === 'delivered')
          if (!events.length) return null
          return (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-500 border-b border-gray-100">발주서 전송 내역</div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-400 border-b border-gray-100"><tr><th className="px-4 py-2 text-left">일시</th><th className="px-4 py-2 text-left">수신</th><th className="px-4 py-2 text-left">파일</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {events.map((e,i) => (
                    <tr key={i} className={e.type === 'delivered' ? 'bg-green-50/50' : 'bg-white'}>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{toKST(e.at)}</td>
                      <td className="px-4 py-2">{(e as any).to ?? <span className="text-green-600 font-medium">✓ 수신 확인</span>}</td>
                      <td className="px-4 py-2">{e.type === 'send' && (e as any).fileUrl && <a href={(e as any).fileUrl} download={(e as any).fileName} className="text-[#014A99] underline hover:opacity-70">{(e as any).fileName ?? '다운로드'}</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}

        {/* ── Status history ── */}
        {!editMode && (() => {
          const events = (order.status_history??[]).filter(e => e.type === 'status')
          if (!events.length) return null
          return (
            <div className="rounded-xl border border-gray-200 px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-gray-500">상태 변경 이력</p>
              {[...events].reverse().map((e,i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_COLORS[e.value as OrderStatus] ?? 'bg-gray-100 text-gray-500'}`}>{e.value}</span>
                  <span className="text-gray-400">{toKST(e.at)}</span>
                </div>
              ))}
            </div>
          )
        })()}

        {!editMode && order.created_at && <p className="text-xs text-gray-300 text-right">등록일: {toKST(order.created_at)}</p>}

        {/* ────── Modals ────── */}

        {/* Status confirm */}
        {pendingStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target===e.currentTarget) setPendingStatus(null) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-[#014A99]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <div><p className="font-semibold text-gray-900">상태 변경</p><p className="text-sm text-gray-500 mt-0.5">상태를 변경하시겠습니까?</p></div>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[pendingStatus]}`}>{pendingStatus}</span>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setPendingStatus(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">취소</button>
                <button onClick={() => { updateStatus(pendingStatus); setPendingStatus(null) }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor:'#014A99' }}>확인</button>
              </div>
            </div>
          </div>
        )}

        {/* Freight modal */}
        {showFreightModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target===e.currentTarget) { setShowFreightModal(false); setFreightInput('') } }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                <div><p className="font-semibold text-gray-900">납품 완료 처리</p><p className="text-sm text-gray-500 mt-0.5">운임비를 입력 후 납품 완료 처리됩니다.</p></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">운임비 (원)</label>
                <input type="number" value={freightInput} onChange={e => setFreightInput(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key==='Enter') { const f=Number(freightInput); if(!f||f<=0){toast.error('운임비를 입력해주세요.');return} setShowFreightModal(false);setFreightInput('');updateStatus('납품',f) } }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]" placeholder="예: 50000" min="1" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowFreightModal(false); setFreightInput('') }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">취소</button>
                <button onClick={() => { const f=Number(freightInput); if(!f||f<=0){toast.error('운임비를 입력해주세요.');return} setShowFreightModal(false);setFreightInput('');updateStatus('납품',f) }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ backgroundColor:'#014A99' }}>납품 완료</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target===e.currentTarget) setShowDeleteConfirm(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                <div><p className="font-semibold text-gray-900">수주서 삭제</p><p className="text-sm text-gray-500">삭제하면 복구할 수 없습니다.</p></div>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
                <p><span className="text-gray-400 w-16 inline-block">업체</span><span className="font-medium">{order.vendor}</span></p>
                <p><span className="text-gray-400 w-16 inline-block">현장명</span>{order.project||'—'}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">취소</button>
                <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 cursor-pointer">{deleting?'삭제 중...':'삭제'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Send dialog */}
        {showSendDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div><h2 className="text-base font-bold text-gray-900">발주서 전송</h2><p className="text-xs text-gray-400 mt-0.5">PDF 첨부 후 전송하세요.</p></div>
                <button onClick={closeSendDialog} className="text-gray-400 hover:text-gray-600 cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">수신</p>
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-[#014A99] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="flex-1 bg-transparent text-sm text-gray-800 font-medium focus:outline-none min-w-0" placeholder="수신 이메일" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">첨부 파일</p>
                  <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-[#014A99]/40 hover:bg-blue-50/30 transition-colors">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    {attachedFile ? <span className="text-sm text-[#014A99] font-medium truncate">{attachedFile.name}</span> : <span className="text-sm text-gray-400">PDF 파일을 선택하세요</span>}
                    <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { setAttachedFile(e.target.files?.[0]??null); setSendResult(null); setSendError(null) }} />
                  </label>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">발신 서명</p>
                  <div className="flex gap-2">
                    <select value={selectedSigId} onChange={e => selectSig(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]">
                      {signatures.map(s => <option key={s.id} value={s.id}>{s.label||s.name}</option>)}
                    </select>
                    <button onClick={openSigManager} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-300 hover:bg-gray-50 shrink-0 cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>설정
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">이메일 본문</p>
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed resize-none focus:outline-none focus:border-[#014A99]" />
                  {selectedSig && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="TOPdi" width={52} className="block shrink-0" />
                        <div className="border-l border-gray-200 pl-4">
                          <p className="text-sm font-bold text-gray-900">{selectedSig.name}</p>
                          <p className="text-xs text-gray-400 mb-1">{selectedSig.title}</p>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <div className="flex gap-3"><span className="text-gray-400 w-3">t</span><span>{selectedSig.phone}</span><span className="text-gray-400 w-3 ml-2">e</span><span className="text-[#014A99]">{selectedSig.email}</span></div>
                            <div className="flex gap-3"><span className="text-gray-400 w-3">w</span><span className="text-[#014A99]">{selectedSig.web}</span></div>
                            <div className="flex gap-3"><span className="text-gray-400 w-3 shrink-0">a</span><span>{selectedSig.address}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {sendResult === 'success' && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2"><svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>발주서가 성공적으로 전송되었습니다.</div>}
                {sendResult === 'error' && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{sendError ?? '전송 중 오류가 발생했습니다.'}</div>}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end shrink-0">
                <button onClick={closeSendDialog} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">{sendResult==='success'?'닫기':'취소'}</button>
                {sendResult !== 'success' && (
                  <button onClick={handleSendOrder} disabled={sending||!attachedFile} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 cursor-pointer" style={{ backgroundColor:'#014A99' }}>
                    {sending ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>전송 중...</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>전송</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sig manager */}
        {showSigManager && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-gray-900">서명 설정</h2>
                <button onClick={closeSigManager} className="text-gray-400 hover:text-gray-600 cursor-pointer"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-6 space-y-4">
                {sigFormMode === 'none' ? (
                  <>
                    {signatures.map(sig => (
                      <div key={sig.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div><p className="text-sm font-medium">{sig.label||sig.name}</p><p className="text-xs text-gray-400">{sig.name} · {sig.title}</p></div>
                        <div className="flex gap-2">
                          <button onClick={() => startEditSig(sig)} className="text-xs text-gray-500 hover:text-[#014A99] cursor-pointer">편집</button>
                          <button onClick={() => deleteSig(sig.id)} className="text-xs text-red-400 hover:text-red-600 cursor-pointer">삭제</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={startAddSig} className="w-full py-2.5 rounded-lg text-sm font-medium text-[#014A99] border-2 border-dashed border-[#014A99]/30 hover:border-[#014A99]/60 hover:bg-blue-50/30 cursor-pointer">+ 서명 추가</button>
                  </>
                ) : (
                  sigDraft && (
                    <div className="space-y-3">
                      {(['label','name','title','phone','email','web','address'] as const).map(k => (
                        <div key={k} className="flex items-center gap-3">
                          <label className="text-xs text-gray-400 w-16 shrink-0">{{label:'레이블',name:'이름',title:'직책',phone:'전화',email:'이메일',web:'웹사이트',address:'주소'}[k]}</label>
                          <input value={(sigDraft as any)[k]??''} onChange={e => setSigDraft(prev => prev ? { ...prev, [k]: e.target.value } : prev)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99]" />
                        </div>
                      ))}
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setSigFormMode('none'); setSigDraft(null) }} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">취소</button>
                        <button onClick={saveSigDraft} className="flex-1 py-2 text-sm font-semibold text-white rounded-lg cursor-pointer" style={{ backgroundColor:'#014A99' }}>저장</button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print area (pipe only) */}
      {type === 'pipe' && (
        <div id="print-area" ref={printRef} style={{ display: 'none' }}>
          <div style={{ padding: '20px', fontFamily: 'sans-serif', fontSize: '12px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>{order.project} 발주서</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead><tr style={{ background: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>No</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>품목명</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>규격</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>수량</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>내부품명</th>
              </tr></thead>
              <tbody>{(order.items as PipeItem[]).map((item,i) => (
                <tr key={i}><td style={{ border:'1px solid #ddd', padding:'6px' }}>{item.no}</td><td style={{ border:'1px solid #ddd', padding:'6px' }}>{item.name}</td><td style={{ border:'1px solid #ddd', padding:'6px' }}>{item.spec}</td><td style={{ border:'1px solid #ddd', padding:'6px', textAlign:'center' }}>{item.quantity}</td><td style={{ border:'1px solid #ddd', padding:'6px' }}>{item.internalName??'-'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ─── PipeItemsSection ─────────────────────────────────────────────────────────

interface PipeItemsSectionProps {
  order: Order; editMode: boolean; editData: Order | null; d: Order
  priceMap: Map<string, number>; priceMapByMfr: Map<string, Map<string, number>>; internalNames: string[]; discountPct: number | null
  pipeMfrs: string[]; activeMfrTab: string | null; setActiveMfrTab: (v: string | null) => void
  setItemField: (idx: number, key: string, val: any) => void
  addItem: () => void; removeItem: (idx: number) => void
  openSendDialog: (mfr: string) => void; handleDownloadPdf: (mfr?: string) => void; downloading: boolean
  displaySaleAmount: number
}

function PipeItemsSection({ order, editMode, editData, d, priceMap, priceMapByMfr, internalNames, discountPct, pipeMfrs, activeMfrTab, setActiveMfrTab, setItemField, addItem, removeItem, openSendDialog, handleDownloadPdf, downloading, displaySaleAmount }: PipeItemsSectionProps) {
  const allItems = d.items as Array<{ no: number; name: string; spec: string; quantity: number; unit: string; internalName?: string; pipeSpec?: string; sleeveSpec?: string; unitPrice?: number; note?: string; manufacturer?: string }>
  const hasMultiMfr = pipeMfrs.length > 1
  const activeMfr = activeMfrTab && pipeMfrs.includes(activeMfrTab) ? activeMfrTab : (hasMultiMfr ? null : pipeMfrs[0] ?? null)
  const visibleItems = hasMultiMfr && activeMfr ? allItems.filter(it => it.manufacturer === activeMfr) : allItems
  const showMfrCol = !hasMultiMfr && pipeMfrs.length === 1

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-500 border-b border-gray-200 flex items-center justify-between">
        <span>품목 목록 ({allItems.length}건)</span>
        {discountPct !== null && <span className="text-gray-400">판매가 = 협가 × {discountPct}%</span>}
      </div>
      {editMode ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100"><tr>
                <th className="px-4 py-2.5 text-left w-10">No</th>
                <th className="px-4 py-2.5 text-left">품목명</th>
                <th className="px-4 py-2.5 text-left w-28">규격</th>
                <th className="px-4 py-2.5 text-center w-16">수량</th>
                <th className="px-4 py-2.5 text-left w-52">내부 품명 / 규격</th>
                <th className="px-4 py-2.5 text-left w-32">비고</th>
                <th className="w-8" />
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {allItems.map((item, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-4 py-2 text-gray-400 text-xs">{i+1}</td>
                    <td className="px-2 py-2"><input value={editData!.items[i]?.name??''} onChange={e => setItemField(i,'name',e.target.value)} className={INPUT_CLS} placeholder="품목명" /></td>
                    <td className="px-2 py-2"><input value={editData!.items[i]?.spec??''} onChange={e => setItemField(i,'spec',e.target.value)} className={INPUT_CLS} placeholder="규격" /></td>
                    <td className="px-2 py-2"><input type="number" min={1} value={editData!.items[i]?.quantity??1} onChange={e => setItemField(i,'quantity',Number(e.target.value))} className={`${INPUT_CLS} text-center`} /></td>
                    <td className="px-2 py-2">
                      <select value={editData!.items[i]?.internalName??''} onChange={e => setItemField(i,'internalName',e.target.value)} className={INPUT_CLS}>
                        <option value="">-</option>
                        {internalNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      {(editData!.items[i]?.pipeSpec || editData!.items[i]?.sleeveSpec) && (
                        <p className="text-xs text-gray-400 mt-0.5 px-1">{[editData!.items[i]?.pipeSpec, editData!.items[i]?.sleeveSpec].filter(Boolean).join(' / ')}</p>
                      )}
                    </td>
                    <td className="px-2 py-2"><input value={editData!.items[i]?.note??''} onChange={e => setItemField(i,'note',e.target.value)} className={INPUT_CLS} placeholder="비고" /></td>
                    <td className="px-2 py-2 text-center"><button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100">
            <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-[#014A99] hover:underline cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>행 추가</button>
          </div>
        </>
      ) : (
        <>
          {hasMultiMfr && (
            <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
              <button onClick={() => setActiveMfrTab(null)} className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${!activeMfr ? 'border-[#014A99] text-[#014A99]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>전체 ({allItems.length}건)</button>
              {pipeMfrs.map(mfr => <button key={mfr} onClick={() => setActiveMfrTab(mfr)} className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeMfr===mfr ? 'border-[#014A99] text-[#014A99]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{mfr} ({allItems.filter(it=>it.manufacturer===mfr).length}건)</button>)}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100"><tr>
                <th className="px-4 py-2.5 text-left w-10">No</th>
                {showMfrCol && <th className="px-4 py-2.5 text-left w-24">제조사</th>}
                <th className="px-4 py-2.5 text-left">품목명</th>
                <th className="px-4 py-2.5 text-left w-28">규격</th>
                <th className="px-4 py-2.5 text-center w-16">수량</th>
                <th className="px-4 py-2.5 text-left w-52">내부 품명 / 규격</th>
                <th className="px-4 py-2.5 text-right w-28">단가</th>
                <th className="px-4 py-2.5 text-right w-32">공급가액</th>
                <th className="px-4 py-2.5 text-left w-32">비고</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {visibleItems.map((item, i) => {
                  const mfrMap0 = item.manufacturer ? (priceMapByMfr.get(item.manufacturer) ?? priceMap) : priceMap
                  const up = item.unitPrice ?? (discountPct !== null && item.internalName ? lookupSalePrice(mfrMap0, discountPct, item.internalName, item.pipeSpec, item.sleeveSpec) : undefined)
                  const sa = up != null ? up * item.quantity : undefined
                  return (
                    <tr key={i} className="bg-white">
                      <td className="px-4 py-2.5 text-gray-400">{i+1}</td>
                      {showMfrCol && <td className="px-4 py-2.5 text-xs text-gray-500">{item.manufacturer ?? order.manufacturer ?? '-'}</td>}
                      <td className="px-4 py-2.5">{item.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{item.spec}</td>
                      <td className="px-4 py-2.5 text-center">{item.quantity}</td>
                      <td className="px-4 py-2.5">
                        {item.internalName ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-[#014A99]">{item.internalName}</span>
                            {(item.pipeSpec || item.sleeveSpec) && (
                              <span className="text-xs text-gray-400">{[item.pipeSpec, item.sleeveSpec].filter(Boolean).join(' / ')}</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm tabular-nums">{up != null ? <span className="text-gray-600">{up.toLocaleString()}</span> : <span className="text-gray-300 text-xs">-</span>}</td>
                      <td className="px-4 py-2.5 text-right text-sm tabular-nums">{sa != null ? <span className="font-medium text-gray-800">{sa.toLocaleString()}</span> : <span className="text-gray-300 text-xs">-</span>}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{item.note||''}</td>
                    </tr>
                  )
                })}
              </tbody>
              {(() => {
                const total = visibleItems.reduce((sum,item) => {
                  const mfrMap1 = item.manufacturer ? (priceMapByMfr.get(item.manufacturer) ?? priceMap) : priceMap
                  const up = item.unitPrice ?? (discountPct !== null && item.internalName ? lookupSalePrice(mfrMap1, discountPct, item.internalName, item.pipeSpec, item.sleeveSpec) : undefined)
                  return up != null ? sum + up * item.quantity : sum
                }, 0)
                if (!total) return null
                return <tfoot><tr className="bg-gray-50 border-t border-gray-200 font-semibold text-sm">
                  <td colSpan={showMfrCol ? 8 : 7} className="px-4 py-2.5 text-right text-gray-500 text-xs">합계</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{total.toLocaleString()}</td>
                  <td />
                </tr></tfoot>
              })()}
            </table>
          </div>
          {!editMode && (
            <div className="border-t border-gray-100 grid grid-cols-3">
              <div className="px-4 py-3 text-center bg-blue-50/40 border-r border-blue-100">
                <p className="text-xs text-blue-400 font-medium mb-0.5">매출</p>
                <p className="text-sm font-bold text-blue-700">{displaySaleAmount > 0 ? displaySaleAmount.toLocaleString() + '원' : '—'}</p>
                {displaySaleAmount > 0 && <p className="text-xs text-blue-300 mt-0.5">(VAT {Math.round(displaySaleAmount * 1.1).toLocaleString()}원)</p>}
              </div>
              <div className="px-4 py-3 text-center bg-red-50/30 border-r border-red-100">
                <p className="text-xs text-red-400 font-medium mb-0.5">매입</p>
                {order.no_invoice ? (
                  <p className="text-sm text-gray-300 text-xs">미발행</p>
                ) : (order.purchase_amount ?? 0) > 0 ? (
                  <>
                    <p className="text-sm font-bold text-red-600">{((order.purchase_amount ?? 0) + (order.freight ?? 0)).toLocaleString()}원</p>
                    <p className="text-xs text-red-300 mt-0.5">(VAT {Math.round(((order.purchase_amount ?? 0) + (order.freight ?? 0)) * 1.1).toLocaleString()}원)</p>
                  </>
                ) : <p className="text-sm text-gray-300 text-xs">발주 전</p>}
              </div>
              <div className="px-4 py-3 text-center bg-green-50/40">
                <p className="text-xs text-green-500 font-medium mb-0.5">영업이익</p>
                {order.no_invoice ? (
                  <p className="text-sm text-gray-300 text-xs">미발행</p>
                ) : (order.purchase_amount ?? 0) > 0 ? (() => {
                  const profit = displaySaleAmount - ((order.purchase_amount ?? 0) + (order.freight ?? 0))
                  const margin = displaySaleAmount > 0 ? Math.round(profit / displaySaleAmount * 100) : 0
                  return <p className="text-sm font-bold text-green-700">{profit.toLocaleString()}원 <span className="text-xs font-normal text-green-400">({margin}%)</span></p>
                })() : <p className="text-sm text-gray-300 text-xs">—</p>}
              </div>
            </div>
          )}
          {(activeMfr || !hasMultiMfr) && (() => {
            const mfrName = activeMfr ?? pipeMfrs[0] ?? order.manufacturer ?? ''
            if (!mfrName) return null
            return (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-400">{mfrName}</span>
                <button onClick={() => handleDownloadPdf(mfrName)} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>PDF
                </button>
                <button onClick={() => openSendDialog(mfrName)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors cursor-pointer" style={{ backgroundColor:'#014A99' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>발주서 전송
                </button>
                {order.status === '발주' && <span className="text-xs text-amber-600">이미 발주 전송됨</span>}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ─── DuctItemsSection ──────────────────────────────────────────────────────────

interface DuctItemsSectionProps {
  order: Order; editMode: boolean; editData: Order | null; d: Order
  regularItems: DuctItem[]; insulItems: DuctItem[]; totalAmount: number
  setItemField: (idx: number, key: string, val: any) => void
  addItem: () => void; removeItem: (idx: number) => void; setInsulItem: (spec: string, qty: number, price: number) => void
  openSendDialog: (mfr: string) => void; handleDownloadPdf: () => void; downloading: boolean
}

function DuctItemsSection({ order, editMode, editData, d, regularItems, insulItems, totalAmount, setItemField, addItem, removeItem, setInsulItem, openSendDialog, handleDownloadPdf, downloading }: DuctItemsSectionProps) {
  const allDuctItems = d.items as DuctItem[]
  const editRegular = editMode && editData ? (editData.items as DuctItem[]).filter(it => it.type !== '차열재') : []
  const editInsul   = editMode && editData ? (editData.items as DuctItem[]).filter(it => it.type === '차열재') : []
  const STATUS_COLORS_DUCT: Record<string, string> = { '입상':'bg-blue-50 text-blue-700','벽체':'bg-violet-50 text-violet-700' }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-500 border-b border-gray-200">
        <span>품목 목록 ({regularItems.length}건)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100"><tr>
            <th className="px-3 py-2.5 text-center w-10">No</th>
            <th className="px-3 py-2.5 text-center w-16">품명</th>
            <th className="px-3 py-2.5 text-right w-20">가로(mm)</th>
            <th className="px-3 py-2.5 text-right w-20">세로(mm)</th>
            <th className="px-3 py-2.5 text-right w-20">M/개</th>
            <th className="px-3 py-2.5 text-right w-16">수량</th>
            <th className="px-3 py-2.5 text-right w-24">단가</th>
            <th className="px-3 py-2.5 text-right w-28">공급가액</th>
            <th className="px-3 py-2.5 text-left">비고</th>
            {editMode && <th className="w-8" />}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {regularItems.length === 0 && !editMode && <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-400">품목 없음</td></tr>}
            {editMode ? editRegular.map((item, i) => {
              const origIdx = allDuctItems.indexOf(item)
              return (
                <tr key={origIdx} className="bg-white">
                  <td className="px-3 py-2 text-gray-400 text-xs text-center">{i+1}</td>
                  <td className="px-2 py-2"><select value={item.type} onChange={e => setItemField(origIdx,'type',e.target.value)} className={INPUT_CLS}><option value="입상">입상</option><option value="벽체">벽체</option></select></td>
                  <td className="px-2 py-2"><input type="number" min={0} value={item.width??0} onChange={e => setItemField(origIdx,'width',Number(e.target.value))} className={`${INPUT_CLS} text-right`} /></td>
                  <td className="px-2 py-2"><input type="number" min={0} value={item.height??0} onChange={e => setItemField(origIdx,'height',Number(e.target.value))} className={`${INPUT_CLS} text-right`} /></td>
                  <td className="px-3 py-2 text-right text-gray-500 text-xs">{item.perimeter?.toFixed(2)??'0.00'}</td>
                  <td className="px-2 py-2"><input type="number" min={1} value={item.quantity} onChange={e => setItemField(origIdx,'quantity',Number(e.target.value))} className={`${INPUT_CLS} text-right`} /></td>
                  <td className="px-2 py-2"><input type="number" min={0} value={item.unit_price} onChange={e => setItemField(origIdx,'unit_price',Number(e.target.value))} className={`${INPUT_CLS} text-right`} /></td>
                  <td className="px-3 py-2 text-right text-gray-700 font-medium text-xs">{(item.amount??0).toLocaleString('ko-KR')}</td>
                  <td className="px-2 py-2"><input value={item.note??''} onChange={e => setItemField(origIdx,'note',e.target.value)} className={INPUT_CLS} placeholder="비고" /></td>
                  <td className="px-2 py-2 text-center"><button onClick={() => removeItem(origIdx)} className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                </tr>
              )
            }) : regularItems.map((item, i) => (
              <tr key={i} className="bg-white">
                <td className="px-3 py-2.5 text-gray-400 text-center">{i+1}</td>
                <td className="px-3 py-2.5 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS_DUCT[item.type]??''}`}>{item.type}</span></td>
                <td className="px-3 py-2.5 text-right text-gray-600">{item.width?.toLocaleString()??0}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{item.height?.toLocaleString()??0}</td>
                <td className="px-3 py-2.5 text-right text-gray-500">{item.perimeter?.toFixed(2)??'0.00'}</td>
                <td className="px-3 py-2.5 text-right">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">{(item.unit_price??0).toLocaleString('ko-KR')}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{(item.amount??0).toLocaleString('ko-KR')}</td>
                <td className="px-3 py-2.5 text-gray-400 text-xs">{item.note||'—'}</td>
              </tr>
            ))}
            {editMode && <tr><td colSpan={10} className="px-3 py-2"><button onClick={addItem} className="text-xs text-[#014A99] hover:underline flex items-center gap-1 cursor-pointer"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>품목 추가</button></td></tr>}
            {!editMode && totalAmount > 0 && <tr className="bg-gray-50 font-semibold"><td colSpan={7} className="px-3 py-2.5 text-right text-xs text-gray-500">합계</td><td className="px-3 py-2.5 text-right text-gray-800 tabular-nums">{totalAmount.toLocaleString('ko-KR')}원</td><td /></tr>}
          </tbody>
        </table>
      </div>

      {/* 차열재 섹션 */}
      {isProfireManufacturer(d.manufacturer) && (editMode || insulItems.length > 0) && (
        <div className="border-t border-orange-100">
          <div className="px-4 py-2.5 bg-orange-50/70"><span className="text-xs font-semibold text-orange-700">차열재</span></div>
          <table className="w-full text-sm">
            <thead className="bg-orange-50/50 text-xs text-orange-600 border-b border-orange-100"><tr>
              <th className="px-4 py-2 text-left">품명</th>
              <th className="px-3 py-2 text-right w-28">수량 (롤)</th>
              <th className="px-3 py-2 text-right w-32">단가</th>
              <th className="px-3 py-2 text-right w-32">금액</th>
            </tr></thead>
            <tbody>
              {[{ label:'50T×400×3.6M', spec:'50T×400×3.6M' }, { label:'25T×400×7.2M', spec:'25T×400×7.2M' }].map(({ label, spec }) => {
                const ins = (editMode ? editInsul : insulItems).find(it => it.spec === spec)
                const qty = ins?.quantity ?? 0; const price = ins?.unit_price ?? 0
                if (!editMode && qty === 0) return null
                return (
                  <tr key={spec} className="border-b border-orange-100">
                    <td className="px-4 py-2.5 text-orange-800 font-medium">{label}</td>
                    <td className="px-3 py-2">
                      {editMode ? <input type="number" min={0} value={qty||''} onChange={e => setInsulItem(spec,Number(e.target.value)||0,price)} onFocus={e=>e.target.select()} className="border border-orange-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-orange-400 w-full bg-white" placeholder="0" /> : <span>{qty}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-orange-700 tabular-nums">{price > 0 ? price.toLocaleString('ko-KR') : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-orange-800">{qty > 0 && price > 0 ? (qty*price).toLocaleString('ko-KR') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 매출 / 매입 */}
      {!editMode && (() => {
        const sale = order.no_invoice ? 0 : (order.sale_amount ?? 0) + (order.freight ?? 0)
        const cost = order.no_invoice ? 0 : (order.purchase_amount ?? 0) + (order.freight ?? 0)
        const profit = !order.no_invoice && (order.purchase_amount ?? 0) > 0 ? (order.sale_amount ?? 0) - (order.purchase_amount ?? 0) : null
        const margin = profit != null && sale > 0 ? Math.round(profit / sale * 100) : null
        return (
          <div className="border-t border-gray-100 grid grid-cols-3">
            <div className="px-4 py-3 text-center bg-blue-50/40 border-r border-blue-100">
              <p className="text-xs text-blue-400 font-medium mb-0.5">매출</p>
              {order.no_invoice
                ? <p className="text-sm text-gray-300 text-xs">미발행</p>
                : <><p className="text-sm font-bold text-blue-700">{sale > 0 ? sale.toLocaleString() + '원' : '—'}</p>
                  {sale > 0 && <p className="text-xs text-blue-300 mt-0.5">(VAT {Math.round(sale * 1.1).toLocaleString()}원)</p>}</>
              }
            </div>
            <div className="px-4 py-3 text-center bg-red-50/30 border-r border-red-100">
              <p className="text-xs text-red-400 font-medium mb-0.5">매입</p>
              {order.no_invoice ? (
                <p className="text-sm text-gray-300 text-xs">미발행</p>
              ) : (order.purchase_amount ?? 0) > 0 ? (
                <>
                  <p className="text-sm font-bold text-red-600">{cost.toLocaleString()}원</p>
                  <p className="text-xs text-red-300 mt-0.5">(VAT {Math.round(cost * 1.1).toLocaleString()}원)</p>
                </>
              ) : <p className="text-sm text-gray-300 text-xs">발주 전</p>}
            </div>
            <div className="px-4 py-3 text-center bg-green-50/40">
              <p className="text-xs text-green-500 font-medium mb-0.5">영업이익</p>
              {order.no_invoice ? (
                <p className="text-sm text-gray-300 text-xs">미발행</p>
              ) : profit != null
                ? <p className="text-sm font-bold text-green-700">{profit.toLocaleString()}원{margin != null && <span className="text-xs font-normal text-green-400 ml-1">({margin}%)</span>}</p>
                : <p className="text-sm text-gray-300 text-xs">—</p>}
            </div>
          </div>
        )
      })()}

      {/* 발주 액션 */}
      {!editMode && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-400">{order.manufacturer}</span>
          <button onClick={handleDownloadPdf} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>PDF 다운로드
          </button>
          <button onClick={() => openSendDialog(order.manufacturer)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors cursor-pointer" style={{ backgroundColor:'#014A99' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>발주서 전송
          </button>
          {order.status === '발주' && <span className="text-xs text-amber-600">이미 발주 전송됨</span>}
        </div>
      )}
    </div>
  )
}
