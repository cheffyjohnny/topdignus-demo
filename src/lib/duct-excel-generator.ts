import ExcelJS from 'exceljs'
import path from 'path'

export interface DuctOrderItem {
  type: '입상' | '벽체' | '차열재'
  width?: number
  height?: number
  perimeter?: number
  spec?: string
  quantity: number
  unit_price: number
  amount: number
  note?: string | null
}

export interface DuctOrderFormData {
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
  items: DuctOrderItem[]
  riserSalePrice?: number   // 입상 판매단가/M (insul 차감 전)
  wallSalePrice?: number    // 벽체 판매단가/M (insul 차감 전)
  insul50Price?: number     // 50T×400×3.6M 단가
  insul25Price?: number     // 25T×400×7.2M 단가
}

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates',
  '번호 ^^ 사각덕트(프로화이어) ^^ 품목 ^^ 거래처 ^^ 현장명 ^^ 발주일 ^^ 납품일 ^^ 작성자.xlsx'
)

// Template item row ranges
const S34_ITEM_START = 20
const S34_ITEM_CAPACITY = 17  // rows 20-36
const S34_UNIMBI_ROW = 37     // 운임비
const S34_KAE_ROW = 38        // 계

const S5_ITEM_START = 17
const S5_ITEM_CAPACITY = 22   // rows 17-38 (SUMIF range)

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
const ORANGE_FILL:  ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }
const ORANGE_DARK:  ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } }
const BLUE_DARK:    ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B6' } }
const GREEN_DARK:   ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF375623' } }
const GRAY_FILL:    ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
const TB: Partial<ExcelJS.Border> = { style: 'thin' }
const BORDERS = { top: TB, left: TB, bottom: TB, right: TB } as ExcelJS.Borders

function sv(v: string | null | undefined): string { return v ?? '' }

function fmtYmd(d?: string | null) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function borderRow(ws: ExcelJS.Worksheet, rn: number, startCol: number, endCol: number) {
  for (let c = startCol; c <= endCol; c++) ws.getRow(rn).getCell(c).border = BORDERS
}

function itemPeri(it: DuctOrderItem): number | null {
  if (it.type === '차열재') return null
  if (it.perimeter) return it.perimeter
  if (it.width && it.height) return Math.round((it.width + it.height) * 2 / 1000 * 1000) / 1000
  return null
}

function totalLengthM(items: DuctOrderItem[], type: '입상' | '벽체'): number {
  return items
    .filter(it => it.type === type)
    .reduce((sum, it) => {
      const p = itemPeri(it) ?? 0
      return sum + p * it.quantity
    }, 0)
}

// ─────────────────────────────────────────────
// Insulation calculation (for Sheet 2)
// ─────────────────────────────────────────────
interface InsulCalc {
  wallRows:  Array<{ w: number; h: number; qty: number; pMm: number; mm50: number }>
  riserRows: Array<{ w: number; h: number; qty: number; pMm: number; mm50: number; mm25: number }>
  wallMm50: number; riserMm50: number; riserMm25: number
  wallRolls50: number; riserRolls50: number; rolls50: number; rolls25: number
}

function getInsulCalc(items: DuctOrderItem[]): InsulCalc | null {
  const wall  = items.filter(i => i.type === '벽체')
  const riser = items.filter(i => i.type === '입상')
  const wallRows = wall.map(it => {
    const pMm = ((it.width ?? 0) + (it.height ?? 0)) * 2
    return { w: it.width ?? 0, h: it.height ?? 0, qty: it.quantity, pMm, mm50: pMm * 4 * it.quantity }
  })
  const riserRows = riser.map(it => {
    const pMm = ((it.width ?? 0) + (it.height ?? 0)) * 2
    return { w: it.width ?? 0, h: it.height ?? 0, qty: it.quantity, pMm, mm50: pMm * 2 * it.quantity, mm25: pMm * 3 * it.quantity }
  })
  const wallMm50  = wallRows.reduce((s, r) => s + r.mm50, 0)
  const riserMm50 = riserRows.reduce((s, r) => s + r.mm50, 0)
  const riserMm25 = riserRows.reduce((s, r) => s + r.mm25, 0)
  if (wallMm50 === 0 && riserMm50 === 0 && riserMm25 === 0) return null
  return {
    wallRows, riserRows, wallMm50, riserMm50, riserMm25,
    wallRolls50:  Math.ceil(wallMm50  / 3600),
    riserRolls50: Math.ceil(riserMm50 / 3600),
    rolls50: Math.ceil(wallMm50 / 3600) + Math.ceil(riserMm50 / 3600),
    rolls25: Math.ceil(riserMm25 / 7200),
  }
}

