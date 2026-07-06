/**
 * 단가표 시드 스크립트
 * 엑셀 "단가표" 시트 → Supabase prices 테이블 upsert
 *
 * 실행: npx tsx scripts/seed-prices.ts
 *
 * prod_key 규칙:
 *   슬리브 있는 품목: {internal_name}_{pipe_spec}_{sleeve_spec}  (예: 입상_SU_고정틀_20A_75A)
 *   슬리브 없는 품목: {internal_name}_{pipe_spec}               (예: 차열재_25T*200*7200)
 */

import fs from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'

// .env.local 로드
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) { console.error('.env.local 없음:', envPath); process.exit(1) }
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx === -1) continue
    const key = t.slice(0, idx).trim()
    const val = t.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!supabaseUrl || !supabaseKey) { console.error('환경변수 없음'); process.exit(1) }
const supabase = createClient(supabaseUrl, supabaseKey)

function cellStr(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('')
    if ('formula' in v) { const r = (v as ExcelJS.CellFormulaValue).result; return r != null ? String(r).trim() : '' }
    if ('error' in v) return ''
    if (v instanceof Date) return v.toISOString()
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

function nullIfEmpty(s: string): string | null { return s === '' ? null : s }
function nullIfZero(n: number | null): number | null { return n === 0 ? null : n }

async function main() {
  const excelPath = path.resolve(process.cwd(), '단가표 & 계산식.xlsx')
  if (!fs.existsSync(excelPath)) { console.error('엑셀 파일 없음:', excelPath); process.exit(1) }

  console.log('엑셀 읽는 중:', excelPath)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(excelPath)

  const ws = wb.getWorksheet('단가표')
  if (!ws) { console.error('"단가표" 시트 없음'); process.exit(1) }
  console.log(`행 수: ${ws.rowCount}`)

  interface PriceRow {
    prod_key: string
    internal_name: string
    pipe_spec: string | null
    sleeve_spec: string | null
    unit_price: number
    heat_type: string[] | null   // 단일 종류는 [col7], 없으면 null
    heat_length_mm: number | null
    sealant_volume: string | null
    note: string | null
  }

  const rows: PriceRow[] = []
  const seenKeys = new Set<string>()

  for (let r = 3; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const col1  = cellStr(row.getCell(1).value)   // 품명
    const col2  = cellStr(row.getCell(2).value)   // 배관 (입상_SU_고정틀_20A 형식) 또는 규격
    const col3  = cellStr(row.getCell(3).value)   // 슬리브 (없으면 '')
    const col4  = cellNum(row.getCell(4).value)   // 단가
    const col5  = cellNum(row.getCell(5).value)   // 협가
    const col6  = cellNum(row.getCell(6).value)   // 판매가
    const col7  = cellStr(row.getCell(7).value)   // 차열재 종류 (단일)
    const col8  = cellNum(row.getCell(8).value)   // 차열재 길이 mm
    // col9 (차열재 개수), col10 (차열재 가격) — 제거됨, TEXT[] 방식으로 대체
    const col11 = cellNum(row.getCell(11).value)  // 실란트 용량
    const col13 = cellStr(row.getCell(13).value)  // 비고1
    const col14 = cellStr(row.getCell(14).value)  // 비고2

    if (!col1 && !col2) continue
    if (col4 === null || col4 <= 0) continue

    const hasSleeve = col3 !== ''
    // pipe_spec: 슬리브 있으면 col2에서 내부품명 prefix 제거, 없으면 col2 그대로
    const pipeSpec = hasSleeve ? col2.replace(`${col1}_`, '') : col2
    const sleeveSpec = hasSleeve ? col3 : null

    const prodKey = hasSleeve
      ? `${col1}_${pipeSpec}_${col3}`
      : `${col1}_${col2}`

    // 중복 key 스킵 (같은 배관+슬리브 조합이 여러 행인 경우 첫 번째 값 사용)
    if (seenKeys.has(prodKey)) {
      console.warn(`  중복 skip: ${prodKey}`)
      continue
    }
    seenKeys.add(prodKey)

    const note = [col13, col14].filter(Boolean).join(' / ').trim()

    rows.push({
      prod_key: prodKey,
      internal_name: col1,
      pipe_spec: pipeSpec,
      sleeve_spec: sleeveSpec,
      unit_price: col4,
      heat_type: col7 ? [col7] : null,
      heat_length_mm: col8,
      sealant_volume: col11 != null ? String(col11) : null,
      note: nullIfEmpty(note),
    })
  }

  console.log(`파싱 완료: ${rows.length}개`)
  console.log('\n--- 처음 3개 ---')
  rows.slice(0, 3).forEach(r => console.log(JSON.stringify(r)))
  console.log('--- 마지막 3개 ---')
  rows.slice(-3).forEach(r => console.log(JSON.stringify(r)))

  const BATCH = 100
  let done = 0
  console.log('\nSupabase upsert 시작...')
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('pipe_prices').upsert(batch, { onConflict: 'prod_key' })
    if (error) { console.error('배치 실패:', error.message); process.exit(1) }
    done += batch.length
    console.log(`  ${done}/${rows.length}`)
  }
  console.log(`\n완료: ${done}개 upsert`)
}

main().catch(e => { console.error(e); process.exit(1) })
