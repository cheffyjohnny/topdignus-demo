import type { OrderFormData } from '@/lib/excel-generator'
import type { enrichOrderItem } from '@/lib/order-enrichment'

type EnrichedItem = ReturnType<typeof enrichOrderItem>

const FREIGHT_PROD_CD = 'DF01'

interface EcountOrder {
  id: string
  order_no?: string
  vendor: string
  manufacturer?: string
  sale_pct?: number
  order_client: string | null
  delivery_dest?: string | null
  project: string
  address: string
  contact_name: string
  contact_phone: string
  order_date: string
  delivery_date: string
  author: string
  notes?: string | null
  items: EnrichedItem[]
  priceMap?: Map<string, number>
  pricesByMfr?: Map<string, Map<string, number>>
  freight?: number
  no_invoice?: boolean
}

interface EcountSession {
  sessionId: string
  apiBase: string  // 로그인 응답 HOST_URL 기반 (zone 포함)
}

// 모듈 수준 세션 캐시 (서버 프로세스 재시작 전까지 유지)
let cachedSession: EcountSession | null = null

// Cloudflare Worker 릴레이 (ECOUNT_WORKER_URL 설정 시 Worker를 통해 요청 — 고정 IP 확보)
async function ecountFetch(url: string, init: RequestInit): Promise<Response> {
  const workerUrl = process.env.ECOUNT_WORKER_URL
  if (!workerUrl) return fetch(url, init)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Target-Url': url,
  }
  if (process.env.ECOUNT_WORKER_SECRET) {
    headers['X-Worker-Secret'] = process.env.ECOUNT_WORKER_SECRET
  }
  return fetch(workerUrl, { method: 'POST', headers, body: init.body })
}

async function fetchZone(comCode: string): Promise<string> {
  console.log('[ecount] Zone 조회 요청 → https://oapi.ecount.com/OAPI/V2/Zone')
  const res = await ecountFetch('https://oapi.ecount.com/OAPI/V2/Zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ COM_CODE: comCode }),
  })
  const json = await res.json().catch(() => null)
  console.log('[ecount] Zone 응답:', JSON.stringify(json, null, 2))
  const zone = json?.Data?.ZONE
  if (!zone) throw new Error('[ecount] Zone 조회 실패 — ZONE 없음')
  console.log('[ecount] Zone:', zone)
  return zone
}

async function login(): Promise<EcountSession> {
  throw new Error('[ecount] 데모 버전에서는 ECOUNT 연동이 지원되지 않습니다.')
}

async function getSession(forceRefresh = false): Promise<EcountSession> {
  if (!forceRefresh && cachedSession) return cachedSession
  cachedSession = await login()
  return cachedSession
}

function toEcountDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10).replace(/-/g, '')
}

function getProdCd(internalName: string, name: string): string {
  const src = internalName || name
  if (!src) return ''
  if (src === '수기 금액 추가') return 'Z02'
  if (src.includes('차열재')) return 'B01'
  if (src.includes('실란트')) return 'SE01'
  if (src.includes('원형덕트') || src.includes('사각덕트')) return 'SD01'
  if (src.includes('입상')) return 'VP01'
  if (src.includes('벽체')) return 'WP01'
  // 섹스티아/PJS/조절포인트/마감링 등 그 외 배관 부속 품목 catch-all
  return 'PH01'
}

async function doSaveOrder(order: EcountOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const riseCount = order.items.filter(i => (i.internalName ?? '').includes('입상')).length
  const wallCount = order.items.filter(i => (i.internalName ?? '').includes('벽체')).length

  const header = {
    IO_DATE: toEcountDate(order.order_date),
    UPLOAD_SER_NO: '1',
    CUST_DES: order.vendor,
    EMP_CD: order.author,
    WH_CD: '법인',
    TIME_DATE: toEcountDate(order.delivery_date),
    U_MEMO1: order.project,
    U_MEMO2: order.address,
    U_MEMO3: order.manufacturer ?? '필립산업',
    U_MEMO4: order.contact_name,
    U_MEMO5: order.delivery_dest ?? '',
    DOC_NO:        order.order_no ?? order.id,
    ADD_TXT_01_T:  order.contact_phone,
    ADD_NUM_01_T: riseCount > 0 ? String(riseCount) : '',
    ADD_NUM_02_T: wallCount > 0 ? String(wallCount) : '',
    U_TXT1: order.notes ?? '',
  }

  console.log('[ecount] header:', JSON.stringify(header, null, 2))
  console.log('[ecount] 전체 품목 수:', order.items.length)

  const mappableItems = order.items.filter(item => {
    const code = getProdCd(item.internalName ?? '', item.name)
    if (!code) {
      console.warn(`[ecount] PROD_CD 없음 (skip): ${item.internalName ?? item.name}`)
    } else {
      console.log(`[ecount] 품목 매핑: "${item.internalName ?? item.name}" → PROD_CD=${code}`)
    }
    return !!code
  })

  if (mappableItems.length === 0) {
    console.warn('[ecount] 매핑 가능한 품목 없음, ECOUNT 등록 skip')
    throw new Error('NO_MAPPABLE_ITEMS')
  }

  const SaleOrderList = mappableItems.map(item => {
    const isManual = (item.internalName ?? '') === '수기 금액 추가'
    const prodKey = item.internalName
      ? item.pipeSpec && item.sleeveSpec
        ? `${item.internalName}_${item.pipeSpec}_${item.sleeveSpec}`
        : item.pipeSpec
          ? `${item.internalName}_${item.pipeSpec}`
          : `${item.internalName}_${item.spec ?? ''}`
      : ''
    const itemMfr = (item as any).manufacturer ?? '필립산업'
    const mfrMap = order.pricesByMfr?.get(itemMfr) ?? order.pricesByMfr?.get('필립산업') ?? order.priceMap
    const unitPrice = mfrMap?.get(prodKey) ?? 0
    const salePrice = isManual
      ? ((item as any).unitPrice ?? 0)
      : Math.floor(unitPrice * 2 * (order.sale_pct ?? 100) / 1000) * 10
    const supplyAmt = salePrice * item.quantity
    const vatAmt    = Math.round(supplyAmt * 0.1)
    console.log(`[ecount] 품목 상세: prodKey="${prodKey}" unitPrice=${unitPrice} salePrice=${salePrice} QTY=${item.quantity} SUPPLY=${supplyAmt} VAT=${vatAmt}`)
    return {
      BulkDatas: {
        ...header,
        PROD_CD:     getProdCd(item.internalName ?? '', item.name),
        PROD_DES:    item.name || item.displayName || item.internalName || '',
        SIZE_DES:    item.spec ?? '',
        QTY:         String(item.quantity),
        PRICE:       String(salePrice),
        SUPPLY_AMT:  String(supplyAmt),
        VAT_AMT:     String(vatAmt),
        ITEM_TIME_DATE: toEcountDate(order.delivery_date),
        REMARKS:     item.note ?? '',
        ...(isManual && { REF_DES: '관리자 포털에서 상세 내용 참조' }),
      },
    }
  })

  const url = `${apiBase}/OAPI/V2/SaleOrder/SaveSaleOrder?SESSION_ID=${sessionId}`
  console.log('[ecount] 요청 URL:', `${apiBase}/OAPI/V2/SaleOrder/SaveSaleOrder?SESSION_ID=****`)
  console.log('[ecount] 요청 body:', JSON.stringify({ SaleOrderList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SaleOrderList }),
  })
}

