import ExcelJS from 'exceljs'
import path from 'path'
import type { DuctOrderItem, DuctOrderFormData } from '@/lib/duct-excel-generator'

export type { DuctOrderItem }

export interface KingsasiaDuctOrderFormData extends DuctOrderFormData {
  riserPurchasePrice?: number
  wallPurchasePrice?: number
}

const TEMPLATE_PATH = path.join(
  process.cwd(),
  '번호 ^^ 사각덕트(킹스아시아) ^^ 품목 ^^ 거래처 ^^ 현장명 ^^ 발주일 ^^ 납품일 ^^ 작성자.xlsx'
)

// Sheet 2-1 (입상단가): rows 4–32
const S21_START = 4
const S21_END   = 32

// Sheet 2-2 (벽체단가): rows 4–27
const S22_START = 4
const S22_END   = 27

// Sheets 3 & 4 (identical structure to profire)
const S34_ITEM_START    = 20
const S34_ITEM_CAPACITY = 17   // rows 20–36
const S34_UNIMBI_ROW    = 37
const S34_KAE_ROW       = 38

// Sheet 5 (identical SUMIF range to profire)
const S5_ITEM_START    = 17
const S5_ITEM_CAPACITY = 22    // rows 17–38

function sv(v: string | null | undefined): string { return v ?? '' }

function totalLengthM(items: DuctOrderItem[], type: '입상' | '벽체'): number {
  return items
    .filter(it => it.type === type)
    .reduce((sum, it) => {
      const p = itemPeri(it) ?? 0
      return sum + p * it.quantity
    }, 0)
}

function itemPeri(it: DuctOrderItem): number | null {
  if (it.type === '차열재') return null
  if (it.perimeter) return it.perimeter
  if (it.width && it.height) return Math.round((it.width + it.height) * 2 / 1000 * 1000) / 1000
  return null
}

// ─── Sheet 1: 발주접수 (same as profire) ─────────────────────────────────────
function fillSheet1(wb: ExcelJS.Workbook, d: KingsasiaDuctOrderFormData) {
  const ws = wb.getWorksheet('1.발주접수')!
  ws.getCell('C5').value  = sv(d.customerName)
  ws.getCell('C6').value  = d.orderDate    ? new Date(d.orderDate)    : null
  ws.getCell('C7').value  = d.deliveryDate ? new Date(d.deliveryDate) : null
  ws.getCell('C8').value  = sv(d.project)
  ws.getCell('C9').value  = sv(d.deliveryLocation)
  ws.getCell('C10').value = sv(d.address)
  ws.getCell('C11').value = sv(d.contactName)
  ws.getCell('C12').value = sv(d.contactPhone)
  ws.getCell('C13').value = sv(d.notes)
  ws.getCell('C14').value = sv(d.deliveryDest)
  ws.getCell('G5').value  = '프로화이어'
}

// ─── Sheet 2-1: 입상단가 ──────────────────────────────────────────────────────
// Columns: F=수량, G=가로, H=세로, K=구매가, L=내화재M당단가
// Formulas in D, I, J, M, N are preserved from template.
function fillSheet2_1(wb: ExcelJS.Workbook, items: DuctOrderItem[], purchasePrice: number) {
  const ws = wb.getWorksheet('2-1.입상단가')!
  const riserItems = items.filter(it => it.type === '입상')

  for (let r = S21_START; r <= S21_END; r++) {
    ws.getRow(r).getCell(6).value  = null
    ws.getRow(r).getCell(7).value  = null
    ws.getRow(r).getCell(8).value  = null
    ws.getRow(r).getCell(11).value = null
    ws.getRow(r).getCell(12).value = null
  }

  riserItems.forEach((it, i) => {
    const r = S21_START + i
    if (r > S21_END) return
    ws.getRow(r).getCell(6).value  = it.quantity
    ws.getRow(r).getCell(7).value  = it.width  ?? 0
    ws.getRow(r).getCell(8).value  = it.height ?? 0
    ws.getRow(r).getCell(11).value = purchasePrice || null
    ws.getRow(r).getCell(12).value = it.unit_price || null
  })
}

