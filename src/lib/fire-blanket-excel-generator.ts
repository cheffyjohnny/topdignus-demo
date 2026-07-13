import ExcelJS from 'exceljs'
import path from 'path'

export interface FireBlanketOrderItem {
  name: string
  spec?: string | null
  manufacturer?: string | null
  quantity: number
  unit_price: number
  amount: number
  note?: string | null
}

export interface FireBlanketOrderFormData {
  orderNo?: string | null
  manufacturer: string
  customerName?: string | null
  project?: string | null
  deliveryLocation?: string | null
  address?: string | null
  deliveryDest?: string | null
  contactName?: string | null
  contactPhone?: string | null
  orderDate?: string | null
  deliveryDate?: string | null
  author?: string | null
  notes?: string | null
  items: FireBlanketOrderItem[]
}

// 방화포 전용 템플릿이 따로 없어 프로화이어 사각덕트 템플릿을 그대로 재사용
const TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates',
  '번호 ^^ 사각덕트(프로화이어) ^^ 품목 ^^ 거래처 ^^ 현장명 ^^ 발주일 ^^ 납품일 ^^ 작성자.xlsx'
)

const S5_ITEM_START = 17
const S5_ITEM_CAPACITY = 22  // rows 17-38

function sv(v: string | null | undefined): string { return v ?? '' }

// ─────────────────────────────────────────────
// Sheet 1: 발주접수
// ─────────────────────────────────────────────
function fillSheet1(wb: ExcelJS.Workbook, d: FireBlanketOrderFormData) {
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
  ws.getCell('G5').value  = sv(d.manufacturer).replace(/\s*\([^)]*\)\s*/g, '').trim() || sv(d.manufacturer)
}

// ─────────────────────────────────────────────
// Sheet 5: 발주서
//   템플릿은 사각덕트(입상/벽체) 전용 요약행(B6/G6 SUMIF)을 갖고 있으나
//   방화포는 구분이 없는 단일 품목 목록이므로 품목수 합계로 대체
// ─────────────────────────────────────────────
function fillSheet5(wb: ExcelJS.Workbook, items: FireBlanketOrderItem[]) {
  const ws = wb.worksheets.find(w => w.name.startsWith('5.'))!

  ws.getCell('A5').value = '방        화        포'

  ws.getCell('B6').value = '품목수'
  ws.getCell('C6').value = items.length || null
  ws.getCell('G6').value = null
  ws.getCell('H6').value = null

  const extra = Math.max(0, items.length - S5_ITEM_CAPACITY)
  const lastItemRow = S5_ITEM_START + S5_ITEM_CAPACITY - 1 + extra

  for (let r = S5_ITEM_START; r <= lastItemRow + 5; r++) {
    for (let c = 1; c <= 9; c++) ws.getRow(r).getCell(c).value = null
  }

  items.forEach((it, i) => {
    const r = S5_ITEM_START + i
    ws.getRow(r).getCell(1).value = i + 1
    ws.getRow(r).getCell(2).value = it.name || '방화포'
    ws.getRow(r).getCell(3).value = sv(it.spec)
    ws.getRow(r).getCell(4).value = '롤'
    ws.getRow(r).getCell(5).value = it.quantity
    ws.getRow(r).getCell(7).value = sv(it.note)
  })
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────
export async function generateFireBlanketExcel(data: FireBlanketOrderFormData, visibleSheets?: number[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)
  wb.calcProperties.fullCalcOnLoad = true

  // Remove conditional formatting (ExcelJS XML re-write bug)
  wb.eachSheet(ws => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = ws as any
    if (Array.isArray(w._conditionalFormattings)) w._conditionalFormattings.length = 0
    if (Array.isArray(w.conditionalFormattings))  w.conditionalFormattings.length  = 0
  })

  // Convert shared formula clones → independent (prevents writeBuffer crash)
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

  fillSheet1(wb, data)
  fillSheet5(wb, data.items)

  // 방화포는 구분(입상/벽체)·차열재 계산이 없으므로 사각덕트 전용 시트(2~4)는 숨김 처리
  const visible = visibleSheets && visibleSheets.length > 0 ? visibleSheets : [1, 5]
  wb.eachSheet(ws => {
    const sheetNum = parseInt(ws.name.charAt(0))
    if (!visible.includes(sheetNum)) ws.state = 'hidden'
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export function buildFireBlanketExcelFilename(data: FireBlanketOrderFormData): string {
  const totalQty = data.items.reduce((s, i) => s + (i.quantity || 0), 0)
  const summary  = totalQty > 0 ? `방화포${totalQty}롤` : '방화포'

  const fmt = (d?: string | null) => {
    if (!d) return ''
    const dt = new Date(d)
    return `${String(dt.getFullYear()).slice(2)}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
  }

  return [
    data.orderNo        || '',
    `방화포(${data.manufacturer})`,
    summary,
    data.customerName   || '',
    data.project        || '',
    data.orderDate    ? fmt(data.orderDate)    : '',
    data.deliveryDate ? fmt(data.deliveryDate) : '',
    data.author         || '',
  ].filter(Boolean).join(' ^^ ') + '.xlsx'
}
