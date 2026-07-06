import ExcelJS from 'exceljs'
import path from 'path'
import type { OrderItem } from './parse-order'
import { getDisplayName, getUnit, normalizePipeForExcel } from './vendor-mappings'
import { calcSalePrice } from './price-utils'

export const SELECTABLE_SHEETS = [
  { no: 0,  label: '단가표' },
  { no: 1,  label: '1. 발주접수' },
  { no: 2,  label: '2. 고정구단가산출' },
  { no: 21, label: '2-1. 고정구단가산출<출력용>' },
  { no: 3,  label: '3. 견적서' },
  { no: 4,  label: '4. 거래명세서' },
  { no: 5,  label: '5. 발주서' },
] as const

export const ALL_SHEET_NOS = SELECTABLE_SHEETS.map(s => s.no)

export interface OrderFormData {
  vendor: string
  orderClient: string
  author: string
  orderDate: string
  deliveryDate: string
  project: string
  deliveryLocation: string
  address: string
  contactName: string
  contactPhone: string
  notes: string
  deliveryDest: string
  orderNo?: string
  manufacturer?: string
  groupId?: string
  items: OrderItem[]
}

export interface PriceRow {
  prod_key: string
  unit_price: number
  heat_type?: string | null
  heat_length_mm?: number | null
  sealant_volume?: string | null
}

const TEMPLATE_PATH = path.join(
  process.cwd(),
  '번호 ^^ 배관(필립산업) ^^ 품목 ^^ 거래처 ^^ 현장명 ^^ 발주일 ^^ 납품일 ^^ 작성자.xlsx'
)

// Sheet 2 item rows: 13–109 (97 capacity)
const S2_START = 13
const S2_END   = 109

function getItemProdKey(item: OrderItem): string {
  const { internalName, pipeSpec, sleeveSpec } = item
  if (!internalName) return ''
  if (pipeSpec && sleeveSpec) return `${internalName}_${pipeSpec}_${sleeveSpec}`
  if (pipeSpec) return `${internalName}_${pipeSpec}`
  return internalName
}