async function doSavePurchase(order: EcountOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const mfr = order.manufacturer ?? '필립산업'

  const header = {
    IO_DATE:       toEcountDate(order.order_date),
    UPLOAD_SER_NO: '1',
    CUST_DES:      mfr,
    EMP_CD:        order.author,
    WH_CD:         '00002',
    DOC_NO:        order.order_no ?? order.id, // 수주서 번호
    U_MEMO1:       order.order_client ?? '',   // 발주의뢰처
    U_MEMO2:       order.project,              // 현장명
    U_MEMO3:       order.address,              // 현장주소
    U_MEMO4:       mfr,                        // 제조사
    U_MEMO5:       order.contact_name,         // 인수자
    U_TXT1:        order.notes ?? '',
  }

  const mappableItems = order.items.filter(item => {
    const code = getProdCd(item.internalName ?? '', item.name)
    if (!code) console.warn(`[ecount] PROD_CD 없음 (skip): ${item.internalName ?? item.name}`)
    else console.log(`[ecount] 구매 품목 매핑: "${item.internalName ?? item.name}" → PROD_CD=${code}`)
    return !!code
  })

  const PurchasesList = mappableItems.map(item => {
    const isManual = (item.internalName ?? '') === '수기 금액 추가'
    const prodKey = item.internalName
      ? item.pipeSpec && item.sleeveSpec
        ? `${item.internalName}_${item.pipeSpec}_${item.sleeveSpec}`
        : item.pipeSpec
          ? `${item.internalName}_${item.pipeSpec}`
          : `${item.internalName}_${item.spec ?? ''}`
      : ''
    const itemMfr = (item as any).manufacturer ?? '필립산업'
    const mfrMap = order.pricesByMfr?.get(itemMfr) ?? order.pricesByMfr?.get('필립산업') ?? order.priceMap
    const rawUnitPrice = isManual ? ((item as any).unitPrice ?? 0) : (mfrMap?.get(prodKey) ?? 0)
    const unitPrice  = order.no_invoice ? 0 : rawUnitPrice
    const supplyAmt  = unitPrice * item.quantity
    const vatAmt     = Math.round(supplyAmt * 0.1)
    return {
      BulkDatas: {
        ...header,
        PROD_CD:    getProdCd(item.internalName ?? '', item.name),
        PROD_DES:   item.internalName ?? item.name,
        SIZE_DES:   item.spec ?? '',
        QTY:        String(item.quantity),
        PRICE:      String(unitPrice),
        SUPPLY_AMT: String(supplyAmt),
        VAT_AMT:    String(vatAmt),
        ...(isManual && { REF_DES: '관리자 포털에서 상세 내용 참조' }),
      },
    }
  })

  if (order.freight && order.freight > 0) {
    PurchasesList.push({
      BulkDatas: {
        ...header,
        PROD_CD:    FREIGHT_PROD_CD,
        PROD_DES:   '운임비',
        SIZE_DES:   '',
        QTY:        '1',
        PRICE:      String(order.freight),
        SUPPLY_AMT: String(order.freight),
        VAT_AMT:    String(Math.round(order.freight * 0.1)),
      },
    })
  }

  if (PurchasesList.length === 0) {
    console.warn('[ecount] 매핑 가능한 품목 없음, 구매 등록 skip')
    throw new Error('NO_MAPPABLE_ITEMS')
  }

  const url = `${apiBase}/OAPI/V2/Purchases/SavePurchases?SESSION_ID=${sessionId}`
  console.log('[ecount] 구매입력 URL:', `${apiBase}/OAPI/V2/Purchases/SavePurchases?SESSION_ID=****`)
  console.log('[ecount] 구매입력 body:', JSON.stringify({ PurchasesList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PurchasesList }),
  })
}

export async function savePurchase(order: EcountOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] savePurchase 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id)

  try {
    const session = await getSession()
    let res = await doSavePurchase(order, session)

    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSavePurchase(order, newSession)
    }

    const text = await res.text().catch(() => '')
    console.log('[ecount] 구매입력 응답 status:', res.status)
    console.log('[ecount] 구매입력 응답 body:', text)
    console.log('━━━ [ECOUNT] savePurchase 완료 ━━━')

    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] savePurchase skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 구매입력 오류:', e.message)
    console.log('━━━ [ECOUNT] savePurchase 실패 ━━━')
    throw e
  }
}