// ─────────────────────────────────────────────
// Sheet 1: 발주접수
// ─────────────────────────────────────────────
function fillSheet1(wb: ExcelJS.Workbook, d: DuctOrderFormData) {
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
  // Strip parenthetical suffix, e.g. "프로화이어(차열)" → "프로화이어"
  ws.getCell('G5').value  = sv(d.manufacturer).replace(/\s*\([^)]*\)\s*/g, '').trim() || sv(d.manufacturer)
}

// ─────────────────────────────────────────────
// Sheet 2: 차열재 계산식 (empty in template, written from code)
// ─────────────────────────────────────────────
function fillSheet2(wb: ExcelJS.Workbook, d: DuctOrderFormData, insul: InsulCalc | null) {
  const ws = wb.getWorksheet('2-1.차열재 계산식')!

  // Unmerge all existing merged regions in the template before writing
  const mergeKeys = Object.keys((ws as unknown as Record<string, Record<string, unknown>>)['_merges'] ?? {})
  mergeKeys.forEach(k => { try { ws.unMergeCells(k) } catch { /* ignore */ } })

  let r = 2

  ws.mergeCells(`A${r}:F${r}`)
  ws.getCell(`A${r}`).value = `차열재 계산식  —  ${sv(d.project) || '현장명 없음'}  (${fmtYmd(d.orderDate) || '-'})`
  ws.getCell(`A${r}`).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getCell(`A${r}`).fill = ORANGE_DARK
  ws.getRow(r).height = 26
  r += 2

  if (!insul) {
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = '차열재 계산 없음 — 입상/벽체 치수 데이터가 없습니다.'
    ws.getCell(`A${r}`).font = { italic: true, color: { argb: 'FF888888' } }
    return
  }

  function bigSection(title: string, fill: ExcelJS.Fill) {
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = title
    ws.getCell(`A${r}`).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
    ws.getCell(`A${r}`).fill = fill
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(r).height = 24
    borderRow(ws, r, 1, 6); r++
  }

  function subSection(title: string) {
    ws.mergeCells(`A${r}:F${r}`)
    ws.getCell(`A${r}`).value = title
    ws.getCell(`A${r}`).font = { bold: true, size: 10, color: { argb: 'FFBD4F00' } }
    ws.getCell(`A${r}`).fill = ORANGE_FILL
    ws.getRow(r).height = 18
    borderRow(ws, r, 1, 6); r++
  }

  function formulaNote(note: string) {
    ws.mergeCells(`B${r}:F${r}`)
    ws.getCell(`B${r}`).value = note
    ws.getCell(`B${r}`).font = { italic: true, size: 9, color: { argb: 'FF777777' } }
    r++
  }

  function tableHeader() {
    const hdrs = ['치수 (mm)', '수량', '계산식', '길이 (mm)', '롤 수']
    hdrs.forEach((h, i) => {
      const cell = ws.getRow(r).getCell(i + 2)
      cell.value = h; cell.font = { bold: true, size: 9 }
      cell.fill = HEADER_FILL; cell.border = BORDERS
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
    ws.getRow(r).height = 16; r++
  }

  function subtotalRow(mmStr: string, rolls: number) {
    ws.getRow(r).getCell(2).value = '소 계'
    ws.getRow(r).getCell(2).font = { bold: true }
    ws.getRow(r).getCell(2).fill = GRAY_FILL
    ws.mergeCells(`D${r}:E${r}`)
    ws.getRow(r).getCell(4).value = mmStr
    ws.getRow(r).getCell(4).font = { bold: true }
    ws.getRow(r).getCell(6).value = rolls
    ws.getRow(r).getCell(6).font = { bold: true, color: { argb: 'FFBD4F00' } }
    borderRow(ws, r, 2, 6); r += 2
  }

  // ════ 입상 섹션 ════
  if (insul.riserRows.length > 0) {
    bigSection('▶  입상', GREEN_DARK)

    subSection('■ 50T×400  (1·2단)')
    formulaNote('공식: 둘레(mm) × 2 × 수량  →  롤 수: 총 길이 ÷ 3,600mm/롤')
    tableHeader()
    insul.riserRows.forEach(row => {
      ws.getRow(r).getCell(2).value = `${row.w}×${row.h}`
      ws.getRow(r).getCell(3).value = row.qty
      ws.getRow(r).getCell(4).value = `둘레 ${row.pMm.toLocaleString()}mm × 2(1·2단) × ${row.qty}(수량) = ${row.mm50.toLocaleString()}mm`
      ws.getRow(r).getCell(5).value = row.mm50
      ws.getRow(r).getCell(6).value = Math.ceil(row.mm50 / 3600)
      borderRow(ws, r, 2, 6); r++
    })
    subtotalRow(`${insul.riserMm50.toLocaleString()}mm ÷ 3,600 = ${insul.riserRolls50}롤`, insul.riserRolls50)

    subSection('■ 25T×400  (1·2·3단)')
    formulaNote('공식: 둘레(mm) × 3 × 수량  →  롤 수: 총 길이 ÷ 7,200mm/롤')
    tableHeader()
    insul.riserRows.forEach(row => {
      ws.getRow(r).getCell(2).value = `${row.w}×${row.h}`
      ws.getRow(r).getCell(3).value = row.qty
      ws.getRow(r).getCell(4).value = `둘레 ${row.pMm.toLocaleString()}mm × 3(1·2·3단) × ${row.qty}(수량) = ${row.mm25.toLocaleString()}mm`
      ws.getRow(r).getCell(5).value = row.mm25
      ws.getRow(r).getCell(6).value = Math.ceil(row.mm25 / 7200)
      borderRow(ws, r, 2, 6); r++
    })
    subtotalRow(`${insul.riserMm25.toLocaleString()}mm ÷ 7,200 = ${insul.rolls25}롤`, insul.rolls25)
  }

  // ════ 벽체 섹션 ════
  if (insul.wallRows.length > 0) {
    bigSection('▶  벽체', BLUE_DARK)

    subSection('■ 50T×400  (양면, 2단/면 × 2면)')
    formulaNote('공식: 둘레(mm) × 4 × 수량  →  롤 수: 총 길이 ÷ 3,600mm/롤')
    tableHeader()
    insul.wallRows.forEach(row => {
      ws.getRow(r).getCell(2).value = `${row.w}×${row.h}`
      ws.getRow(r).getCell(3).value = row.qty
      ws.getRow(r).getCell(4).value = `둘레 ${row.pMm.toLocaleString()}mm × 4 × ${row.qty}(수량) = ${row.mm50.toLocaleString()}mm`
      ws.getRow(r).getCell(5).value = row.mm50
      ws.getRow(r).getCell(6).value = Math.ceil(row.mm50 / 3600)
      borderRow(ws, r, 2, 6); r++
    })
    subtotalRow(`${insul.wallMm50.toLocaleString()}mm ÷ 3,600 = ${insul.wallRolls50}롤`, insul.wallRolls50)
  }

  // 최종 합계
  ws.mergeCells(`A${r}:F${r}`)
  ws.getCell(`A${r}`).value = '▶ 최종 합계'
  ws.getCell(`A${r}`).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  ws.getCell(`A${r}`).fill = ORANGE_DARK
  ws.getRow(r).height = 22
  borderRow(ws, r, 1, 6); r++
  ;([['50T×400×3.6M', insul.rolls50], ['25T×400×7.2M', insul.rolls25]] as [string, number][]).forEach(([spec, rolls]) => {
    if (!rolls) return
    ws.getRow(r).getCell(2).value = spec
    ws.getRow(r).getCell(2).font = { bold: true }
    ws.getRow(r).getCell(3).value = `${rolls}롤`
    ws.getRow(r).getCell(3).font = { bold: true, color: { argb: 'FFBD4F00' } }
    borderRow(ws, r, 2, 3); r++
  })
}

// ─────────────────────────────────────────────
// Sheet 2-2: 적용단가 계산식
// ─────────────────────────────────────────────
function fillSheet2_2(wb: ExcelJS.Workbook, d: DuctOrderFormData, insul: InsulCalc | null) {
  const ws = wb.getWorksheet('2-2.적용단가 계산식')!
  if (!ws) return

  const mergeKeys = Object.keys((ws as unknown as Record<string, Record<string, unknown>>)['_merges'] ?? {})
  mergeKeys.forEach(k => { try { ws.unMergeCells(k) } catch { /* ignore */ } })

  const riserSale = d.riserSalePrice ?? 0
  const wallSale  = d.wallSalePrice  ?? 0
  const p50  = d.insul50Price ?? 0
  const p25  = d.insul25Price ?? 0
  const hasPrices = riserSale > 0 || wallSale > 0 || p50 > 0 || p25 > 0

  let r = 2

  ws.mergeCells(`A${r}:G${r}`)
  ws.getCell(`A${r}`).value = `적용단가 계산식  —  ${sv(d.project) || '현장명 없음'}  (${fmtYmd(d.orderDate) || '-'})`
  ws.getCell(`A${r}`).font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getCell(`A${r}`).fill = ORANGE_DARK
  ws.getRow(r).height = 26
  r += 2

  if (!hasPrices || !insul) {
    ws.mergeCells(`A${r}:G${r}`)
    ws.getCell(`A${r}`).value = '적용단가 계산 없음 — 판매단가 또는 차열재 단가 데이터가 없습니다.'
    ws.getCell(`A${r}`).font = { italic: true, color: { argb: 'FF888888' } }
    return
  }

  function sectionTitle(label: string, fill: ExcelJS.Fill) {
    ws.mergeCells(`A${r}:G${r}`)
    ws.getCell(`A${r}`).value = label
    ws.getCell(`A${r}`).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    ws.getCell(`A${r}`).fill = fill
    ws.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(r).height = 22
    borderRow(ws, r, 1, 7); r++
  }

  function labelRow(label: string, value: string) {
    ws.getRow(r).getCell(2).value = label
    ws.getRow(r).getCell(2).font = { bold: true, size: 9 }
    ws.mergeCells(`C${r}:G${r}`)
    ws.getRow(r).getCell(3).value = value
    ws.getRow(r).getCell(3).font = { size: 9 }
    borderRow(ws, r, 2, 7); r++
  }

  function formulaRow(formula: string, result: number | null) {
    ws.mergeCells(`B${r}:E${r}`)
    ws.getCell(`B${r}`).value = formula
    ws.getCell(`B${r}`).font = { italic: true, size: 9, color: { argb: 'FF555555' } }
    ws.mergeCells(`F${r}:G${r}`)
    if (result !== null) {
      ws.getCell(`F${r}`).value = result.toLocaleString() + '원/M'
      ws.getCell(`F${r}`).font = { bold: true, size: 11, color: { argb: 'FF0000FF' } }
    }
    ws.getRow(r).height = 20; r++
  }

  // ─ 입상 ─
  if (insul.riserRows.length > 0 && riserSale > 0) {
    sectionTitle('▶  입상 적용단가', GREEN_DARK)

    const riserTotalM = Math.round(totalLengthM(d.items.filter(i => i.type !== '차열재'), '입상') * 1000) / 1000
    const insul50Cost = insul.riserRolls50 * p50
    const insul25Cost = insul.rolls25 * p25
    const totalInsulCost = insul50Cost + insul25Cost
    const appliedRaw = (riserSale * riserTotalM - totalInsulCost) / riserTotalM
    const applied = Math.round(appliedRaw / 1000) * 1000

    labelRow('판매단가/M', `${riserSale.toLocaleString()}원/M`)
    labelRow('총 M', `${riserTotalM.toLocaleString()}M`)
    if (p50 > 0) labelRow('50T×400 차열재', `${insul.riserRolls50}롤 × ${p50.toLocaleString()}원 = ${insul50Cost.toLocaleString()}원`)
    if (p25 > 0) labelRow('25T×400 차열재', `${insul.rolls25}롤 × ${p25.toLocaleString()}원 = ${insul25Cost.toLocaleString()}원`)
    labelRow('차열재 합계', `${totalInsulCost.toLocaleString()}원`)
    r++

    formulaRow(
      `(${riserSale.toLocaleString()} × ${riserTotalM} - ${totalInsulCost.toLocaleString()}) ÷ ${riserTotalM} = ${Math.round(appliedRaw).toLocaleString()}원/M → 천원 단위 반올림`,
      applied,
    )
    r++
  }

  // ─ 벽체 ─
  if (insul.wallRows.length > 0 && wallSale > 0) {
    sectionTitle('▶  벽체 적용단가', BLUE_DARK)

    const wallTotalM = Math.round(totalLengthM(d.items.filter(i => i.type !== '차열재'), '벽체') * 1000) / 1000
    const insul50Cost = insul.wallRolls50 * p50
    const appliedRaw = (wallSale * wallTotalM - insul50Cost) / wallTotalM
    const applied = Math.round(appliedRaw / 1000) * 1000

    labelRow('판매단가/M', `${wallSale.toLocaleString()}원/M`)
    labelRow('총 M', `${wallTotalM.toLocaleString()}M`)
    if (p50 > 0) labelRow('50T×400 차열재', `${insul.wallRolls50}롤 × ${p50.toLocaleString()}원 = ${insul50Cost.toLocaleString()}원`)
    labelRow('차열재 합계', `${insul50Cost.toLocaleString()}원`)
    r++

    formulaRow(
      `(${wallSale.toLocaleString()} × ${wallTotalM} - ${insul50Cost.toLocaleString()}) ÷ ${wallTotalM} = ${Math.round(appliedRaw).toLocaleString()}원/M → 천원 단위 반올림`,
      applied,
    )
    r++
  }
}

// ─────────────────────────────────────────────
// Write a single item row (values only, no style change)
// ─────────────────────────────────────────────
function writeOneItem(ws: ExcelJS.Worksheet, r: number, idx: number, it: DuctOrderItem) {
  const isInsul = it.type === '차열재'
  const spec    = it.width && it.height ? `${it.width}×${it.height}` : (it.spec ?? '')
  const name    = isInsul ? '차열재' : `사각덕트 ${it.type}`
  const unit    = isInsul ? '롤' : 'SET'
  const peri    = itemPeri(it)

  ws.getRow(r).getCell(1).value = idx
  ws.getRow(r).getCell(2).value = name
  ws.getRow(r).getCell(3).value = isInsul ? (it.spec ?? '') : spec  // 규격: 차열재는 spec
  ws.getRow(r).getCell(4).value = unit
  ws.getRow(r).getCell(5).value = it.quantity
  ws.getRow(r).getCell(6).value = peri
  ws.getRow(r).getCell(7).value = it.unit_price || null
  ws.getRow(r).getCell(8).value = it.amount     || null
  ws.getRow(r).getCell(9).value = sv(it.note)
}

// ─────────────────────────────────────────────
// Sheets 3 & 4: write items with auto-expand
//
//  Template layout:
//    rows 20-36: item rows (17 capacity)
//    row 37:     운임비
//    row 38:     계  (SUM H20:H37)
//
//  If items > 17: insert extra rows before row 37 (inheriting style),
//  then update the SUM formula to cover the new range.
//  Sheet 3 also needs I(kaeRow) = H(kaeRow) for 납품금액 formula.
// ─────────────────────────────────────────────
function writeItemsS34(
  ws: ExcelJS.Worksheet,
  allItems: DuctOrderItem[],
  isSheet3: boolean,
) {
  const extra = Math.max(0, allItems.length - S34_ITEM_CAPACITY)

  // Insert rows before 운임비 if overflow (style is inherited from row above)
  if (extra > 0) {
    for (let i = 0; i < extra; i++) {
      ws.insertRow(S34_UNIMBI_ROW + i, [], 'i')
    }
  }

  // Actual 운임비 / 계 row numbers after expansion
  const unimBiRow = S34_UNIMBI_ROW + extra
  const kaeRow    = S34_KAE_ROW    + extra
  const lastItemRow = unimBiRow - 1  // = 36 + extra

  // Clear all item rows
  for (let r = S34_ITEM_START; r <= lastItemRow; r++) {
    for (let c = 1; c <= 10; c++) ws.getRow(r).getCell(c).value = null
  }

  // Write items
  allItems.forEach((it, i) => {
    writeOneItem(ws, S34_ITEM_START + i, i + 1, it)
  })

  // Update 계 SUM formula to cover expanded range
  ws.getCell(`H${kaeRow}`).value = {
    formula: `SUM(H${S34_ITEM_START}:H${lastItemRow})`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: (ws.getCell(`H${kaeRow}`) as any).result,
  } as ExcelJS.CellFormulaValue

  // Sheet 3 특이사항: B18 references I(kaeRow), so mirror H → I
  if (isSheet3) {
    ws.getCell(`I${kaeRow}`).value = {
      formula: `H${kaeRow}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: (ws.getCell(`H${kaeRow}`) as any).result,
    } as ExcelJS.CellFormulaValue
  }
}

// ─────────────────────────────────────────────
// Write 입상/벽체/전체길이 total length cells
// (I15 = 입상 total M, I16 = 벽체 total M, I17 = 전체 total M)
// ─────────────────────────────────────────────
function writeLengthCells(ws: ExcelJS.Worksheet, regular: DuctOrderItem[]) {
  const riserM = Math.round(totalLengthM(regular, '입상') * 100) / 100
  const wallM  = Math.round(totalLengthM(regular, '벽체') * 100) / 100
  ws.getCell('I15').value = riserM || null
  ws.getCell('I16').value = wallM  || null
  ws.getCell('I17').value = (riserM + wallM) || null
}

// ─────────────────────────────────────────────
// Sheet 3: 견적서
// ─────────────────────────────────────────────
function fillSheet3(
  wb: ExcelJS.Workbook,
  regular: DuctOrderItem[],
  insulItems: DuctOrderItem[],
) {
  const ws = wb.getWorksheet('3.견적서')!
  // Shared formula derivation can corrupt this cell — set it explicitly
  ws.getCell('C11').value = { formula: 'TEXT(C12,"yyyy-mm-dd")', result: '' } as ExcelJS.CellFormulaValue
  writeLengthCells(ws, regular)
  writeItemsS34(ws, [...regular, ...insulItems], true)
}

// ─────────────────────────────────────────────
// Sheet 4: 거래명세서
// ─────────────────────────────────────────────
function fillSheet4(
  wb: ExcelJS.Workbook,
  regular: DuctOrderItem[],
  insulItems: DuctOrderItem[],
) {
  const ws = wb.getWorksheet('4.거래명세서')!
  writeLengthCells(ws, regular)
  writeItemsS34(ws, [...regular, ...insulItems], false)
}

// ─────────────────────────────────────────────
// Sheet 5: 발주서
//   Row 16: headers already in template — no rewrite needed
//   Rows 17-38: item data (no 단가/금액, no group subtitle rows)
//   If items > 22: extend range and update SUMIF cells
// ─────────────────────────────────────────────
function fillSheet5(
  wb: ExcelJS.Workbook,
  regular: DuctOrderItem[],
  insulItems: DuctOrderItem[],
) {
  const ws = wb.worksheets.find(w => w.name.startsWith('5.'))!

  const allItems   = [...regular.filter(i => i.type === '입상'), ...insulItems, ...regular.filter(i => i.type === '벽체')]
  const extra      = Math.max(0, allItems.length - S5_ITEM_CAPACITY)
  const lastItemRow = S5_ITEM_START + S5_ITEM_CAPACITY - 1 + extra  // 38 + extra

  // Clear item rows
  for (let r = S5_ITEM_START; r <= lastItemRow + 5; r++) {
    for (let c = 1; c <= 9; c++) ws.getRow(r).getCell(c).value = null
  }

  // Write items (no 단가/금액: cols 7=비고, skip cols 7/8 of S3/4 layout)
  allItems.forEach((it, i) => {
    const r = S5_ITEM_START + i
    const isInsul = it.type === '차열재'
    const spec    = it.width && it.height ? `${it.width}×${it.height}` : (it.spec ?? '')
    const unit    = isInsul ? '롤' : 'SET'
    const peri    = itemPeri(it)
    const typeName = isInsul ? '차열재' : it.type  // "입상" | "벽체" | "차열재" — matches SUMIF B6

    ws.getRow(r).getCell(1).value = i + 1
    ws.getRow(r).getCell(2).value = typeName                              // B: 구분 (SUMIF 기준)
    ws.getRow(r).getCell(3).value = isInsul ? (it.spec ?? '') : spec     // C: 규격
    ws.getRow(r).getCell(4).value = unit                                  // D: 단위
    ws.getRow(r).getCell(5).value = it.quantity                           // E: 수량
    ws.getRow(r).getCell(6).value = peri                                  // F: M/개
    ws.getRow(r).getCell(7).value = '프로화이어 차열'                       // G: 비고
  })

  // Update SUMIF range if overflow
  if (extra > 0) {
    const newRange = `$B$${S5_ITEM_START}:$B$${lastItemRow}`
    const newQtyRange = `$E$${S5_ITEM_START}:$E$${lastItemRow}`
    ws.getCell('C6').value = { formula: `SUMIF(${newRange},B6,${newQtyRange})` } as ExcelJS.CellFormulaValue
    ws.getCell('H6').value = { formula: `SUMIF(${newRange},G6,${newQtyRange})` } as ExcelJS.CellFormulaValue
  }
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────
export async function generateProfireDuctExcel(data: DuctOrderFormData, visibleSheets?: number[]): Promise<Buffer> {
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

  const regular    = data.items.filter(it => it.type !== '차열재')
  const insulItems = data.items.filter(it => it.type === '차열재')
  const insul      = getInsulCalc(regular)

  fillSheet1(wb, data)
  fillSheet2(wb, data, insul)
  fillSheet2_2(wb, data, insul)
  fillSheet3(wb, regular, insulItems)
  fillSheet4(wb, regular, insulItems)
  fillSheet5(wb, regular, insulItems)

  if (visibleSheets && visibleSheets.length > 0) {
    wb.eachSheet(ws => {
      // 2-1.차열재 계산식 / 2-2.적용단가 계산식 → treat as sheet 2
      const prefix = ws.name.match(/^(\d+)/)
      const sheetNum = prefix ? parseInt(prefix[1]) : -1
      if (!visibleSheets.includes(sheetNum)) ws.state = 'hidden'
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export function buildDuctExcelFilename(data: DuctOrderFormData): string {
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
    data.orderNo        || '',
    `덕트(${data.manufacturer})`,
    summary,
    data.customerName   || '',
    data.project        || '',
    data.orderDate    ? fmt(data.orderDate)    : '',
    data.deliveryDate ? fmt(data.deliveryDate) : '',
    data.author         || '',
  ].filter(Boolean).join(' ^^ ') + '.xlsx'
}
