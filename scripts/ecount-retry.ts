/**
 * ECOUNT 판매/구매입력 수동 재전송 스크립트
 * 실행: npx tsx scripts/ecount-retry.ts 5-6 6-2
 */

import fs from 'fs'
import path from 'path'

// .env.local 직접 로드
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
}
loadEnvLocal()

import { createClient } from '@supabase/supabase-js'
import { saveSale, savePurchase } from '../src/lib/ecount'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function retryOrder(orderNo: string) {
  console.log(`\n━━━ 처리 중: ${orderNo} ━━━`)

  const { data: order, error } = await supabase
    .from('pipe_orders')
    .select('*')
    .eq('order_no', orderNo)
    .single()

  if (error || !order) {
    console.error(`[${orderNo}] 주문 조회 실패:`, error?.message ?? '없음')
    return
  }

  console.log(`[${orderNo}] 주문 찾음 — vendor: ${order.vendor}, project: ${order.project}, status: ${order.status}`)

  // 단가표 + 거래처 등급 조회
  const [{ data: prices }, { data: customers }] = await Promise.all([
    supabase.from('pipe_prices').select('prod_key, unit_price'),
    supabase.from('customers').select('sale_pct').eq('name', order.vendor),
  ])

  const priceMap = new Map((prices ?? []).map((r: any) => [r.prod_key as string, Number(r.unit_price)]))
  const sale_pct: number | undefined = customers?.[0]?.sale_pct ?? undefined

  const orderData = {
    id:           order.id,
    order_no:     order.order_no ?? undefined,
    vendor:       order.vendor,
    manufacturer: order.manufacturer ?? '필립산업',
    sale_pct,
    order_client: order.order_client ?? null,
    delivery_dest: order.delivery_dest ?? null,
    project:      order.project ?? '',
    address:      order.address ?? '',
    contact_name: order.contact_name ?? '',
    contact_phone: order.contact_phone ?? '',
    order_date:   order.order_date ?? '',
    delivery_date: order.delivery_date ?? '',
    author:       order.author ?? '',
    notes:        order.notes ?? null,
    items:        order.items as any,
    priceMap,
    freight:      order.freight ?? 0,
  }

  try {
    await saveSale(orderData)
    console.log(`[${orderNo}] ✅ 판매입력 완료`)
  } catch (e: any) {
    console.error(`[${orderNo}] ❌ 판매입력 실패:`, e.message)
  }

  try {
    await savePurchase(orderData)
    console.log(`[${orderNo}] ✅ 구매입력 완료`)
  } catch (e: any) {
    console.error(`[${orderNo}] ❌ 구매입력 실패:`, e.message)
  }
}

async function main() {
  const orderNos = process.argv.slice(2)
  if (orderNos.length === 0) {
    console.error('사용법: npx tsx scripts/ecount-retry.ts <order_no> [order_no2 ...]')
    process.exit(1)
  }

  for (const orderNo of orderNos) {
    await retryOrder(orderNo)
  }

  console.log('\n완료')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
