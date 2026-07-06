import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'
import ExcelJS from 'exceljs'

const STATUS_COLORS: Record<string, string> = {
  수주: 'FFBFDBFF',
  발주: 'FFFEF3C7',
  납품: 'FFD1FAE5',
  취소: 'FFF3F4F6',
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const year = Number(sp.get('year'))
  const month = Number(sp.get('month'))

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'year and month required' }, { status: 400 })
  }

  const kstOffset = 9 * 60 * 60 * 1000
  const monthStartUTC = new Date(Date.UTC(year, month - 1, 1) - kstOffset).toISOString()
  const monthEndUTC   = new Date(Date.UTC(year, month,     1) - kstOffset).toISOString()

  const [{ data: pipeData }, { data: ductData }] = await Promise.all([
    supabaseServer
      .from('pipe_orders')
      .select('order_no, vendor, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight')
      .gte('created_at', monthStartUTC)
      .lt('created_at', monthEndUTC)
      .order('order_date', { ascending: false }),
    supabaseServer
      .from('duct_orders')
      .select('order_no, customer_name, project, order_date, delivery_date, status, sale_amount, purchase_amount, freight')
      .gte('created_at', monthStartUTC)
      .lt('created_at', monthEndUTC)
      .order('order_date', { ascending: false }),
  ])

  const combined = [
    ...(pipeData ?? []).map(r => ({
      type: '배관', vendor: r.vendor ?? '', project: r.project ?? '',
      order_date: r.order_date?.slice(0, 10) ?? '',
      delivery_date: r.delivery_date?.slice(0, 10) ?? '',
      status: r.status ?? '',
      sale_amount: Number(r.sale_amount ?? 0),
      purchase_amount: Number(r.purchase_amount ?? 0),
      freight: Number(r.freight ?? 0),
    })),
    ...(ductData ?? []).map(r => ({
      type: '덕트', vendor: r.customer_name ?? '', project: r.project ?? '',
      order_date: r.order_date?.slice(0, 10) ?? '',
      delivery_date: r.delivery_date?.slice(0, 10) ?? '',
      status: r.status ?? '',
      sale_amount: Number(r.sale_amount ?? 0),
      purchase_amount: Number(r.purchase_amount ?? 0),
      freight: Number(r.freight ?? 0),
    })),
  ].sort((a, b) => b.order_date.localeCompare(a.order_date))

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`${year}년 ${month}월`)

  ws.columns = [
    { header: '번호',       key: 'no',            width: 7  },
    { header: '유형',       key: 'type',           width: 8  },
    { header: '업체',       key: 'vendor',         width: 20 },
    { header: '현장명',     key: 'project',        width: 26 },
    { header: '발주일',     key: 'order_date',     width: 13 },
    { header: '납품예정일', key: 'delivery_date',  width: 13 },
    { header: '상태',       key: 'status',         width: 10 },
    { header: '공급가액',   key: 'supply_amt',     width: 14 },
    { header: '매출(VAT)',  key: 'sale_vat',       width: 14 },
    { header: '매입(VAT)',  key: 'buy_vat',        width: 14 },
  ]

  combined.forEach((r, i) => {
    const supply = r.sale_amount + r.freight
    const purchase = r.purchase_amount + r.freight
    ws.addRow({
      no:            i + 1,
      type:          r.type,
      vendor:        r.vendor,
      project:       r.project,
      order_date:    r.order_date,
      delivery_date: r.delivery_date,
      status:        r.status,
      supply_amt:    supply || null,
      sale_vat:      r.sale_amount ? Math.round(supply * 1.1) : null,
      buy_vat:       r.purchase_amount ? Math.round(purchase * 1.1) : null,
    })
  })

  // 합계 행
  const totalSupply   = combined.reduce((s, r) => s + r.sale_amount + r.freight, 0)
  const totalSaleVat  = combined.reduce((s, r) => s + (r.sale_amount ? Math.round((r.sale_amount + r.freight) * 1.1) : 0), 0)
  const totalBuyVat   = combined.reduce((s, r) => s + (r.purchase_amount ? Math.round((r.purchase_amount + r.freight) * 1.1) : 0), 0)
  const sumRow = ws.addRow({
    no: '', type: '', vendor: '합계', project: '', order_date: '', delivery_date: '', status: '',
    supply_amt: totalSupply || null,
    sale_vat:   totalSaleVat || null,
    buy_vat:    totalBuyVat || null,
  })
  sumRow.font = { bold: true }
  sumRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } }

  // 헤더 스타일
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
  headerRow.alignment = { vertical: 'middle' }

  // 상태 셀 배경색
  const statusColIdx = ws.columns.findIndex(c => c.key === 'status') + 1
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const cell = row.getCell(statusColIdx)
    const color = STATUS_COLORS[String(cell.value ?? '')]
    if (color) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
  })

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `월별현황_${year}년_${month}월.xlsx`

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="monthly_${year}_${month}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
