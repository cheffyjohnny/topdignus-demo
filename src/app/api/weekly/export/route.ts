import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'
import ExcelJS from 'exceljs'

const STATUS_COLORS: Record<string, string> = {
  '수주': 'FFBFDBFF',
  '발주': 'FFFEF3C7',
  '납품': 'FFD1FAE5',
  '취소': 'FFF3F4F6',
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const from     = sp.get('from') ?? ''
  const to       = sp.get('to')   ?? ''
  const dateMode = sp.get('dateMode') ?? '수주일'

  if (!from || !to) return NextResponse.json({ error: '날짜 범위 필요' }, { status: 400 })

  const toExclusive = new Date(to)
  toExclusive.setDate(toExclusive.getDate() + 1)
  const toExStr = toExclusive.toISOString().slice(0, 10)

  const dateField = dateMode === '납품일' ? 'delivery_date' : 'order_date'

  const [{ data: pipeRows }, { data: ductRows }] = await Promise.all([
    supabaseServer
      .from('pipe_orders')
      .select('order_no, vendor, manufacturer, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice')
      .gte(dateField, from)
      .lt(dateField, toExStr)
      .order(dateField, { ascending: false }),
    supabaseServer
      .from('duct_orders')
      .select('order_no, customer_name, manufacturer, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight, no_invoice')
      .gte(dateField, from)
      .lt(dateField, toExStr)
      .order(dateField, { ascending: false }),
  ])

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('주간현황')

  ws.columns = [
    { header: 'No',        key: 'no',            width: 6  },
    { header: '유형',      key: 'type',           width: 8  },
    { header: '수주서번호', key: 'order_no',      width: 14 },
    { header: '업체',      key: 'vendor',         width: 16 },
    { header: '제조사',    key: 'manufacturer',   width: 14 },
    { header: '현장명',    key: 'project',        width: 20 },
    { header: '수주일',    key: 'order_date',     width: 12 },
    { header: '납품일',    key: 'delivery_date',  width: 12 },
    { header: '상태',      key: 'status',         width: 8  },
    { header: '계산서미발행', key: 'no_invoice',  width: 12 },
    { header: '공급가액',  key: 'supply',         width: 14 },
    { header: '매출(VAT)', key: 'sale_vat',       width: 14 },
    { header: '매입(VAT)', key: 'buy_vat',        width: 14 },
    { header: '영업이익',  key: 'profit',         width: 14 },
  ]

  // 헤더 스타일
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, size: 10 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 18

  const allRows = [
    ...(pipeRows ?? []).map(r => ({ ...r, vendor: r.vendor, type: '배관' })),
    ...(ductRows ?? []).map(r => ({ ...r, vendor: r.customer_name, type: '덕트' })),
  ].sort((a, b) => {
    const da = (dateMode === '납품일' ? a.delivery_date : a.order_date) ?? ''
    const db = (dateMode === '납품일' ? b.delivery_date : b.order_date) ?? ''
    return db.localeCompare(da)
  })

  allRows.forEach((r, i) => {
    const ni = Boolean(r.no_invoice)
    const sale = ni ? 0 : Number(r.sale_amount ?? 0)
    const purchase = ni ? 0 : Number(r.purchase_amount ?? 0)
    const freight = ni ? 0 : Number(r.freight ?? 0)
    const supply  = sale + freight
    const saleVat = supply > 0 ? Math.round(supply * 1.1) : null
    const buyVat  = purchase > 0 ? Math.round((purchase + freight) * 1.1) : null
    const profit  = purchase > 0 ? sale - purchase : null

    const row = ws.addRow({
      no:           i + 1,
      type:         r.type,
      order_no:     r.order_no ?? '',
      vendor:       r.vendor ?? '',
      manufacturer: r.manufacturer ?? '',
      project:      r.project ?? '',
      order_date:   r.order_date ?? '',
      delivery_date: r.delivery_date ?? '',
      status:       r.status,
      no_invoice:   ni ? '미발행' : '',
      supply:       supply || null,
      sale_vat:     saleVat,
      buy_vat:      buyVat,
      profit:       profit,
    })

    row.font = { size: 10 }
    const statusColor = STATUS_COLORS[r.status]
    if (statusColor) {
      row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } }
    }
    if (ni) {
      row.getCell('no_invoice').font = { size: 10, color: { argb: 'FF9CA3AF' } }
    }

    // 금액 셀 오른쪽 정렬 + 천단위
    for (const key of ['supply', 'sale_vat', 'buy_vat', 'profit'] as const) {
      const cell = row.getCell(key)
      cell.numFmt = '#,##0'
      cell.alignment = { horizontal: 'right' }
    }

    row.getCell('type').alignment = { horizontal: 'center' }
    row.getCell('status').alignment = { horizontal: 'center' }
    row.getCell('no_invoice').alignment = { horizontal: 'center' }
    row.getCell('no').alignment = { horizontal: 'center' }
  })

  // 합계 행
  const validRows = allRows.filter(r => !r.no_invoice)
  const totalSupply  = validRows.reduce((s, r) => s + Number(r.sale_amount ?? 0) + Number(r.freight ?? 0), 0)
  const totalSaleVat = totalSupply > 0 ? Math.round(totalSupply * 1.1) : 0
  const totalBuyVat  = Math.round(validRows.reduce((s, r) => s + (Number(r.purchase_amount ?? 0) + Number(r.freight ?? 0)), 0) * 1.1)
  const totalProfit  = validRows.reduce((s, r) => s + Number(r.sale_amount ?? 0) - Number(r.purchase_amount ?? 0), 0)

  const totalRow = ws.addRow({
    no: '', type: '', order_no: '', vendor: '', manufacturer: '', project: '',
    order_date: '', delivery_date: '', status: '', no_invoice: `합계 ${allRows.length}건`,
    supply: totalSupply || null, sale_vat: totalSaleVat || null,
    buy_vat: totalBuyVat || null, profit: totalProfit || null,
  })
  totalRow.font = { bold: true, size: 10 }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
  for (const key of ['supply', 'sale_vat', 'buy_vat', 'profit'] as const) {
    const cell = totalRow.getCell(key)
    cell.numFmt = '#,##0'
    cell.alignment = { horizontal: 'right' }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = encodeURIComponent(`주간현황_${from}_${to}_${dateMode}기준.xlsx`)
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