// ─── Sheet 2-2: 벽체단가 ──────────────────────────────────────────────────────
function fillSheet2_2(wb: ExcelJS.Workbook, items: DuctOrderItem[], purchasePrice: number) {
  const ws = wb.getWorksheet('2-2.벽체단가')!
  const wallItems = items.filter(it => it.type === '벽체')

  for (let r = S22_START; r <= S22_END; r++) {
    ws.getRow(r).getCell(6).value  = null
    ws.getRow(r).getCell(7).value  = null
    ws.getRow(r).getCell(8).value  = null
    ws.getRow(r).getCell(11).value = null
    ws.getRow(r).getCell(12).value = null
  }

  wallItems.forEach((it, i) => {
    const r = S22_START + i
    if (r > S22_END) return
    ws.getRow(r).getCell(6).value  = it.quantity
    ws.getRow(r).getCell(7).value  = it.width  ?? 0
    ws.getRow(r).getCell(8).value  = it.height ?? 0
    ws.getRow(r).getCell(11).value = purchasePrice || null
    ws.getRow(r).getCell(12).value = it.unit_price || null
  })
}

// ─── Sheets 3 & 4: item row writer ───────────────────────────────────────────
function writeOneItem(ws: ExcelJS.Worksheet, r: number, idx: number, it: DuctOrderItem) {
  const isInsul = it.type === '차열재'
  const spec    = it.width && it.height ? `${it.width}×${it.height}` : (it.spec ?? '')
  const peri    = itemPeri(it)
  ws.getRow(r).getCell(1).value = idx
  ws.getRow(r).getCell(2).value = isInsul ? '차열재' : `사각덕트 ${it.type}`
  ws.getRow(r).getCell(3).value = isInsul ? (it.spec ?? '') : spec
  ws.getRow(r).getCell(4).value = isInsul ? '롤' : 'SET'
  ws.getRow(r).getCell(5).value = it.quantity
  ws.getRow(r).getCell(6).value = peri
  ws.getRow(r).getCell(7).value = it.unit_price || null
  ws.getRow(r).getCell(8).value = it.amount     || null
  ws.getRow(r).getCell(9).value = sv(it.note)
}

