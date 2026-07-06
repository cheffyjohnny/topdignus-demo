import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'
import { calcNegoPrice } from '@/lib/price-utils'
import ExcelJS from 'exceljs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from('pipe_prices')
    .select('prod_key, manufacturer, internal_name, pipe_spec, sleeve_spec, unit_price, heat_type, heat_length_mm, sealant_volume, note')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  function specToNum(s: string | null): number {
    if (!s) return Infinity
    const m = s.match(/^(\d+)/)
    return m ? parseInt(m[1], 10) : Infinity
  }

  function sortRows<T extends { pipe_spec: string | null; sleeve_spec: string | null }>(a: T, b: T): number {
    const pa = specToNum(a.pipe_spec), pb = specToNum(b.pipe_spec)
    if (pa !== pb) {
      if (pa === Infinity && pb === Infinity) return (a.pipe_spec ?? '').localeCompare(b.pipe_spec ?? '')
      return pa - pb
    }
    const sa = specToNum(a.sleeve_spec), sb = specToNum(b.sleeve_spec)
    if (sa !== sb) {
      if (sa === Infinity && sb === Infinity) return (a.sleeve_spec ?? '').localeCompare(b.sleeve_spec ?? '')
      return sa - sb
    }
    return 0
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const mfrCmp = (a.manufacturer ?? '').localeCompare(b.manufacturer ?? '', 'ko')
    if (mfrCmp !== 0) return mfrCmp
    const nameCmp = (a.internal_name ?? '').localeCompare(b.internal_name ?? '', 'en')
    return nameCmp !== 0 ? nameCmp : sortRows(a, b)
  })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('단가표')

  ws.columns = [
    { header: '제품키',           key: 'prod_key',       width: 45 },
    { header: '제조사',           key: 'manufacturer',   width: 16 },
    { header: '품목명',           key: 'internal_name',  width: 30 },
    { header: '배관',             key: 'pipe_spec',      width: 12 },
    { header: '슬리브',           key: 'sleeve_spec',    width: 16 },
    { header: '단가',             key: 'unit_price',     width: 14 },
    { header: '협가 (×200%)',     key: 'nego_price',     width: 14 },
    { header: '차열재 구성 (참고)',key: 'heat_type',      width: 30 },
    { header: '차열재 길이(mm)',  key: 'heat_length_mm', width: 16 },
    { header: '실란트 용량',      key: 'sealant_volume', width: 14 },
    { header: '비고',             key: 'note',           width: 30 },
  ]

  for (const row of sorted) {
    const heatLabel = Array.isArray(row.heat_type) && row.heat_type.length > 0
      ? row.heat_type.join(', ')
      : null
    ws.addRow({ ...row, heat_type: heatLabel, nego_price: calcNegoPrice(row.unit_price ?? 0) })
  }

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }

  ws.columns.forEach(col => {
    if (col.key === 'nego_price' && col.eachCell) {
      col.eachCell({ includeEmpty: false }, (cell, rowNum) => {
        if (rowNum === 1) return
        cell.font = { color: { argb: 'FF888888' } }
      })
    }
  })

  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10)
  const filename = `배관단가표_${today}.xlsx`

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="pipe_price_table_${today}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