async function doSaveSale(order: EcountOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const riseCount = order.items.filter(i => (i.internalName ?? '').includes('입상')).length
  const wallCount = order.items.filter(i => (i.internalName ?? '').includes('벽체')).length

  const header = {
    IO_DATE: toEcountDate(order.delivery_date) || toEcountDate(new Date().toISOString().slice(0, 10)),
    UPLOAD_SER_NO: '1',
    CUST_DES: order.vendor,
    EMP_CD: order.author,
    WH_CD: '법인',
    U_MEMO1: order.project,
    U_MEMO2: order.address,
    U_MEMO3: order.manufacturer ?? '필립산업',
    U_MEMO4: order.contact_name,
    U_MEMO5: order.delivery_dest ?? '',
    DOC_NO:       order.order_no ?? order.id,
    ADD_TXT_01_T: order.contact_phone,
    ADD_NUM_01_T: riseCount > 0 ? String(riseCount) : '',
    ADD_NUM_02_T: wallCount > 0 ? String(wallCount) : '',
    U_TXT1: order.notes ?? '',
  }

  const mappableItems = order.items.filter(item => {
    const code = getProdCd(item.internalName ?? '', item.name)
    if (!code) console.warn(`[ecount] PROD_CD 없음 (skip): ${item.internalName ?? item.name}`)
    else console.log(`[ecount] 판매 품목 매핑: "${item.internalName ?? item.name}" → PROD_CD=${code}`)
    return !!code
  })

  const SaleList = mappableItems.map(item => {
    const isManual = (item.internalName ?? '') === '수기 금액 추가'
    const prodKey = item.internalName
      ? item.pipeSpec && item.sleeveSpec
        ? `${item.internalName}_${item.pipeSpec}_${item.sleeveSpec}`
        : item.pipeSpec
          ? `${item.internalName}_${item.pipeSpec}`
          : `${item.internalName}_${item.spec ?? ''}`
      : ''
    const itemMfr = (item as any).manufacturer ?? '필립산업'
    const mfrMap = order.pricesByMfr?.get(itemMfr) ?? order.pricesByMfr?.get('필립산업') ?? order.priceMap
    const unitPrice = mfrMap?.get(prodKey) ?? 0
    const rawSalePrice = isManual
      ? ((item as any).unitPrice ?? 0)
      : Math.floor(unitPrice * 2 * (order.sale_pct ?? 100) / 1000) * 10
    const salePrice = order.no_invoice ? 0 : rawSalePrice
    const supplyAmt = salePrice * item.quantity
    const vatAmt    = Math.round(supplyAmt * 0.1)
    console.log(`[ecount] 판매 품목 상세: prodKey="${prodKey}" unitPrice=${unitPrice} salePrice=${salePrice} QTY=${item.quantity} SUPPLY=${supplyAmt} VAT=${vatAmt}`)
    return {
      BulkDatas: {
        ...header,
        PROD_CD:    getProdCd(item.internalName ?? '', item.name),
        PROD_DES:   item.name,
        SIZE_DES:   item.spec ?? '',
        QTY:        String(item.quantity),
        PRICE:      String(salePrice),
        SUPPLY_AMT: String(supplyAmt),
        VAT_AMT:    String(vatAmt),
        ...(isManual && { REF_DES: '관리자 포털에서 상세 내용 참조' }),
      },
    }
  })

  if (order.freight && order.freight > 0) {
    SaleList.push({
      BulkDatas: {
        ...header,
        PROD_CD:    FREIGHT_PROD_CD,
        PROD_DES:   '운임비',
        SIZE_DES:   '',
        QTY:        '1',
        PRICE:      String(order.freight),
        SUPPLY_AMT: String(order.freight),
        VAT_AMT:    String(Math.round(order.freight * 0.1)),
      },
    })
  }

  if (SaleList.length === 0) {
    console.warn('[ecount] 매핑 가능한 품목 없음, 판매입력 skip')
    throw new Error('NO_MAPPABLE_ITEMS')
  }

  const url = `${apiBase}/OAPI/V2/Sale/SaveSale?SESSION_ID=${sessionId}`
  console.log('[ecount] 판매입력 URL:', `${apiBase}/OAPI/V2/Sale/SaveSale?SESSION_ID=****`)
  console.log('[ecount] 판매입력 body:', JSON.stringify({ SaleList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SaleList }),
  })
}

export async function saveSale(order: EcountOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveSale 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id)
  console.log('[ecount] vendor:', order.vendor)

  try {
    const session = await getSession()
    let res = await doSaveSale(order, session)

    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveSale(order, newSession)
    }

    const text = await res.text().catch(() => '')
    console.log('[ecount] 판매입력 응답 status:', res.status)
    console.log('[ecount] 판매입력 응답 body:', text)
    console.log('━━━ [ECOUNT] saveSale 완료 ━━━')

    if (!res.ok) {
      console.error('[ecount] API 오류', res.status, text)
      throw new Error(`ECOUNT API error ${res.status}`)
    }
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveSale skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 판매입력 오류:', e.message)
    console.log('━━━ [ECOUNT] saveSale 실패 ━━━')
    throw e
  }
}

// ─── Quotation (견적서) ───────────────────────────────────────────────────

export interface EcountQuoteItem {
  prodCd?: string       // set directly for duct items; auto-resolved via getProdCd for pipe items
  name: string          // PROD_DES
  internalName?: string // used by getProdCd when prodCd not provided
  spec?: string         // SIZE_DES
  quantity: number
  unit_price: number    // PRICE per unit (effective sale price)
  supply_amt?: number   // override for SUPPLY_AMT (e.g. duct per-m pricing)
}

export interface EcountQuoteData {
  id: string
  quote_no?: string
  vendor: string
  manufacturer?: string
  project?: string | null
  address?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  order_date?: string | null
  delivery_date?: string | null
  agree_date?: string | null  // 유효기간 (AGREE_TERM)
  author?: string | null
  notes?: string | null
  items: EcountQuoteItem[]
}

async function doSaveQuotation(quote: EcountQuoteData, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const header = {
    IO_DATE:       toEcountDate(quote.order_date),
    UPLOAD_SER_NO: '1',
    CUST_DES:      quote.vendor,
    EMP_CD:        quote.author ?? '',
    WH_CD:         '법인',
    AGREE_TERM:    toEcountDate(quote.agree_date ?? quote.delivery_date),
    U_MEMO1:       quote.project ?? '',
    U_MEMO2:       quote.address ?? '',
    U_MEMO3:       quote.manufacturer ?? '필립산업',
    U_MEMO4:       quote.contact_name ?? '',
    U_MEMO5:       quote.vendor,
    U_TXT1:        quote.notes ?? '',
  }

  const mappableItems = quote.items.filter(item => {
    const code = item.prodCd ?? getProdCd(item.internalName ?? '', item.name)
    if (!code) console.warn(`[ecount] 견적서 PROD_CD 없음 (skip): ${item.internalName ?? item.name}`)
    return !!code
  })

  if (mappableItems.length === 0) {
    console.warn('[ecount] 견적서 매핑 가능한 품목 없음, skip')
    throw new Error('NO_MAPPABLE_ITEMS')
  }

  const QuotationList = mappableItems.map(item => {
    const prodCd = item.prodCd ?? getProdCd(item.internalName ?? '', item.name)
    const isManual = (item.internalName ?? '') === '수기 금액 추가' || prodCd === 'Z02'
    const isDuctItem = !!item.prodCd
    const supplyAmt = item.supply_amt ?? Math.round(item.unit_price * item.quantity)
    const vatAmt = Math.round(supplyAmt * 0.1)
    return {
      BulkDatas: {
        ...header,
        PROD_CD:       prodCd,
        PROD_DES:      isManual ? '수기 금액 추가' : item.name,
        SIZE_DES:      item.spec ?? '',
        QTY:           String(item.quantity),
        PRICE:         String(item.unit_price),
        SUPPLY_AMT:    String(supplyAmt),
        VAT_AMT:       String(vatAmt),
        ITEM_TIME_DATE: toEcountDate(quote.delivery_date),
        IO_TYPE:       '부가세율 적용',
        REMARKS:       isDuctItem ? item.name : (quote.manufacturer ?? ''),
        ...(isManual && { REF_DES: `관리자 포털 참조 (견적서 ${quote.quote_no ?? quote.id.slice(0, 8)})` }),
      },
    }
  })

  const url = `${apiBase}/OAPI/V2/Quotation/SaveQuotation?SESSION_ID=${sessionId}`
  console.log('[ecount] 견적서 URL:', `${apiBase}/OAPI/V2/Quotation/SaveQuotation?SESSION_ID=****`)
  console.log('[ecount] 견적서 body:', JSON.stringify({ QuotationList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ QuotationList }),
  })
}

