import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import ExcelJS from 'exceljs'

const HEADERS = [
  { key: 'seq',                  label: 'NO',         width: 8  },
  { key: 'status',               label: '상태',        width: 10 },
  { key: 'dealership',           label: '대리점',      width: 14 },
  { key: 'project_name',         label: '현장명',      width: 30 },
  { key: 'address',              label: '주소',        width: 36 },
  { key: 'last_update',          label: '최근 수정일', width: 14 },
  { key: 'construction_company', label: '건설사',      width: 18 },
  { key: 'facility_company',     label: '설비사',      width: 18 },
  { key: 'contact_name',         label: '담당자',      width: 12 },
  { key: 'contact_phone',        label: '담당자 연락처', width: 16 },
  { key: 'scale',                label: '규모',        width: 14 },
  { key: 'notes',                label: '비고',        width: 30 },
  { key: 'source_url',           label: '링크',        width: 30 },
  { key: 'created_at',           label: '작성일',      width: 12 },
]

function fmtDate(v: string | null | undefined, tz = false): string {
  if (!v) return ''
  return new Date(v).toLocaleDateString('ko-KR', tz ? { timeZone: 'Asia/Seoul' } : undefined)
}

export async function GET() {
  const { data: leads, error } = await supabaseServer
    .from('sales_leads')
    .select('*')
    .order('seq', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('영업대상 현황')

  ws.columns = HEADERS.map(h => ({ header: h.label, key: h.key, width: h.width }))

  ws.getRow(1).height = 22
  ws.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3B5FC0' } },
    }
  })

  for (const lead of leads ?? []) {
    const row = ws.addRow({
      seq:                  lead.seq ?? '',
      status:               lead.status ?? '',
      dealership:           lead.dealership ?? '',
      project_name:         lead.project_name ?? '',
      address:              lead.address ?? '',
      last_update:          fmtDate(lead.last_update, true),
      construction_company: lead.construction_company ?? '',
      facility_company:     lead.facility_company ?? '',
      contact_name:         lead.contact_name ?? '',
      contact_phone:        lead.contact_phone ?? '',
      scale:                lead.scale ?? '',
      notes:                lead.notes ?? '',
      source_url:           lead.source_url ?? '',
      created_at:           fmtDate(lead.created_at),
    })
    row.height = 18
    row.eachCell(cell => {
      cell.alignment = { vertical: 'middle', wrapText: false }
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = encodeURIComponent(`영업대상_${today}.xlsx`)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
