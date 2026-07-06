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
  const type     = sp.get('type')     ?? '전체'
  const status   = sp.get('status')   ?? '전체'
  const dateFrom = sp.get('dateFrom') ?? ''
  const dateTo   = sp.get('dateTo')   ?? ''
  const vendor   = sp.get('vendor')   ?? ''

  let pipeRows: any[] = []
  let ductRows: any[] = []

  if (type !== '덕트') {
    let q = supabaseServer
      .from('pipe_orders')
      .select('order_no, vendor, manufacturer, project, contact_name, order_date, delivery_date, author, status, sale_amount, purchase_amount, freight')
      .order('order_date', { ascending: false })
    if (status !== '전체') q = q.eq('status', status)
    if (dateFrom) q = q.gte('order_date', dateFrom)
    if (dateTo)   q = q.lte('order_date', dateTo)
    if (vendor)   q = q.eq('vendor', vendor)
    const { data } = await q
    pipeRows = data ?? []
  }

  if (type !== '배관') {
    let q = supabaseServer
      .from('duct_orders')
      .select('order_no, customer_name, manufacturer, project, contact_name, order_date, delivery_date, author, status, sale_amount, purchase_amount, freight')
      .order('order_date', { ascending: false })
    if (status !== '전체') q = q.eq('status', status)
    if (dateFrom) q = q.gte('order_date', dateFrom)
    if (dateTo)   q = q.lte('order_date', dateTo)
    if (vendor)   q = q.eq('customer_name', vendor)
    const { data } = await q
    ductRows = data ?? []
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('수주현황')

  const amountCols = [
    { header: '공급가액',    key: 'sale_amount',    width: 14 },
    { header: '운임비',      key: 'freight',        width: 12 },
    { header: '매출(VAT)',   key: 'sale_vat',       width: 14 },
    { header: '매입(VAT)',   key: 'buy_vat',        width: 14 },
    { header: '영업이익',    key: 'profit',         width: 14 },
  ]
  function calcRow(r: any) {
    const sale = r.sale_amount ?? 0
    const purchase = r.purchase_amount ?? 0
    const freight = r.freight ?? 0
    return {
      sale_amount: (sale + freight) || null,
      freight:     freight || null,
      sale_vat:    sale ? Math.round((sale + freight) * 1.1) : null,
      buy_vat:     purchase ? Math.round((purchase + freight) * 1.1) : null,
      profit:      purchase ? (sale - purchase) : null,
    }
  }

  if (type === '배관') {
    ws.columns = [
      { header: '번호',       key: 'no',            width: 7  },
      { header: '수주서번호', key: 'order_no',       width: 14 },
      { header: '수주일',     key: 'order_date',     width: 13 },
      { header: '납품희망일', key: 'delivery_date',  width: 13 },
      { header: '업체',       key: 'vendor',         width: 20 },
      { header: '현장명',     key: 'project',        width: 26 },
      { header: '제조사',     key: 'manufacturer',   width: 14 },
      { header: '인수자',     key: 'contact_name',   width: 12 },
      { header: '작성자',     key: 'author',         width: 10 },
      { header: '상태',       key: 'status',         width: 10 },
      ...amountCols,
    ]
    pipeRows.forEach((r, i) => ws.addRow({
      no: i + 1, order_no: r.order_no ?? '',
      order_date: r.order_date?.slice(0, 10) ?? '', delivery_date: r.delivery_date?.slice(0, 10) ?? '',
      vendor: r.vendor ?? '', project: r.project ?? '', manufacturer: r.manufacturer ?? '',
      contact_name: r.contact_name ?? '', author: r.author ?? '', status: r.status ?? '',
      ...calcRow(r),
    }))
  } else if (type === '덕트') {
    ws.columns = [
      { header: '번호',       key: 'no',            width: 7  },
      { header: '수주서번호', key: 'order_no',       width: 14 },
      { header: '수주일',     key: 'order_date',     width: 13 },
      { header: '납품희망일', key: 'delivery_date',  width: 13 },
      { header: '제조사',     key: 'manufacturer',   width: 14 },
      { header: '업체명',     key: 'vendor',         width: 20 },
      { header: '현장명',     key: 'project',        width: 26 },
      { header: '인수자',     key: 'contact_name',   width: 12 },
      { header: '작성자',     key: 'author',         width: 10 },
      { header: '상태',       key: 'status',         width: 10 },
      ...amountCols,
    ]
    ductRows.forEach((r, i) => ws.addRow({
      no: i + 1, order_no: r.order_no ?? '',
      order_date: r.order_date?.slice(0, 10) ?? '', delivery_date: r.delivery_date?.slice(0, 10) ?? '',
      manufacturer: r.manufacturer ?? '', vendor: r.customer_name ?? '', project: r.project ?? '',
      contact_name: r.contact_name ?? '', author: r.author ?? '', status: r.status ?? '',
      ...calcRow(r),
    }))
  } else {
    ws.columns = [
      { header: '번호',       key: 'no',            width: 7  },
      { header: '유형',       key: 'type',           width: 8  },
      { header: '수주서번호', key: 'order_no',       width: 14 },
      { header: '수주일',     key: 'order_date',     width: 13 },
      { header: '납품희망일', key: 'delivery_date',  width: 13 },
      { header: '업체',       key: 'vendor',         width: 20 },
      { header: '현장명',     key: 'project',        width: 26 },
      { header: '인수자',     key: 'contact_name',   width: 12 },
      { header: '작성자',     key: 'author',         width: 10 },
      { header: '상태',       key: 'status',         width: 10 },
      ...amountCols,
    ]
    const combined = [
      ...pipeRows.map(r => ({ ...r, _type: '배관', _vendor: r.vendor })),
      ...ductRows.map(r => ({ ...r, _type: '덕트', _vendor: r.customer_name })),
    ].sort((a, b) => (b.order_date ?? '').localeCompare(a.order_date ?? ''))
    combined.forEach((r, i) => ws.addRow({
      no: i + 1, type: r._type, order_no: r.order_no ?? '',
      order_date: r.order_date?.slice(0, 10) ?? '', delivery_date: r.delivery_date?.slice(0, 10) ?? '',
      vendor: r._vendor ?? '', project: r.project ?? '',
      contact_name: r.contact_name ?? '', author: r.author ?? '', status: r.status ?? '',
      ...calcRow(r),
    }))
  }

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
  const today = new Date().toISOString().slice(0, 10)
  const filename = `수주현황_${today}.xlsx`

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="orders_${today}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