// ─── Duct SaleOrder ──────────────────────────────────────────────────────────

interface EcountDuctItem {
  type: '입상' | '벽체' | '차열재' | '수기 금액 추가'
  width?: number
  height?: number
  quantity: number
  unit_price: number
  note?: string | null
  spec?: string | null
}

export interface EcountDuctOrder {
  id: string
  order_no?: string | null
  customer_name: string
  manufacturer: string
  project?: string | null
  address?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  order_date?: string | null
  delivery_date?: string | null
  author?: string | null
  notes?: string | null
  delivery_dest?: string | null
  items: EcountDuctItem[]
  riser_purchase_price?: number
  wall_purchase_price?: number
  insul_50t_purchase_price?: number
  insul_25t_purchase_price?: number
  freight?: number
  no_invoice?: boolean
}

async function doSaveDuctOrder(order: EcountDuctOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const header = {
    IO_DATE:       toEcountDate(order.order_date),
    UPLOAD_SER_NO: '1',
    CUST_DES:      order.customer_name,
    EMP_CD:        order.author ?? '',
    WH_CD:         '법인',
    TIME_DATE:     toEcountDate(order.delivery_date),
    U_MEMO1:       order.project ?? '',
    U_MEMO2:       order.address ?? '',
    U_MEMO3:       order.manufacturer,
    U_MEMO4:          order.contact_name ?? '',
    U_MEMO5:          order.delivery_dest ?? '',
    DOC_NO:           order.order_no ?? order.id,
    ADD_TXT_01_T:     order.contact_phone ?? '',
    ADD_LTXT_01_T:    order.notes ?? '',
  }

  const ductItems   = order.items.filter(i => (i.type === '입상' || i.type === '벽체') && ((i.width ?? 0) + (i.height ?? 0)) > 0)
  const insulItems  = order.items.filter(i => i.type === '차열재' && (i.quantity ?? 0) > 0)
  const manualItems = order.items.filter(i => i.type === '수기 금액 추가' && (i.quantity ?? 0) > 0)

  const SaleOrderList = [
    ...ductItems.map(item => {
      const perimeterM = Math.round(((item.width ?? 0) + (item.height ?? 0)) * 2 / 1000 * 1000) / 1000
      const supplyAmt  = Math.round(item.unit_price * perimeterM * item.quantity)
      const vatAmt     = Math.round(supplyAmt * 0.1)
      console.log(`[ecount] 덕트 품목: ${item.type} ${item.width}*${item.height} qty=${item.quantity} perimeterM=${perimeterM} price=${item.unit_price} supply=${supplyAmt}`)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    item.type === '입상' ? 'FD01' : 'WD01',
          PROD_DES:   item.type,
          SIZE_DES:   `${item.width}*${item.height}`,
          QTY:        String(item.quantity),
          PRICE:      String(item.unit_price),
          ADD_NUM_01: String(perimeterM),
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    item.note ?? '',
        },
      }
    }),
    ...insulItems.map(item => {
      const supplyAmt = Math.round(item.unit_price * item.quantity)
      const vatAmt    = Math.round(supplyAmt * 0.1)
      console.log(`[ecount] 차열재 품목: ${item.spec} qty=${item.quantity} price=${item.unit_price} supply=${supplyAmt}`)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    'B01',
          PROD_DES:   '차열재',
          SIZE_DES:   item.spec ?? '',
          QTY:        String(item.quantity),
          PRICE:      String(item.unit_price),
          ADD_NUM_01: '',
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    '',
        },
      }
    }),
    ...manualItems.map(item => {
      const supplyAmt = item.unit_price * item.quantity
      const vatAmt    = Math.round(supplyAmt * 0.1)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    'Z02',
          PROD_DES:   item.note ?? '수기 금액',
          SIZE_DES:   '',
          QTY:        String(item.quantity),
          PRICE:      String(item.unit_price),
          ADD_NUM_01: '',
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    '',
          REF_DES:    '관리자 포털에서 상세 내용 참조',
        },
      }
    }),
  ]

  if (SaleOrderList.length === 0) throw new Error('NO_MAPPABLE_ITEMS')

  const url = `${apiBase}/OAPI/V2/SaleOrder/SaveSaleOrder?SESSION_ID=${sessionId}`
  console.log('[ecount] 덕트 주문입력 URL:', `${apiBase}/OAPI/V2/SaleOrder/SaveSaleOrder?SESSION_ID=****`)
  console.log('[ecount] 덕트 주문입력 body:', JSON.stringify({ SaleOrderList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SaleOrderList }),
  })
}