function writeItemsS34(ws: ExcelJS.Worksheet, allItems: DuctOrderItem[], isSheet3: boolean) {
  const extra       = Math.max(0, allItems.length - S34_ITEM_CAPACITY)
  if (extra > 0) {
    for (let i = 0; i < extra; i++) ws.insertRow(S34_UNIMBI_ROW + i, [], 'i')
  }
  const unimBiRow   = S34_UNIMBI_ROW + extra
  const kaeRow      = S34_KAE_ROW    + extra
  const lastItemRow = unimBiRow - 1

  for (let r = S34_ITEM_START; r <= lastItemRow; r++) {
    for (let c = 1; c <= 10; c++) ws.getRow(r).getCell(c).value = null
  }
  allItems.forEach((it, i) => writeOneItem(ws, S34_ITEM_START + i, i + 1, it))

  ws.getCell(`H${kaeRow}`).value = {
    formula: `SUM(H${S34_ITEM_START}:H${lastItemRow})`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: (ws.getCell(`H${kaeRow}`) as any).result,
  } as ExcelJS.CellFormulaValue

  if (isSheet3) {
    ws.getCell(`I${kaeRow}`).value = {
      formula: `H${kaeRow}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: (ws.getCell(`H${kaeRow}`) as any).result,
    } as ExcelJS.CellFormulaValue
  }
}

function fillSheet3(wb: ExcelJS.Workbook, d: KingsasiaDuctOrderFormData, items: DuctOrderItem[]) {
  const ws = wb.getWorksheet('3.견적서')!
  ws.getCell('C11').value = { formula: 'TEXT(C12,"yyyy-mm-dd")', result: '' } as ExcelJS.CellFormulaValue

  // B15: 품목 유형에 따른 문구 ('킹스아시아' 빨간색, '금속/비금속 사각덕트' 밑줄)
  const isNonMetal = d.manufacturer.includes('비금속')
  const ductType   = isNonMetal ? '비금속 사각덕트' : '금속 사각덕트'
  ws.getCell('B15').value = {
    richText: [
      { text: '하기와 같이 ' },
      { text: '킹스아시아', font: { color: { argb: 'FFFF0000' } } },
      { text: ' ' },
      { text: ductType, font: { underline: true } },
      { text: '를 견적합니다.' },
    ],
  } as ExcelJS.CellRichTextValue

  // I15/I16/I17: 입상·벽체·전체 총 길이 (M)
  const riserM = Math.round(totalLengthM(items, '입상') * 100) / 100
  const wallM  = Math.round(totalLengthM(items, '벽체') * 100) / 100
  ws.getCell('I15').value = riserM || null
  ws.getCell('I16').value = wallM  || null
  ws.getCell('I17').value = (riserM + wallM) || null

  writeItemsS34(ws, items, true)
}

function fillSheet4(wb: ExcelJS.Workbook, items: DuctOrderItem[]) {
  const ws = wb.getWorksheet('4.거래명세서')!
  writeItemsS34(ws, items, false)
}

// ─── Sheet 5: 발주서 ──────────────────────────────────────────────────────────
function fillSheet5(wb: ExcelJS.Workbook, d: KingsasiaDuctOrderFormData, items: DuctOrderItem[]) {
  const ws = wb.worksheets.find(w => w.name.startsWith('5.'))!

  ws.getCell('B8').value = '프로화이어'

  const allItems    = [...items.filter(i => i.type === '입상'), ...items.filter(i => i.type === '벽체')]
  const extra       = Math.max(0, allItems.length - S5_ITEM_CAPACITY)
  const lastItemRow = S5_ITEM_START + S5_ITEM_CAPACITY - 1 + extra

  for (let r = S5_ITEM_START; r <= lastItemRow + 5; r++) {
    for (let c = 1; c <= 9; c++) ws.getRow(r).getCell(c).value = null
  }

  allItems.forEach((it, i) => {
    const r = S5_ITEM_START + i
    const spec    = it.width && it.height ? `${it.width}×${it.height}` : (it.spec ?? '')
    ws.getRow(r).getCell(1).value = i + 1
    ws.getRow(r).getCell(2).value = it.type
    ws.getRow(r).getCell(3).value = spec
    ws.getRow(r).getCell(4).value = 'SET'
    ws.getRow(r).getCell(5).value = it.quantity
    ws.getRow(r).getCell(6).value = itemPeri(it)
    ws.getRow(r).getCell(7).value = d.manufacturer.includes('비금속') ? '킹스아시아 비금속' : '킹스아시아 금속'
  })

  if (extra > 0) {
    const newRange    = `$B$${S5_ITEM_START}:$B$${lastItemRow}`
    const newQtyRange = `$E$${S5_ITEM_START}:$E$${lastItemRow}`
    ws.getCell('C6').value = { formula: `SUMIF(${newRange},B6,${newQtyRange})` } as ExcelJS.CellFormulaValue
    ws.getCell('H6').value = { formula: `SUMIF(${newRange},G6,${newQtyRange})` } as ExcelJS.CellFormulaValue
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export async function generateKingsasiaDuctExcel(
  data: KingsasiaDuctOrderFormData,
  visibleSheets?: number[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  wb.calcProperties.fullCalcOnLoad = true

  wb.eachSheet(ws => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = ws as any
    if (Array.isArray(w._conditionalFormattings)) w._conditionalFormattings.length = 0
    if (Array.isArray(w.conditionalFormattings))  w.conditionalFormattings.length  = 0
  })

  // Convert shared formula clones → independent
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

  const riserItems = data.items.filter(it => it.type !== '차열재')

  fillSheet1(wb, data)
  fillSheet2_1(wb, riserItems, data.riserPurchasePrice ?? 0)
  fillSheet2_2(wb, riserItems, data.wallPurchasePrice  ?? 0)
  fillSheet3(wb, data, riserItems)
  fillSheet4(wb, riserItems)
  fillSheet5(wb, data, riserItems)

  if (visibleSheets && visibleSheets.length > 0) {
    wb.eachSheet(ws => {
      const sheetNum = parseInt(ws.name.charAt(0))
      if (!visibleSheets.includes(sheetNum)) ws.state = 'hidden'
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export function buildKingsasiaDuctExcelFilename(data: KingsasiaDuctOrderFormData): string {
  const riserQty = data.items.filter(i => i.type === '입상').reduce((s, i) => s + i.quantity, 0)
  const wallQty  = data.items.filter(i => i.type === '벽체').reduce((s, i) => s + i.quantity, 0)
  const summary  = [
    riserQty > 0 ? `입상${riserQty}` : '',
    wallQty  > 0 ? `벽체${wallQty}`  : '',
  ].filter(Boolean).join('') || '덕트'

  const fmt = (d?: string | null) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${String(dt.getFullYear()).slice(2)}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
  }

  return [
    data.orderNo      || '',
    `덕트(${data.manufacturer})`,
    summary,
    data.customerName || '',
    data.project      || '',
    data.orderDate    ? fmt(data.orderDate)    : '',
    data.deliveryDate ? fmt(data.deliveryDate) : '',
    data.author       || '',
  ].filter(Boolean).join(' ^^ ') + '.xlsx'
}
