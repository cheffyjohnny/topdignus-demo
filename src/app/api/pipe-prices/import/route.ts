import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ExcelJS from 'exceljs'

// 한글 헤더 → 내부 필드명 매핑 (내보내기 파일과 동일한 한글 헤더 지원)
const KO_TO_EN: Record<string, string> = {
  '제품키':          'prod_key',
  '제조사':          'manufacturer',
  '품목명':          'internal_name',
  '배관':            'pipe_spec',
  '슬리브':          'sleeve_spec',
  '단가':            'unit_price',
  '차열재 구성 (참고)': 'heat_type_label',  // 읽기 전용 참고용
  '차열재 길이(mm)': 'heat_length_mm',
  '실란트 용량':     'sealant_volume',
  '비고':            'note',
}

function cellStr(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('')
    if ('formula' in v) { const r = (v as ExcelJS.CellFormulaValue).result; return r != null ? String(r).trim() : '' }
    if ('error' in v) return ''
  }
  return String(v).trim()
}

function cellNum(v: ExcelJS.CellValue): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  if (typeof v === 'object' && 'formula' in v) {
    const r = (v as ExcelJS.CellFormulaValue).result
    return typeof r === 'number' ? r : null
  }
  const n = Number(String(v).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

  const arrayBuf = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(Buffer.from(arrayBuf) as any)

  const ws = wb.getWorksheet('단가표') ?? wb.worksheets[0]
  if (!ws) return NextResponse.json({ error: '"단가표" 시트를 찾을 수 없습니다.' }, { status: 400 })

  // 헤더 행에서 컬럼 인덱스 파악 (한글/영문 모두 지원)
  const headers: Record<string, number> = {}
  ws.getRow(1).eachCell((cell, colNum) => {
    const raw = cellStr(cell.value)
    if (!raw) return
    const key = KO_TO_EN[raw] ?? raw  // 한글이면 영문으로, 아니면 그대로
    headers[key] = colNum
  })

  const required = ['prod_key', 'internal_name']
  for (const col of required) {
    if (!headers[col]) return NextResponse.json({ error: `헤더에 "${col}" (또는 한글 "제품키"/"품목명") 컬럼이 없습니다.` }, { status: 400 })
  }

  function get(row: ExcelJS.Row, col: string): ExcelJS.CellValue {
    return headers[col] ? row.getCell(headers[col]).value : null
  }

  const rows: object[] = []
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const prod_key = cellStr(get(row, 'prod_key'))
    if (!prod_key) return

    rows.push({
      prod_key,
      manufacturer:   cellStr(get(row, 'manufacturer')) || '필립산업',
      internal_name:  cellStr(get(row, 'internal_name')) || null,
      pipe_spec:      cellStr(get(row, 'pipe_spec')) || null,
      sleeve_spec:    cellStr(get(row, 'sleeve_spec')) || null,
      unit_price:     cellNum(get(row, 'unit_price')) ?? 0,
      // heat_type은 읽기 전용 참고 컬럼 — 가져오기 시 DB 변경 없음
      heat_length_mm: cellNum(get(row, 'heat_length_mm')),
      sealant_volume: cellStr(get(row, 'sealant_volume')) || null,
      note:           cellStr(get(row, 'note')) || null,
    })
  })

  return NextResponse.json({ rows, count: rows.length })
}
