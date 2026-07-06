export function buildPriceMap(prices: { prod_key: string; unit_price: number }[]): Map<string, number> {
  return new Map(prices.map(r => [r.prod_key, Number(r.unit_price)]))
}

export function buildSealantMap(prices: { prod_key: string; sealant_volume: string | null }[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of prices) {
    const v = parseFloat(r.sealant_volume ?? '')
    if (!isNaN(v)) map.set(r.prod_key, v)
  }
  return map
}

export function lookupUnitPrice(
  priceMap: Map<string, number>,
  internalName?: string,
  pipeSpec?: string,
  sleeveSpec?: string,
): number | undefined {
  if (!internalName) return undefined
  if (pipeSpec && sleeveSpec) return priceMap.get(`${internalName}_${pipeSpec}_${sleeveSpec}`)
  if (pipeSpec) return priceMap.get(`${internalName}_${pipeSpec}`)
  return undefined
}

export function calcNegoPrice(unitPrice: number): number {
  return Math.round(unitPrice * 2)
}

/** pct: 거래처 판매율 (예: 55 → 협가의 55%), 일의 자리 버림 */
export function calcSalePrice(unitPrice: number, pct: number): number {
  return Math.floor(calcNegoPrice(unitPrice) * pct / 1000) * 10
}

export function lookupSalePrice(
  priceMap: Map<string, number>,
  pct: number,
  internalName?: string,
  pipeSpec?: string,
  sleeveSpec?: string,
): number | undefined {
  const unitPrice = lookupUnitPrice(priceMap, internalName, pipeSpec, sleeveSpec)
  if (unitPrice === undefined) return undefined
  return calcSalePrice(unitPrice, pct)
}

export interface PriceRowMin {
  prod_key: string
  internal_name: string
  pipe_spec: string | null
  sleeve_spec: string | null
  unit_price: number
  manufacturer?: string
  // 일위대가 계산용 (선택적)
  heat_type?: string[] | null      // 차열재 타입 배열 (중복 = 개수)
  heat_length_mm?: number | null   // 개소당 공통 길이 (mm)
  sealant_volume?: string | null   // 개소당 사용량 (개) — 단가는 실란트 행에서 조회
}

/**
 * heat_type 포맷 "38T*400*4800" 에서 롤 길이(mm) 파싱
 * 마지막 *세그먼트가 롤 길이. 파싱 불가 시 fallback.
 */
export function getHeatRollLength(heatType: string): number {
  const parts = heatType.split('*')
  if (parts.length >= 2) {
    const last = parseFloat(parts[parts.length - 1])
    if (!isNaN(last) && last >= 1000) return last
  }
  return heatType.includes('25') ? 7200 : 3600
}

/**
 * 일위대가 원가 계산 (개소당 단가 + 차열재 비례 + 실란트)
 * heat_type: string[] — 중복 횟수가 개수, 가격은 heatPriceMap에서 조회
 * 실란트: sealantPrice(실란트 행 단가) × sealant_volume(개소당 사용량)
 */
export function calcIlwidaegaRaw(
  row: {
    unit_price: number
    heat_type?: string[] | null
    heat_length_mm?: number | null
    sealant_volume?: string | null
  },
  heatPriceMap?: Map<string, number>, // type → unit_price (차열재 행)
  sealantPrice?: number,              // 실란트 행 unit_price (런타임 조회)
): number {
  let total = row.unit_price

  const types = row.heat_type
  if (Array.isArray(types) && types.length > 0 && (row.heat_length_mm ?? 0) > 0) {
    const counts = new Map<string, number>()
    for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1)
    for (const [type, count] of counts) {
      const price = heatPriceMap?.get(type) ?? 0
      if (price > 0) {
        const rollLen = getHeatRollLength(type)
        total += (price * row.heat_length_mm! / rollLen) * count
      }
    }
  }

  const sealantVol = parseFloat(row.sealant_volume ?? '')
  if (!isNaN(sealantVol) && sealantVol > 0 && (sealantPrice ?? 0) > 0) {
    total += sealantPrice! * sealantVol
  }

  return total
}

/**
 * 일위대가 판매가 = 일위대가원가 × 2(협가) × pct% → 십원 단위 반올림
 */
export function calcIlwidaegaSale(raw: number, pct: number): number {
  return Math.round(raw * 2 * (pct / 100) / 10) * 10
}

/**
 * 제조사별 차열재 가격 맵 생성: manufacturer → (type → unit_price)
 * internal_name='차열재' 행의 pipe_spec을 키로 사용
 */
export function buildHeatPriceMapByMfr(prices: PriceRowMin[]): Map<string, Map<string, number>> {
  const byMfr = new Map<string, Map<string, number>>()
  for (const r of prices) {
    if (r.internal_name !== '차열재' || !r.pipe_spec) continue
    const mfr = r.manufacturer ?? '필립산업'
    if (!byMfr.has(mfr)) byMfr.set(mfr, new Map())
    byMfr.get(mfr)!.set(r.pipe_spec, r.unit_price)
  }
  return byMfr
}