export async function generateOrderExcel(
  data: OrderFormData,
  priceRows?: PriceRow[],
  discountPct?: number | null,
  selectedNos?: number[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  wb.calcProperties.fullCalcOnLoad = true

  // Remove conditional formatting (ExcelJS XML re-write bug)
  wb.eachSheet(ws => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = ws as any
    if (Array.isArray(w._conditionalFormattings)) w._conditionalFormattings.length = 0
    if (Array.isArray(w.conditionalFormattings)) w.conditionalFormattings.length = 0
  })

  // Convert shared formula clones → independent formulas (prevents writeBuffer crash)
  wb.eachSheet(ws => {
    ws.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        const formula = cell.formula
        if (formula) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cell.value = { formula, result: (cell as any).result } as ExcelJS.CellFormulaValue
        }
      })
    })
  })

  const priceByKey = new Map<string, PriceRow>(priceRows?.map(r => [r.prod_key, r]) ?? [])

  // ── Sheet 1: 발주접수 ──
  const s1 = wb.getWorksheet('1.발주접수')!
  s1.getCell('C5').value  = data.orderClient || ''
  s1.getCell('C6').value  = data.orderDate ? new Date(data.orderDate) : null
  s1.getCell('C7').value  = data.deliveryDate ? new Date(data.deliveryDate) : null
  s1.getCell('C8').value  = data.project || ''
  s1.getCell('C9').value  = data.deliveryLocation || ''
  s1.getCell('C10').value = data.address || ''
  s1.getCell('C11').value = data.contactName || ''
  s1.getCell('C12').value = data.contactPhone || ''
  s1.getCell('C13').value = data.notes || ''
  s1.getCell('C14').value = data.deliveryDest || ''

  // ── Sheet 2: 고정구단가산출 (rows 13–109) ──
  const s2 = wb.getWorksheet('2.고정구단가산출')!
  const items = data.items
  const usedRows = Math.min(items.length, S2_END - S2_START + 1)

  for (let i = 0; i < usedRows; i++) {
    const item  = items[i]
    const r     = S2_START + i
    const prodKey  = getItemProdKey(item)
    const price    = priceByKey.get(prodKey)
    const pipeNorm = item.pipeSpec ? normalizePipeForExcel(item.pipeSpec) : ''
    const slvNorm  = item.sleeveSpec ? normalizePipeForExcel(item.sleeveSpec) : ''
    const name     = item.name || getDisplayName(item.internalName || '') || ''
    const unit     = item.unit || getUnit(item.internalName || '') || ''

    // Part A — item identity
    s2.getCell(`B${r}`).value = i + 1
    s2.getCell(`C${r}`).value = item.internalName || ''
    s2.getCell(`D${r}`).value = pipeNorm ? `${item.internalName}_${pipeNorm}` : (item.internalName || '')
    s2.getCell(`E${r}`).value = slvNorm || ''
    s2.getCell(`F${r}`).value = name
    s2.getCell(`G${r}`).value = item.spec || ''
    s2.getCell(`H${r}`).value = unit
    s2.getCell(`I${r}`).value = item.quantity

    // Part B — price data (overwrite XLOOKUP formulas with DB values)
    if (price) {
      const svNum = parseFloat(price.sealant_volume || '')
      s2.getCell(`L${r}`).value = price.heat_length_mm   ?? null
      s2.getCell(`P${r}`).value = price.heat_type        ?? null
      s2.getCell(`Q${r}`).value = isNaN(svNum) ? null : svNum
      s2.getCell(`T${r}`).value = price.unit_price
      s2.getCell(`V${r}`).value = discountPct != null
        ? calcSalePrice(price.unit_price, discountPct)
        : null
    } else {
      // Clear XLOOKUP cells so empty rows don't show errors
      ;['L','P','Q','T','V'].forEach(c => { s2.getCell(`${c}${r}`).value = null })
    }
  }

  // Clear unused item rows (13+n … 109): null out B–Y so XLOOKUP formulas don't produce junk
  for (let r = S2_START + usedRows; r <= S2_END; r++) {
    'BCDEFGHIJKLMNOPQRSTUVWXY'.split('').forEach(c => { s2.getCell(`${c}${r}`).value = null })
  }

  // ── Sheet 5: 발주서 (use pre-formatted sheet from template) ──
  const s5 = wb.worksheets.find(ws => ws.name.startsWith('5.'))!

  // Write dates as 'yyyy-mm-dd' strings to prevent Google Drive PDF locale issue
  const fmtDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  s5.getCell('C3').value = fmtDate(data.orderDate)
  s5.getCell('G3').value = fmtDate(data.deliveryDate)

  // Clear item rows 13-32 (keep header rows 1-12 and SUM row 33)
  for (let r = 13; r <= 32; r++) {
    ;['A', 'D', 'E', 'F', 'G', 'H'].forEach(c => { s5.getCell(`${c}${r}`).value = null })
  }

  // Fill item data (columns match Sheet 5 layout: A=품명, D=배관, E=슬리브, F=단위, G=수량)
  // "20A" → 20(int), spec-only 문자열("300ml/통") → "/" 앞만 사용("300ml")
  const toExcelPipe = (s: string): number | string =>
    /^\d+A$/.test(s) ? parseInt(s, 10) : s.split('/')[0].trim()

  items.slice(0, 20).forEach((item, idx) => {
    const r     = 13 + idx
    const pipe  = item.pipeSpec ? toExcelPipe(item.pipeSpec) : null
    const slv   = item.sleeveSpec ? (parseInt(item.sleeveSpec, 10) || item.sleeveSpec) : null
    const iName = item.name || getDisplayName(item.internalName || '') || ''
    s5.getCell(`A${r}`).value = iName
    s5.getCell(`D${r}`).value = pipe ?? (item.spec ? toExcelPipe(item.spec) : null)
    s5.getCell(`E${r}`).value = slv
    s5.getCell(`F${r}`).value = item.unit || getUnit(item.internalName || '') || ''
    s5.getCell(`G${r}`).value = item.quantity
    s5.getCell(`H${r}`).value = item.note || null
  })

  // ── Sheet filter: hide un-selected sheets (used by PDF route) ──
  if (selectedNos && selectedNos.length > 0) {
    const prefixMap: Record<number, string> = {
      0:  '단가표',
      1:  '1.',
      2:  '2.',
      21: '2-1.',
      3:  '3.',
      4:  '4.',
      5:  '5.',
    }
    for (const { no } of SELECTABLE_SHEETS) {
      const prefix = prefixMap[no]
      const ws = wb.worksheets.find(w => w.name.startsWith(prefix))
      if (!ws) continue
      ws.state = selectedNos.includes(no) ? 'visible' : 'hidden'
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function applySheetFilter(buffer: Buffer, selectedNos: number[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any)
  wb.calcProperties.fullCalcOnLoad = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wb.eachSheet(ws => { (ws as any)._conditionalFormattings = [] })

  const prefixMap: Record<number, string> = {
    0:  '단가표',
    1:  '1.',
    2:  '2.',
    21: '2-1.',
    3:  '3.',
    4:  '4.',
    5:  '5.',
  }
  SELECTABLE_SHEETS.forEach(({ no }) => {
    const prefix = prefixMap[no]
    const ws = wb.worksheets.find(w => w.name.startsWith(prefix))
    if (!ws) return
    ws.state = selectedNos.includes(no) ? 'visible' : 'hidden'
  })

  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}

export function buildExcelFilename(data: OrderFormData): string {
  const isangQty = data.items.filter(i => i.internalName?.includes('입상')).reduce((s, i) => s + i.quantity, 0)
  const byeokQty = data.items.filter(i => i.internalName?.includes('벽체')).reduce((s, i) => s + i.quantity, 0)

  let itemSummary: string
  if (isangQty > 0 || byeokQty > 0) {
    itemSummary = ''
    if (isangQty > 0) itemSummary += `입상${isangQty}`
    if (byeokQty > 0) itemSummary += `벽체${byeokQty}`
  } else {
    const chaQty = data.items.filter(i => i.internalName === '차열재').reduce((s, i) => s + i.quantity, 0)
    if (chaQty > 0) {
      itemSummary = `차열재${chaQty}`
    } else {
      const totalQty = data.items.reduce((s, i) => s + i.quantity, 0)
      const first    = data.items[0]?.internalName ?? data.items[0]?.name ?? '기타'
      itemSummary    = `${first}${totalQty}`
    }
  }

  const fmt = (dateStr: string) => {
    if (!dateStr) return ''
    const d  = new Date(dateStr)
    const yy = String(d.getFullYear()).slice(2)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yy}${mm}${dd}`
  }

  const mfr = data.manufacturer ?? '필립산업'

  return [
    data.orderNo || '',
    `배관(${mfr})`,
    itemSummary,
    data.vendor,
    data.project,
    data.orderDate    ? fmt(data.orderDate)    : '',
    data.deliveryDate ? fmt(data.deliveryDate) : '',
    data.author,
  ].filter(Boolean).join(' ^^ ') + '.xlsx'
}