async function doSaveDuctPurchase(order: EcountDuctOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const custDes = order.manufacturer.includes('프로화이어') ? '프로화이어' : order.manufacturer

  const header = {
    IO_DATE:       toEcountDate(order.order_date),
    UPLOAD_SER_NO: '1',
    CUST_DES:      custDes,
    EMP_CD:        order.author ?? '',
    WH_CD:         '00002',
    DOC_NO:        order.order_no ?? order.id,
    U_MEMO1:       order.customer_name,       // 발주의뢰처
    U_MEMO2:       order.project ?? '',       // 현장명
    U_MEMO3:       order.address ?? '',       // 현장주소
    U_MEMO4:       custDes,                   // 제조사
    U_MEMO5:       order.contact_name ?? '',  // 인수자
    ADD_TXT_01_T:  order.contact_phone ?? '',
    ADD_LTXT_01_T: order.notes ?? '',
  }

  const ductItems   = order.items.filter(i => (i.type === '입상' || i.type === '벽체') && ((i.width ?? 0) + (i.height ?? 0)) > 0)
  const insulItems  = order.items.filter(i => i.type === '차열재' && (i.quantity ?? 0) > 0)
  const manualItems = order.items.filter(i => i.type === '수기 금액 추가' && (i.quantity ?? 0) > 0)

  const PurchasesList = [
    ...ductItems.map(item => {
      const rawPrice = item.type === '입상'
        ? (order.riser_purchase_price ?? item.unit_price)
        : (order.wall_purchase_price ?? item.unit_price)
      const purchasePrice = order.no_invoice ? 0 : rawPrice
      const perimeterM = Math.round(((item.width ?? 0) + (item.height ?? 0)) * 2 / 1000 * 1000) / 1000
      const supplyAmt  = Math.round(purchasePrice * perimeterM * item.quantity)
      const vatAmt     = Math.round(supplyAmt * 0.1)
      console.log(`[ecount] 덕트 구매 품목: ${item.type} ${item.width}*${item.height} qty=${item.quantity} perimeterM=${perimeterM} price=${purchasePrice} supply=${supplyAmt}`)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    item.type === '입상' ? 'FD01' : 'WD01',
          PROD_DES:   item.type,
          SIZE_DES:   `${item.width}*${item.height}`,
          QTY:        String(item.quantity),
          PRICE:      String(purchasePrice),
          ADD_NUM_01: String(perimeterM),
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    item.note ?? '',
        },
      }
    }),
    ...insulItems.map(item => {
      const is50T = (item.spec ?? '').includes('50T')
      const rawPrice = is50T
        ? (order.insul_50t_purchase_price ?? item.unit_price)
        : (order.insul_25t_purchase_price ?? item.unit_price)
      const purchasePrice = order.no_invoice ? 0 : rawPrice
      const supplyAmt = Math.round(purchasePrice * item.quantity)
      const vatAmt    = Math.round(supplyAmt * 0.1)
      console.log(`[ecount] 차열재 구매 품목: ${item.spec} qty=${item.quantity} price=${purchasePrice} supply=${supplyAmt}`)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    'B01',
          PROD_DES:   '차열재',
          SIZE_DES:   item.spec ?? '',
          QTY:        String(item.quantity),
          PRICE:      String(purchasePrice),
          ADD_NUM_01: '1',
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    '',
        },
      }
    }),
    ...manualItems.map(item => {
      const price = order.no_invoice ? 0 : item.unit_price
      const supplyAmt = price * item.quantity
      const vatAmt    = Math.round(supplyAmt * 0.1)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    'Z02',
          PROD_DES:   item.note ?? '수기 금액',
          SIZE_DES:   '',
          QTY:        String(item.quantity),
          PRICE:      String(price),
          ADD_NUM_01: '',
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    '',
          REF_DES:    '관리자 포털에서 상세 내용 참조',
        },
      }
    }),
  ]

  if (order.freight && order.freight > 0) {
    PurchasesList.push({
      BulkDatas: {
        ...header,
        PROD_CD:    FREIGHT_PROD_CD,
        PROD_DES:   '운임비',
        SIZE_DES:   '',
        QTY:        '1',
        PRICE:      String(order.freight),
        ADD_NUM_01: '',
        SUPPLY_AMT: String(order.freight),
        VAT_AMT:    String(Math.round(order.freight * 0.1)),
        REMARKS:    '',
      },
    })
  }

  if (PurchasesList.length === 0) throw new Error('NO_MAPPABLE_ITEMS')

  const url = `${apiBase}/OAPI/V2/Purchases/SavePurchases?SESSION_ID=${sessionId}`
  console.log('[ecount] 덕트 구매입력 URL:', `${apiBase}/OAPI/V2/Purchases/SavePurchases?SESSION_ID=****`)
  console.log('[ecount] 덕트 구매입력 body:', JSON.stringify({ PurchasesList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PurchasesList }),
  })
}

export async function saveDuctPurchase(order: EcountDuctOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveDuctPurchase 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id, '/ manufacturer:', order.manufacturer)
  try {
    const session = await getSession()
    let res = await doSaveDuctPurchase(order, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveDuctPurchase(order, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 덕트 구매입력 응답 status:', res.status)
    console.log('[ecount] 덕트 구매입력 응답 body:', text)
    console.log('━━━ [ECOUNT] saveDuctPurchase 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveDuctPurchase skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 덕트 구매입력 오류:', e.message)
    console.log('━━━ [ECOUNT] saveDuctPurchase 실패 ━━━')
    throw e
  }
}

async function doSaveDuctSale(order: EcountDuctOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const header = {
    IO_DATE:       toEcountDate(order.delivery_date) || toEcountDate(new Date().toISOString().slice(0, 10)),
    UPLOAD_SER_NO: '1',
    CUST_DES:      order.customer_name,
    EMP_CD:        order.author ?? '',
    WH_CD:         '법인',
    TIME_DATE:     toEcountDate(order.delivery_date),
    U_MEMO1:       order.project ?? '',
    U_MEMO2:       order.address ?? '',
    U_MEMO3:       order.manufacturer,
    U_MEMO4:       order.contact_name ?? '',
    U_MEMO5:       order.delivery_dest ?? '',
    DOC_NO:        order.order_no ?? order.id,
    ADD_TXT_01_T:  order.contact_phone ?? '',
    ADD_LTXT_01_T: order.notes ?? '',
  }

  const ductItems   = order.items.filter(i => (i.type === '입상' || i.type === '벽체') && ((i.width ?? 0) + (i.height ?? 0)) > 0)
  const insulItems  = order.items.filter(i => i.type === '차열재' && (i.quantity ?? 0) > 0)
  const manualItems = order.items.filter(i => i.type === '수기 금액 추가' && (i.quantity ?? 0) > 0)

  const SaleList = [
    ...ductItems.map(item => {
      const salePrice  = order.no_invoice ? 0 : item.unit_price
      const perimeterM = Math.round(((item.width ?? 0) + (item.height ?? 0)) * 2 / 1000 * 1000) / 1000
      const supplyAmt  = Math.round(salePrice * perimeterM * item.quantity)
      const vatAmt     = Math.round(supplyAmt * 0.1)
      console.log(`[ecount] 덕트 판매 품목: ${item.type} ${item.width}*${item.height} qty=${item.quantity} perimeterM=${perimeterM} price=${salePrice} supply=${supplyAmt}`)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    item.type === '입상' ? 'FD01' : 'WD01',
          PROD_DES:   item.type,
          SIZE_DES:   `${item.width}*${item.height}`,
          QTY:        String(item.quantity),
          PRICE:      String(salePrice),
          ADD_NUM_01: String(perimeterM),
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    item.note ?? '',
        },
      }
    }),
    ...insulItems.map(item => {
      const salePrice = order.no_invoice ? 0 : item.unit_price
      const supplyAmt = Math.round(salePrice * item.quantity)
      const vatAmt    = Math.round(supplyAmt * 0.1)
      console.log(`[ecount] 차열재 판매 품목: ${item.spec} qty=${item.quantity} price=${salePrice} supply=${supplyAmt}`)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    'B01',
          PROD_DES:   '차열재',
          SIZE_DES:   item.spec ?? '',
          QTY:        String(item.quantity),
          PRICE:      String(salePrice),
          ADD_NUM_01: '',
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    '',
        },
      }
    }),
    ...manualItems.map(item => {
      const price     = order.no_invoice ? 0 : item.unit_price
      const supplyAmt = price * item.quantity
      const vatAmt    = Math.round(supplyAmt * 0.1)
      return {
        BulkDatas: {
          ...header,
          PROD_CD:    'Z02',
          PROD_DES:   item.note ?? '수기 금액',
          SIZE_DES:   '',
          QTY:        String(item.quantity),
          PRICE:      String(price),
          ADD_NUM_01: '',
          SUPPLY_AMT: String(supplyAmt),
          VAT_AMT:    String(vatAmt),
          REMARKS:    '',
          REF_DES:    '관리자 포털에서 상세 내용 참조',
        },
      }
    }),
  ]

  if (order.freight && order.freight > 0) {
    SaleList.push({
      BulkDatas: {
        ...header,
        PROD_CD:    FREIGHT_PROD_CD,
        PROD_DES:   '운임비',
        SIZE_DES:   '',
        QTY:        '1',
        PRICE:      String(order.freight),
        ADD_NUM_01: '',
        SUPPLY_AMT: String(order.freight),
        VAT_AMT:    String(Math.round(order.freight * 0.1)),
        REMARKS:    '',
      },
    })
  }

  if (SaleList.length === 0) throw new Error('NO_MAPPABLE_ITEMS')

  const url = `${apiBase}/OAPI/V2/Sale/SaveSale?SESSION_ID=${sessionId}`
  console.log('[ecount] 덕트 판매입력 URL:', `${apiBase}/OAPI/V2/Sale/SaveSale?SESSION_ID=****`)
  console.log('[ecount] 덕트 판매입력 body:', JSON.stringify({ SaleList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SaleList }),
  })
}