/**
 * 제조사별 실란트 단가 맵 생성: manufacturer → unit_price
 * internal_name='실란트' 행의 unit_price를 사용 (제조사당 하나)
 */
export function buildSealantPriceMapByMfr(prices: PriceRowMin[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of prices) {
    if (r.internal_name !== '실란트') continue
    const mfr = r.manufacturer ?? '필립산업'
    if (!map.has(mfr)) map.set(mfr, r.unit_price)
  }
  return map
}

/**
 * 제조사별 일위대가 원가 맵 생성 (부가 비용 있는 품목만 포함)
 * key outer = manufacturer, key inner = prod_key, value = raw 일위대가 원가
 */
export function buildIlwidaegaMapByMfr(prices: PriceRowMin[]): Map<string, Map<string, number>> {
  const heatPriceByMfr = buildHeatPriceMapByMfr(prices)
  const sealantPriceByMfr = buildSealantPriceMapByMfr(prices)
  const byMfr = new Map<string, Map<string, number>>()
  for (const r of prices) {
    const mfr = r.manufacturer ?? '필립산업'
    const heatPriceMap = heatPriceByMfr.get(mfr) ?? new Map()
    const sealantPrice = sealantPriceByMfr.get(mfr)
    const raw = calcIlwidaegaRaw(r, heatPriceMap, sealantPrice)
    if (raw <= r.unit_price) continue
    if (!byMfr.has(mfr)) byMfr.set(mfr, new Map())
    byMfr.get(mfr)!.set(r.prod_key, raw)
  }
  return byMfr
}

/** 전체 단가 데이터를 제조사별로 분리해 ps·priceMap을 각각 생성 */
export function buildManufacturerMaps(prices: PriceRowMin[]) {
  const byMfr = new Map<string, PriceRowMin[]>()
  for (const p of prices) {
    const mfr = p.manufacturer ?? '필립산업'
    if (!byMfr.has(mfr)) byMfr.set(mfr, [])
    byMfr.get(mfr)!.push(p)
  }
  const psByMfr = new Map<string, ReturnType<typeof buildPipeSleeveStructure>>()
  const priceMapByMfr = new Map<string, Map<string, number>>()
  for (const [mfr, rows] of byMfr) {
    psByMfr.set(mfr, buildPipeSleeveStructure(rows))
    priceMapByMfr.set(mfr, buildPriceMap(rows))
  }
  return {
    psByMfr,
    priceMapByMfr,
    manufacturers: Array.from(byMfr.keys()).sort(),
  }
}

/** 제조사별 priceMap에서 단가 조회. 해당 제조사 없으면 첫 번째 제조사 fallback */
export function lookupUnitPriceByMfr(
  priceMapByMfr: Map<string, Map<string, number>>,
  manufacturer: string,
  internalName?: string,
  pipeSpec?: string,
  sleeveSpec?: string,
): number | undefined {
  const mfrMap = priceMapByMfr.get(manufacturer)
    ?? priceMapByMfr.get('필립산업')
    ?? priceMapByMfr.values().next().value
  if (!mfrMap) return undefined
  return lookupUnitPrice(mfrMap, internalName, pipeSpec, sleeveSpec)
}

export function buildPipeSleeveStructure(prices: PriceRowMin[]) {
  const pipeSleeveMap: Record<string, Record<string, string[]>> = {}
  const specOnlyMap: Record<string, string[]> = {}
  const namesSet = new Set<string>()

  for (const row of prices) {
    if (row.internal_name) namesSet.add(row.internal_name)
    if (!row.internal_name || !row.pipe_spec) continue
    if (row.sleeve_spec) {
      if (!pipeSleeveMap[row.internal_name]) pipeSleeveMap[row.internal_name] = {}
      if (!pipeSleeveMap[row.internal_name][row.pipe_spec]) pipeSleeveMap[row.internal_name][row.pipe_spec] = []
      if (!pipeSleeveMap[row.internal_name][row.pipe_spec].includes(row.sleeve_spec)) {
        pipeSleeveMap[row.internal_name][row.pipe_spec].push(row.sleeve_spec)
      }
    } else {
      if (!specOnlyMap[row.internal_name]) specOnlyMap[row.internal_name] = []
      if (!specOnlyMap[row.internal_name].includes(row.pipe_spec)) {
        specOnlyMap[row.internal_name].push(row.pipe_spec)
      }
    }
  }

  return {
    allNames: Array.from(namesSet).sort((a, b) => a.localeCompare(b, 'en')),
    hasSleeve: (name: string) => name in pipeSleeveMap,
    isSpecOnly: (name: string) => !(name in pipeSleeveMap) && name in specOnlyMap,
    getPipeSizes: (name: string) => Object.keys(pipeSleeveMap[name] ?? {}),
    getSleeveOptions: (name: string, pipe: string) => pipeSleeveMap[name]?.[pipe] ?? [],
    getSpecOptions: (name: string) => specOnlyMap[name] ?? [],
  }
}
