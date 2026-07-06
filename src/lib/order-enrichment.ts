import type { OrderItem } from './parse-order'
import { getDisplayName, getUnit, normalizePipeForExcel } from './vendor-mappings'
import { buildPipeSleeveStructure, type PriceRowMin } from './price-utils'
import { supabaseServer } from './supabase-server'

export type PipeSleeveStructure = ReturnType<typeof buildPipeSleeveStructure>

// 단가표 행 전체 조회 (ps·priceMap 등을 함께 만들어야 할 때 사용)
export async function loadPipePriceRows(): Promise<(PriceRowMin & { manufacturer: string })[]> {
  const { data } = await supabaseServer
    .from('pipe_prices')
    .select('prod_key, internal_name, pipe_spec, sleeve_spec, unit_price, manufacturer')
  return (data ?? []) as (PriceRowMin & { manufacturer: string })[]
}

// 단가표에서 배관/슬리브 구조를 실시간으로 읽어와 enrichOrderItem에 사용할 ps 생성
export async function loadPipeSleeveStructure(): Promise<PipeSleeveStructure> {
  return buildPipeSleeveStructure(await loadPipePriceRows())
}

// internalName + spec → Part A (pipeSpec, sleeveSpec) + Part B (displayName, unit) 채우기
// ps: 단가표 데이터 기반 배관/슬리브 구조 (loadPipeSleeveStructure로 생성)
export function enrichOrderItem(item: OrderItem, ps: PipeSleeveStructure): OrderItem {
  if (!item.internalName) return item
  let pipeSpec: string | undefined
  let sleeveSpec: string | undefined

  if (ps.hasSleeve(item.internalName)) {
    if (item.pipeSpec) {
      // 드롭다운으로 직접 선택된 경우(new/parser 페이지): 그대로 사용
      pipeSpec = item.pipeSpec
      sleeveSpec = item.sleeveSpec
    } else {
      // spec 문자열에서 파싱: "20A*75A" → pipeSpec="20A", sleeveSpec="75A"
      const parts = item.spec.split('*')
      pipeSpec = normalizePipeForExcel(parts[0]?.trim() ?? '') || undefined
      sleeveSpec = normalizePipeForExcel(parts[1]?.trim() ?? '') || undefined
    }
  } else if (ps.isSpecOnly(item.internalName)) {
    // spec-only 품목(차열재·실란트 등): 드롭다운 pipeSpec 우선, 없으면 spec
    pipeSpec = item.pipeSpec || item.spec || undefined
    sleeveSpec = undefined
  } else {
    pipeSpec = item.pipeSpec
    sleeveSpec = item.sleeveSpec
  }

  return {
    ...item,
    pipeSpec,
    sleeveSpec,
    displayName: item.displayName || getDisplayName(item.internalName),
    unit: item.unit || getUnit(item.internalName),
  }
}