export async function saveDuctSale(order: EcountDuctOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveDuctSale 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id, '/ customer:', order.customer_name)
  try {
    const session = await getSession()
    let res = await doSaveDuctSale(order, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveDuctSale(order, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 덕트 판매입력 응답 status:', res.status)
    console.log('[ecount] 덕트 판매입력 응답 body:', text)
    console.log('━━━ [ECOUNT] saveDuctSale 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveDuctSale skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 덕트 판매입력 오류:', e.message)
    console.log('━━━ [ECOUNT] saveDuctSale 실패 ━━━')
    throw e
  }
}

export async function saveDuctSaleOrder(order: EcountDuctOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveDuctSaleOrder 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id, '/ customer:', order.customer_name)
  try {
    const session = await getSession()
    let res = await doSaveDuctOrder(order, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveDuctOrder(order, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 덕트 주문입력 응답 status:', res.status)
    console.log('[ecount] 덕트 주문입력 응답 body:', text)
    console.log('━━━ [ECOUNT] saveDuctSaleOrder 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveDuctSaleOrder skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 덕트 주문입력 오류:', e.message)
    console.log('━━━ [ECOUNT] saveDuctSaleOrder 실패 ━━━')
    throw e
  }
}

export async function saveQuotation(quote: EcountQuoteData): Promise<{ result: 'ok' | 'skipped' | 'fail'; error?: string }> {
  console.log('━━━ [ECOUNT] saveQuotation 시작 ━━━')
  console.log('[ecount] quote id:', quote.id, '/ vendor:', quote.vendor)
  try {
    const session = await getSession()
    let res = await doSaveQuotation(quote, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveQuotation(quote, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 견적서 응답 status:', res.status)
    console.log('[ecount] 견적서 응답 body:', text)
    console.log('━━━ [ECOUNT] saveQuotation 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT ${res.status}: ${text}`)
    return { result: 'ok' }
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveQuotation skip (매핑 가능한 품목 없음) ━━━')
      return { result: 'skipped' }
    }
    console.error('[ecount] 견적서 등록 오류:', e.message)
    console.log('━━━ [ECOUNT] saveQuotation 실패 ━━━')
    return { result: 'fail', error: e.message }
  }
}

// ─── Customer Registration (거래처 등록) ──────────────────────────────────

const CUST_BULK_FIELDS_BASE = {
  BUSINESS_NO: '', CUST_NAME: '', BOSS_NAME: '', UPTAE: '', JONGMOK: '', TEL: '', EMAIL: '',
  POST_NO: '', ADDR: '', G_GUBUN: '', G_BUSINESS_TYPE: '', G_BUSINESS_CD: '', TAX_REG_ID: '',
  FAX: '', HP_NO: '', DM_POST: '', DM_ADDR: '', REMARKS_WIN: '', GUBUN: '', FOREIGN_FLAG: '',
  EXCHANGE_CODE: '', CUST_GROUP1: '', CUST_GROUP2: '', URL_PATH: '', REMARKS: '', OUTORDER_YN: '',
  IO_CODE_SL_BASE_YN: '', IO_CODE_SL: '', IO_CODE_BY_BASE_YN: '', IO_CODE_BY: '', EMP_CD: '',
  MANAGE_BOND_NO: '', MANAGE_DEBIT_NO: '', CUST_LIMIT: '', O_RATE: '', I_RATE: '', PRICE_GROUP: '',
  PRICE_GROUP2: '', CUST_LIMIT_TERM: '', CONT1: '', CONT2: '', CONT3: '', CONT4: '', CONT5: '', CONT6: '',
  NO_CUST_USER1: '', NO_CUST_USER2: '', NO_CUST_USER3: '',
}

async function doRegisterCustomer(custName: string, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const businessNo = String(Math.floor(10000 + Math.random() * 90000))

  const CustList = [{
    BulkDatas: {
      ...CUST_BULK_FIELDS_BASE,
      BUSINESS_NO: businessNo,
      CUST_NAME: custName,
    },
  }]

  const url = `${apiBase}/OAPI/V2/AccountBasic/SaveBasicCust?SESSION_ID=${sessionId}`
  console.log('[ecount] 거래처 등록 URL:', `${apiBase}/OAPI/V2/AccountBasic/SaveBasicCust?SESSION_ID=****`)
  console.log('[ecount] 거래처 등록 body:', JSON.stringify({ CustList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ CustList }),
  })
}

export async function registerEcountCustomer(custName: string): Promise<void> {
  console.log('━━━ [ECOUNT] registerEcountCustomer 시작 ━━━')
  console.log('[ecount] CUST_NAME:', custName)
  try {
    const session = await getSession()
    let res = await doRegisterCustomer(custName, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doRegisterCustomer(custName, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 거래처 등록 응답 status:', res.status)
    console.log('[ecount] 거래처 등록 응답 body:', text)
    console.log('━━━ [ECOUNT] registerEcountCustomer 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
  } catch (e: any) {
    console.error('[ecount] 거래처 등록 오류:', e.message)
    console.log('━━━ [ECOUNT] registerEcountCustomer 실패 ━━━')
    throw e
  }
}

export async function saveSaleOrder(order: EcountOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveSaleOrder 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id)
  console.log('[ecount] vendor:', order.vendor)

  try {
    const session = await getSession()
    let res = await doSaveOrder(order, session)

    // 인증 오류 시 재로그인 후 1회 재시도
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveOrder(order, newSession)
    }

    const text = await res.text().catch(() => '')
    console.log('[ecount] 응답 status:', res.status)
    console.log('[ecount] 응답 body:', text)
    console.log('━━━ [ECOUNT] saveSaleOrder 완료 ━━━')

    if (!res.ok) {
      console.error('[ecount] API 오류', res.status, text)
      throw new Error(`ECOUNT API error ${res.status}: ${text}`)
    }
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveSaleOrder skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 오류:', e.message)
    console.log('━━━ [ECOUNT] saveSaleOrder 실패 ━━━')
    throw e  // 호출자(route.ts)가 ecountOk를 정확히 판단할 수 있도록 re-throw
  }
}

// ─── Fire Blanket SaleOrder ──────────────────────────────────────────────────

const FIRE_BLANKET_PROD_CD = 'FB01'

interface EcountFireBlanketItem {
  name: string
  spec?: string | null
  quantity: number
  unit_price: number
  note?: string | null
}

export interface EcountFireBlanketOrder {
  id: string
  order_no?: string | null
  customer_name: string
  manufacturer: string
  project?: string | null
  address?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  order_date?: string | null
  delivery_date?: string | null
  author?: string | null
  notes?: string | null
  delivery_dest?: string | null
  items: EcountFireBlanketItem[]
  roll_purchase_price?: number
  freight?: number
  no_invoice?: boolean
}

async function doSaveFireBlanketOrder(order: EcountFireBlanketOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const header = {
    IO_DATE:       toEcountDate(order.order_date),
    UPLOAD_SER_NO: '1',
    CUST_DES:      order.customer_name,
    EMP_CD:        order.author ?? '',
    WH_CD:         '법인',
    TIME_DATE:     toEcountDate(order.delivery_date),
    U_MEMO1:       order.project ?? '',
    U_MEMO2:       order.address ?? '',
    U_MEMO3:       order.manufacturer,
    U_MEMO4:       order.contact_name ?? '',
    U_MEMO5:       order.delivery_dest ?? '',
    DOC_NO:        order.order_no ?? order.id,
    ADD_TXT_01_T:  order.contact_phone ?? '',
    ADD_LTXT_01_T: order.notes ?? '',
  }

  const items = order.items.filter(i => (i.quantity ?? 0) > 0)

  const SaleOrderList = items.map(item => {
    const supplyAmt = Math.round(item.unit_price * item.quantity)
    const vatAmt    = Math.round(supplyAmt * 0.1)
    console.log(`[ecount] 방화포 품목: ${item.name} ${item.spec ?? ''} qty=${item.quantity} price=${item.unit_price} supply=${supplyAmt}`)
    return {
      BulkDatas: {
        ...header,
        PROD_CD:    FIRE_BLANKET_PROD_CD,
        PROD_DES:   item.name,
        SIZE_DES:   item.spec ?? '',
        QTY:        String(item.quantity),
        PRICE:      String(item.unit_price),
        ADD_NUM_01: '',
        SUPPLY_AMT: String(supplyAmt),
        VAT_AMT:    String(vatAmt),
        REMARKS:    item.note ?? '',
      },
    }
  })

  if (SaleOrderList.length === 0) throw new Error('NO_MAPPABLE_ITEMS')

  const url = `${apiBase}/OAPI/V2/SaleOrder/SaveSaleOrder?SESSION_ID=${sessionId}`
  console.log('[ecount] 방화포 주문입력 URL:', `${apiBase}/OAPI/V2/SaleOrder/SaveSaleOrder?SESSION_ID=****`)
  console.log('[ecount] 방화포 주문입력 body:', JSON.stringify({ SaleOrderList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SaleOrderList }),
  })
}

async function doSaveFireBlanketPurchase(order: EcountFireBlanketOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const custDes = order.manufacturer.includes('프로화이어') ? '프로화이어' : order.manufacturer

  const header = {
    IO_DATE:       toEcountDate(order.order_date),
    UPLOAD_SER_NO: '1',
    CUST_DES:      custDes,
    EMP_CD:        order.author ?? '',
    WH_CD:         '00002',
    DOC_NO:        order.order_no ?? order.id,
    U_MEMO1:       order.customer_name,       // 발주의뢰처
    U_MEMO2:       order.project ?? '',       // 현장명
    U_MEMO3:       order.address ?? '',       // 현장주소
    U_MEMO4:       custDes,                   // 제조사
    U_MEMO5:       order.contact_name ?? '',  // 인수자
    ADD_TXT_01_T:  order.contact_phone ?? '',
    ADD_LTXT_01_T: order.notes ?? '',
  }

  const items = order.items.filter(i => (i.quantity ?? 0) > 0)

  const PurchasesList = items.map(item => {
    const rawPrice = order.roll_purchase_price ?? item.unit_price
    const purchasePrice = order.no_invoice ? 0 : rawPrice
    const supplyAmt = Math.round(purchasePrice * item.quantity)
    const vatAmt    = Math.round(supplyAmt * 0.1)
    console.log(`[ecount] 방화포 구매 품목: ${item.name} ${item.spec ?? ''} qty=${item.quantity} price=${purchasePrice} supply=${supplyAmt}`)
    return {
      BulkDatas: {
        ...header,
        PROD_CD:    FIRE_BLANKET_PROD_CD,
        PROD_DES:   item.name,
        SIZE_DES:   item.spec ?? '',
        QTY:        String(item.quantity),
        PRICE:      String(purchasePrice),
        ADD_NUM_01: '',
        SUPPLY_AMT: String(supplyAmt),
        VAT_AMT:    String(vatAmt),
        REMARKS:    item.note ?? '',
      },
    }
  })

  if (order.freight && order.freight > 0) {
    PurchasesList.push({
      BulkDatas: {
        ...header,
        PROD_CD:    FREIGHT_PROD_CD,
        PROD_DES:   '운임비',
        SIZE_DES:   '',
        QTY:        '1',
        PRICE:      String(order.freight),
        ADD_NUM_01: '',
        SUPPLY_AMT: String(order.freight),
        VAT_AMT:    String(Math.round(order.freight * 0.1)),
        REMARKS:    '',
      },
    })
  }

  if (PurchasesList.length === 0) throw new Error('NO_MAPPABLE_ITEMS')

  const url = `${apiBase}/OAPI/V2/Purchases/SavePurchases?SESSION_ID=${sessionId}`
  console.log('[ecount] 방화포 구매입력 URL:', `${apiBase}/OAPI/V2/Purchases/SavePurchases?SESSION_ID=****`)
  console.log('[ecount] 방화포 구매입력 body:', JSON.stringify({ PurchasesList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ PurchasesList }),
  })
}

export async function saveFireBlanketPurchase(order: EcountFireBlanketOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveFireBlanketPurchase 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id, '/ manufacturer:', order.manufacturer)
  try {
    const session = await getSession()
    let res = await doSaveFireBlanketPurchase(order, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveFireBlanketPurchase(order, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 방화포 구매입력 응답 status:', res.status)
    console.log('[ecount] 방화포 구매입력 응답 body:', text)
    console.log('━━━ [ECOUNT] saveFireBlanketPurchase 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveFireBlanketPurchase skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 방화포 구매입력 오류:', e.message)
    console.log('━━━ [ECOUNT] saveFireBlanketPurchase 실패 ━━━')
    throw e
  }
}

async function doSaveFireBlanketSale(order: EcountFireBlanketOrder, session: EcountSession): Promise<Response> {
  const { sessionId, apiBase } = session

  const header = {
    IO_DATE:       toEcountDate(order.delivery_date) || toEcountDate(new Date().toISOString().slice(0, 10)),
    UPLOAD_SER_NO: '1',
    CUST_DES:      order.customer_name,
    EMP_CD:        order.author ?? '',
    WH_CD:         '법인',
    TIME_DATE:     toEcountDate(order.delivery_date),
    U_MEMO1:       order.project ?? '',
    U_MEMO2:       order.address ?? '',
    U_MEMO3:       order.manufacturer,
    U_MEMO4:       order.contact_name ?? '',
    U_MEMO5:       order.delivery_dest ?? '',
    DOC_NO:        order.order_no ?? order.id,
    ADD_TXT_01_T:  order.contact_phone ?? '',
    ADD_LTXT_01_T: order.notes ?? '',
  }

  const items = order.items.filter(i => (i.quantity ?? 0) > 0)

  const SaleList = items.map(item => {
    const salePrice = order.no_invoice ? 0 : item.unit_price
    const supplyAmt = Math.round(salePrice * item.quantity)
    const vatAmt    = Math.round(supplyAmt * 0.1)
    console.log(`[ecount] 방화포 판매 품목: ${item.name} ${item.spec ?? ''} qty=${item.quantity} price=${salePrice} supply=${supplyAmt}`)
    return {
      BulkDatas: {
        ...header,
        PROD_CD:    FIRE_BLANKET_PROD_CD,
        PROD_DES:   item.name,
        SIZE_DES:   item.spec ?? '',
        QTY:        String(item.quantity),
        PRICE:      String(salePrice),
        ADD_NUM_01: '',
        SUPPLY_AMT: String(supplyAmt),
        VAT_AMT:    String(vatAmt),
        REMARKS:    item.note ?? '',
      },
    }
  })

  if (order.freight && order.freight > 0) {
    SaleList.push({
      BulkDatas: {
        ...header,
        PROD_CD:    FREIGHT_PROD_CD,
        PROD_DES:   '운임비',
        SIZE_DES:   '',
        QTY:        '1',
        PRICE:      String(order.freight),
        ADD_NUM_01: '',
        SUPPLY_AMT: String(order.freight),
        VAT_AMT:    String(Math.round(order.freight * 0.1)),
        REMARKS:    '',
      },
    })
  }

  if (SaleList.length === 0) throw new Error('NO_MAPPABLE_ITEMS')

  const url = `${apiBase}/OAPI/V2/Sale/SaveSale?SESSION_ID=${sessionId}`
  console.log('[ecount] 방화포 판매입력 URL:', `${apiBase}/OAPI/V2/Sale/SaveSale?SESSION_ID=****`)
  console.log('[ecount] 방화포 판매입력 body:', JSON.stringify({ SaleList }, null, 2))

  return ecountFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ SaleList }),
  })
}

