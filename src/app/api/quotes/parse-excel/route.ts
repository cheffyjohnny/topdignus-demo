import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

const NAME_KEYWORDS = ['품명', '품목명', '품목', '자재명', '재료명', '공종', '세목', '명칭']
const SPEC_KEYWORDS = ['규격', '사양', '형식', '치수']
const QTY_KEYWORDS  = ['수량', 'qty', 'quantity']

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

function cellStr(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('richText' in (value as any)) return (value as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('').trim()
    if ('result' in (value as any)) return String((value as ExcelJS.CellFormulaValue).result ?? '').trim()
    if ('text' in (value as any)) return String((value as any).text).trim()
  }
  return String(value).trim()
}

function detectColumns(rows: string[][]): { headerRowIdx: number; nameCol: number | null; specCol: number | null; qtyCol: number | null } {
  let bestRowIdx = 0
  let bestScore = 0

  for (let i = 0; i < Math.min(15, rows.length); i++) {
    let score = 0
    for (const cell of rows[i]) {
      const n = norm(cell)
      if (NAME_KEYWORDS.some(k => n.includes(k))) score += 3
      if (SPEC_KEYWORDS.some(k => n.includes(k))) score += 2
      if (QTY_KEYWORDS.some(k => n.includes(k)))  score += 2
    }
    if (score > bestScore) { bestScore = score; bestRowIdx = i }
  }

  if (bestScore === 0) return { headerRowIdx: 0, nameCol: null, specCol: null, qtyCol: null }

  const header = rows[bestRowIdx]
  let nameCol: number | null = null
  let specCol: number | null = null
  let qtyCol: number | null  = null

  for (let c = 0; c < header.length; c++) {
    const n = norm(header[c])
    if (nameCol === null && NAME_KEYWORDS.some(k => n.includes(k))) nameCol = c
    if (specCol === null && SPEC_KEYWORDS.some(k => n.includes(k))) specCol = c
    if (qtyCol === null  && QTY_KEYWORDS.some(k  => n.includes(k))) qtyCol  = c
  }

  return { headerRowIdx: bestRowIdx, nameCol, specCol, qtyCol }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file  = formData.get('file')  as File   | null
  const sheet = formData.get('sheet') as string | null

  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)

  const sheets = wb.worksheets.map(ws => ws.name)
  const ws = sheet ? (wb.getWorksheet(sheet) ?? wb.worksheets[0]) : wb.worksheets[0]
  if (!ws) return NextResponse.json({ error: '시트를 찾을 수 없습니다.' }, { status: 400 })

  // Determine max column
  let maxCol = 0
  ws.eachRow({ includeEmpty: false }, row => {
    if (row.cellCount > maxCol) maxCol = row.cellCount
  })

  const rows: string[][] = []
  ws.eachRow({ includeEmpty: false }, row => {
    const cells: string[] = []
    for (let c = 1; c <= maxCol; c++) {
      cells.push(cellStr(row.getCell(c).value))
    }
    rows.push(cells)
  })

  const detected = detectColumns(rows)

  return NextResponse.json({ sheets, selectedSheet: ws.name, rows, detected })
}