export async function saveFireBlanketSale(order: EcountFireBlanketOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveFireBlanketSale 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id, '/ customer:', order.customer_name)
  try {
    const session = await getSession()
    let res = await doSaveFireBlanketSale(order, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveFireBlanketSale(order, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 방화포 판매입력 응답 status:', res.status)
    console.log('[ecount] 방화포 판매입력 응답 body:', text)
    console.log('━━━ [ECOUNT] saveFireBlanketSale 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveFireBlanketSale skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 방화포 판매입력 오류:', e.message)
    console.log('━━━ [ECOUNT] saveFireBlanketSale 실패 ━━━')
    throw e
  }
}

export async function saveFireBlanketSaleOrder(order: EcountFireBlanketOrder): Promise<'ok' | 'skipped'> {
  console.log('━━━ [ECOUNT] saveFireBlanketSaleOrder 시작 ━━━')
  console.log('[ecount] order_no:', order.order_no ?? order.id, '/ customer:', order.customer_name)
  try {
    const session = await getSession()
    let res = await doSaveFireBlanketOrder(order, session)
    if (res.status === 401 || res.status === 403) {
      console.warn('[ecount] 인증 오류, 재로그인 후 재시도...')
      const newSession = await getSession(true)
      res = await doSaveFireBlanketOrder(order, newSession)
    }
    const text = await res.text().catch(() => '')
    console.log('[ecount] 방화포 주문입력 응답 status:', res.status)
    console.log('[ecount] 방화포 주문입력 응답 body:', text)
    console.log('━━━ [ECOUNT] saveFireBlanketSaleOrder 완료 ━━━')
    if (!res.ok) throw new Error(`ECOUNT API error ${res.status}`)
    return 'ok'
  } catch (e: any) {
    if (e.message === 'NO_MAPPABLE_ITEMS') {
      console.log('━━━ [ECOUNT] saveFireBlanketSaleOrder skip (매핑 가능한 품목 없음) ━━━')
      return 'skipped'
    }
    console.error('[ecount] 방화포 주문입력 오류:', e.message)
    console.log('━━━ [ECOUNT] saveFireBlanketSaleOrder 실패 ━━━')
    throw e
  }
}
