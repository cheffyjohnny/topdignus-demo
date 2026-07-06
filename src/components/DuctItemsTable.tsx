'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { isProfireManufacturer } from '@/lib/vendor-mappings'

const DUCT_COL_DEFAULTS: Record<string, number> = {
  name: 176, w: 112, h: 112, perimeter: 96, qty: 80, price: 128, amount: 128, note: 120,
}
const DUCT_COL_KEY = 'duct_items_col_widths'

export interface DuctItem {
  id: number
  type: '입상' | '벽체' | '수기 금액 추가'
  manufacturer?: string
  width: number
  height: number
  quantity: number
  unit_price: number
  note?: string
}

interface DuctPrice {
  manufacturer: string
  price_type: 'per_m' | 'per_item'
  riser_price: number
  wall_price: number
  insul_50t_price?: number
  insul_25t_price?: number
}

interface DuctSalePrice {
  manufacturer: string
  customer_id: string
  riser_sale_price: number
  wall_sale_price: number
  insul_50t_sale_price?: number
  insul_25t_sale_price?: number
}

interface Customer { id: string; name: string }

interface DuctItemsTableProps {
  items: DuctItem[]
  onChange: (items: DuctItem[]) => void
  ductPrices: DuctPrice[]
  ductSalePrices: DuctSalePrice[]
  customers: Customer[]
  customerName: string
  newVendor?: boolean
  insul50Qty?: number
  insul25Qty?: number
  onInsulChange?: (qty50: number, qty25: number) => void
  deleteButton?: React.ReactNode
  onGrandTotal?: (total: number) => void
}

function perimeter(item: DuctItem) {
  return (item.width + item.height) * 2 / 1000
}

function calcAmount(item: DuctItem, priceType: 'per_m' | 'per_item') {
  if (priceType === 'per_m') return Math.round(item.unit_price * perimeter(item) * item.quantity)
  return Math.round(item.unit_price * item.quantity)
}

let _nextId = 100

export function DuctItemsTable({
  items, onChange, ductPrices, ductSalePrices, customers, customerName, newVendor,
  insul50Qty: insul50Qty_prop, insul25Qty: insul25Qty_prop, onInsulChange,
  deleteButton, onGrandTotal,
}: DuctItemsTableProps) {
  const [insul50Qty, setInsul50Qty_] = useState(insul50Qty_prop ?? 0)
  const [insul25Qty, setInsul25Qty_] = useState(insul25Qty_prop ?? 0)
  const [showInsulCalcWall, setShowInsulCalcWall] = useState(true)
  const [showInsulCalcRiser, setShowInsulCalcRiser] = useState(true)
  const [showAppliedCalcDetail, setShowAppliedCalcDetail] = useState(true)

  const [colW, setColW] = useState<Record<string, number>>(DUCT_COL_DEFAULTS)
  useEffect(() => {
    try {
      const s = localStorage.getItem(DUCT_COL_KEY)
      if (s) setColW(prev => ({ ...prev, ...JSON.parse(s) }))
    } catch {}
  }, [])

  const rh = useCallback((col: string) => (
    <div
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none group-hover/th:bg-blue-200/50 hover:!bg-blue-400/60 z-10"
      onPointerDown={e => {
        e.preventDefault(); e.stopPropagation()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const startX = e.clientX
        const startW = colW[col] ?? 80
        function onMove(ev: PointerEvent) {
          setColW(prev => ({ ...prev, [col]: Math.max(40, startW + ev.clientX - startX) }))
        }
        function onUp() {
          el.releasePointerCapture(e.pointerId)
          el.removeEventListener('pointermove', onMove)
          el.removeEventListener('pointerup', onUp)
          setColW(prev => { try { localStorage.setItem(DUCT_COL_KEY, JSON.stringify(prev)) } catch {} ; return prev })
        }
        el.addEventListener('pointermove', onMove)
        el.addEventListener('pointerup', onUp)
      }}
    />
  ), [colW])

  function setInsul50Qty(v: number) { setInsul50Qty_(v); onInsulChange?.(v, insul25Qty) }
  function setInsul25Qty(v: number) { setInsul25Qty_(v); onInsulChange?.(insul50Qty, v) }

  // 품명 옵션: duct_prices 기반으로 제조사×타입 조합 생성 + 수기 금액 추가
  const productOptions = useMemo(() => [
    ...ductPrices.flatMap(dp =>
      (['입상', '벽체'] as const).map(type => ({
        value: `${type}|${dp.manufacturer}`,
        label: `${type}(${dp.manufacturer})`,
        type: type as '입상' | '벽체' | '수기 금액 추가',
        manufacturer: dp.manufacturer as string | undefined,
      }))
    ),
    { value: '__manual__', label: '수기 금액 추가', type: '수기 금액 추가' as const, manufacturer: undefined },
  ], [ductPrices])

  // 제조사별 가격 조회 헬퍼
  const getDuctPrice = useCallback((mfr: string) =>
    ductPrices.find(d => d.manufacturer === mfr), [ductPrices])

  const getSalePrice = useCallback((mfr: string) => {
    const cid = customers.find(c => c.name === customerName)?.id
    if (!cid) return null
    return ductSalePrices.find(d => d.manufacturer === mfr && d.customer_id === cid) ?? null
  }, [customers, customerName, ductSalePrices])

  // 프로화이어 여부 (프로화이어 품목이 하나라도 있으면)
  const profireMfr = useMemo(() =>
    items.find(it => isProfireManufacturer(it.manufacturer))?.manufacturer ?? ''
  , [items])
  const isProfire = !!profireMfr

  const salePrice = useMemo(() => {
    if (!isProfire) return null
    return getSalePrice(profireMfr)
  }, [isProfire, profireMfr, getSalePrice])

  const profireDuctPrice = useMemo(() =>
    isProfire ? getDuctPrice(profireMfr) : null
  , [isProfire, profireMfr, getDuctPrice])

  // 단가 컬럼 헤더용: 대표 제조사(첫 정상 품목 기준)의 가격 방식
  const primaryDuctPrice = useMemo(() => {
    const mfr = items.find(it => it.type !== '수기 금액 추가')?.manufacturer ?? ''
    return getDuctPrice(mfr)
  }, [items, getDuctPrice])
  const priceUnitLabel = primaryDuctPrice?.price_type === 'per_item' ? '개' : 'M'

  const insul50Price = profireDuctPrice?.insul_50t_price ?? 0
  const insul25Price = profireDuctPrice?.insul_25t_price ?? 0

  const effectiveInsul50Price = useMemo(() => {
    if (salePrice && (salePrice.insul_50t_sale_price ?? 0) > 0) return salePrice.insul_50t_sale_price!
    return insul50Price
  }, [salePrice, insul50Price])

  const effectiveInsul25Price = useMemo(() => {
    if (salePrice && (salePrice.insul_25t_sale_price ?? 0) > 0) return salePrice.insul_25t_sale_price!
    return insul25Price
  }, [salePrice, insul25Price])

  // 품목 단가 자동 계산 (제조사×타입 기반)
  function getAutoUnitPrice(type: '입상' | '벽체', mfr: string): number {
    const dp = getDuctPrice(mfr)
    if (!dp) return 0
    const sp = getSalePrice(mfr)
    if (sp) return type === '입상' ? sp.riser_sale_price : sp.wall_sale_price
    return type === '입상' ? dp.riser_price : dp.wall_price
  }

  // 프로화이어 차열재 계산 (프로화이어 품목만)
  const insulCalc = useMemo(() => {
    if (!isProfire) return null
    const profireItems = items.filter(it => isProfireManufacturer(it.manufacturer))
    const wallRows  = profireItems.filter(it => it.type === '벽체').map(it => {
      const pMm = (it.width + it.height) * 2
      return { it, pMm, mm50: pMm * 4 * it.quantity }
    })
    const riserRows = profireItems.filter(it => it.type === '입상').map(it => {
      const pMm = (it.width + it.height) * 2
      return { it, pMm, mm50: pMm * 2 * it.quantity, mm25: pMm * 3 * it.quantity }
    })
    const wallMm50  = wallRows.reduce((s, r) => s + r.mm50, 0)
    const riserMm50 = riserRows.reduce((s, r) => s + r.mm50, 0)
    const riserMm25 = riserRows.reduce((s, r) => s + r.mm25, 0)
    if (wallMm50 + riserMm50 + riserMm25 === 0) return null
    return {
      wallRows, riserRows, wallMm50, riserMm50, riserMm25,
      rolls50: Math.ceil(wallMm50 / 3600) + Math.ceil(riserMm50 / 3600),
      rolls25: Math.ceil(riserMm25 / 7200),
    }
  }, [isProfire, items])

  const appliedCalc = useMemo(() => {
    if (!insulCalc || !salePrice) return null
    const { riserRows, wallRows, riserMm50, riserMm25, wallMm50 } = insulCalc
    const riserTotalM    = riserRows.reduce((s, r) => s + (r.pMm / 1000) * r.it.quantity, 0)
    const riserInsulCost = Math.ceil(riserMm50 / 3600) * effectiveInsul50Price + Math.ceil(riserMm25 / 7200) * effectiveInsul25Price
    const riserApplied   = riserTotalM > 0 ? Math.round((salePrice.riser_sale_price * riserTotalM - riserInsulCost) / riserTotalM / 1000) * 1000 : 0
    const wallTotalM     = wallRows.reduce((s, r) => s + (r.pMm / 1000) * r.it.quantity, 0)
    const wallInsulCost  = Math.ceil(wallMm50 / 3600) * effectiveInsul50Price
    const wallApplied    = wallTotalM > 0 ? Math.round((salePrice.wall_sale_price * wallTotalM - wallInsulCost) / wallTotalM / 1000) * 1000 : 0
    return { riserApplied, wallApplied, riserTotalM, wallTotalM, riserInsulCost, wallInsulCost }
  }, [insulCalc, salePrice, effectiveInsul50Price, effectiveInsul25Price])

  function getAppliedUnitPrice(type: '입상' | '벽체') {
    if (!appliedCalc) return 0
    return type === '입상' ? appliedCalc.riserApplied : appliedCalc.wallApplied
  }

  function updateItem(id: number, patch: Partial<DuctItem>) {
    onChange(items.map(it => {
      if (it.id !== id) return it
      const updated = { ...it, ...patch }
      // 품명(타입+제조사) 변경 시 단가 자동 업데이트 (수기 금액 행 제외)
      if (('type' in patch || 'manufacturer' in patch) && updated.type !== '수기 금액 추가') {
        const mfr = updated.manufacturer ?? ''
        const dp = getDuctPrice(mfr)
        if (dp) {
          updated.unit_price = getAutoUnitPrice(updated.type as '입상' | '벽체', mfr)
        }
      }
      return updated
    }))
  }

  function addItem() {
    const first = productOptions[0]
    onChange([...items, {
      id: _nextId++,
      type: first?.type ?? '입상',
      manufacturer: first?.manufacturer,
      width: 0, height: 0,
      quantity: 1,
      unit_price: first && first.type !== '수기 금액 추가' ? getAutoUnitPrice(first.type, first.manufacturer ?? '') : 0,
    }])
  }

  function removeItem(id: number) {
    if (items.length === 1) return
    onChange(items.filter(it => it.id !== id))
  }

  // 합계: 수기 금액은 단가×수량, 프로화이어는 appliedCalc, 나머지는 제조사별 priceType
  const totalAmount = items.reduce((sum, it) => {
    if (it.type === '수기 금액 추가') return sum + it.unit_price * it.quantity
    const mfr = it.manufacturer ?? ''
    const isItemProfire = isProfireManufacturer(mfr)
    if (isItemProfire && appliedCalc) {
      return sum + Math.round(getAppliedUnitPrice(it.type as '입상' | '벽체') * perimeter(it) * it.quantity)
    }
    const dp = getDuctPrice(mfr)
    return sum + calcAmount(it, dp?.price_type ?? 'per_m')
  }, 0)

  const grandTotal = totalAmount + (isProfire ? insul50Qty * effectiveInsul50Price + insul25Qty * effectiveInsul25Price : 0)

  // 부모에게 합계 전달
  const prevGrandTotal = useRef(grandTotal)
  if (prevGrandTotal.current !== grandTotal) { prevGrandTotal.current = grandTotal; onGrandTotal?.(grandTotal) }

  return (
    <div>
      {/* 품목 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full flex-shrink-0 bg-[#014A99]" />
              <h2 className="font-semibold text-gray-800 text-sm">품목 목록</h2>
            </div>
            {deleteButton}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {newVendor ? `단가/${priceUnitLabel} (직접입력)` : isProfire ? '적용단가/M (자동계산)' : `단가/${priceUnitLabel} (자동)`}
            </span>
            <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-[#014A99] hover:opacity-70 transition-opacity cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              행 추가
            </button>
          </div>
        </div>

        {isProfire && salePrice && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-5 text-xs">
            <span className="font-semibold text-amber-700">거래처 단가 참고</span>
            <span className="text-amber-900">입상 <strong>{salePrice.riser_sale_price.toLocaleString('ko-KR')}원/M</strong></span>
            <span className="text-amber-900">벽체 <strong>{salePrice.wall_sale_price.toLocaleString('ko-KR')}원/M</strong></span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="relative group/th px-3 py-2.5 text-left select-none" style={{ width: colW.name }}>품명{rh('name')}</th>
                <th className="relative group/th px-3 py-2.5 text-right select-none" style={{ width: colW.w }}>가로 (mm){rh('w')}</th>
                <th className="relative group/th px-3 py-2.5 text-right select-none" style={{ width: colW.h }}>세로 (mm){rh('h')}</th>
                <th className="relative group/th px-3 py-2.5 text-right select-none" style={{ width: colW.perimeter }}>M/개{rh('perimeter')}</th>
                <th className="relative group/th px-3 py-2.5 text-right select-none" style={{ width: colW.qty }}>수량{rh('qty')}</th>
                <th className="relative group/th px-3 py-2.5 text-right select-none" style={{ width: colW.price }}>{(isProfire && appliedCalc) ? '적용단가/M' : `단가/${priceUnitLabel}`}{rh('price')}</th>
                <th className="relative group/th px-3 py-2.5 text-right select-none" style={{ width: colW.amount }}>금액{rh('amount')}</th>
                <th className="relative group/th px-3 py-2.5 text-left select-none" style={{ width: colW.note }}>비고{rh('note')}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const isManualItem = item.type === '수기 금액 추가'
                const mfr = item.manufacturer ?? ''
                const dp  = getDuctPrice(mfr)
                const isItemProfire = isProfireManufacturer(mfr)
                const isItemPerItem = dp?.price_type === 'per_item'
                const peri = perimeter(item)
                const amt  = isManualItem
                  ? item.unit_price * item.quantity
                  : isItemProfire && appliedCalc
                    ? Math.round(getAppliedUnitPrice(item.type as '입상' | '벽체') * peri * item.quantity)
                    : calcAmount(item, dp?.price_type ?? 'per_m')
                const currentValue = isManualItem ? '__manual__' : `${item.type}|${mfr}`
                const isDisabled = !isManualItem && !mfr
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2">
                      <select
                        value={productOptions.some(o => o.value === currentValue) ? currentValue : ''}
                        onChange={e => {
                          if (e.target.value === '__manual__') {
                            updateItem(item.id, { type: '수기 금액 추가', manufacturer: undefined, width: 0, height: 0, unit_price: 0 })
                          } else {
                            const opt = productOptions.find(o => o.value === e.target.value)
                            if (opt) updateItem(item.id, { type: opt.type, manufacturer: opt.manufacturer })
                          }
                        }}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#014A99] w-full cursor-pointer"
                      >
                        <option value="">-- 선택 --</option>
                        {productOptions.filter(o => o.value !== '__manual__').map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                        <option disabled>──────────</option>
                        <option value="__manual__">수기 금액 추가</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={item.width || ''} onChange={e => updateItem(item.id, { width: Number(e.target.value) || 0 })}
                        onFocus={e => e.target.select()}
                        disabled={isDisabled || isManualItem}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#014A99] w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50" placeholder="0" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={item.height || ''} onChange={e => updateItem(item.id, { height: Number(e.target.value) || 0 })}
                        onFocus={e => e.target.select()}
                        disabled={isDisabled || isManualItem}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#014A99] w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50" placeholder="0" />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{isManualItem ? <span className="text-gray-300">-</span> : peri > 0 ? peri.toFixed(3) : '-'}</td>
                    <td className="px-3 py-2">
                      <input type="number" min={1} value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: Number(e.target.value) || 1 })}
                        onFocus={e => e.target.select()}
                        disabled={isDisabled}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#014A99] w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50" placeholder="1" />
                    </td>
                    <td className="px-3 py-2">
                      {isManualItem ? (
                        <input type="text" inputMode="numeric"
                          value={item.unit_price ? item.unit_price.toLocaleString('ko-KR') : ''}
                          onChange={e => updateItem(item.id, { unit_price: parseInt(e.target.value.replace(/,/g, ''), 10) || 0 })}
                          onFocus={e => e.target.select()}
                          className="border border-amber-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-amber-500 w-full tabular-nums text-amber-700 font-medium"
                          placeholder="금액 입력" />
                      ) : isItemProfire && appliedCalc ? (
                        <span className="block text-sm text-right tabular-nums text-gray-500 py-1.5 px-2">
                          {getAppliedUnitPrice(item.type as '입상' | '벽체').toLocaleString('ko-KR')}
                        </span>
                      ) : (
                        <input type="number" min={0} value={item.unit_price || ''}
                          onChange={e => updateItem(item.id, { unit_price: Number(e.target.value) || 0 })}
                          onFocus={e => e.target.select()}
                          readOnly={!newVendor && !isItemPerItem && !!dp}
                          disabled={isDisabled}
                          className={`border rounded px-2 py-1.5 text-sm text-right focus:outline-none w-full tabular-nums disabled:opacity-40 disabled:cursor-not-allowed ${!newVendor && !isItemPerItem && dp ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-default' : 'border-gray-200 focus:border-[#014A99]'}`}
                          placeholder="0" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-gray-700">{amt > 0 ? amt.toLocaleString('ko-KR') : '-'}</td>
                    <td className="px-3 py-2">
                      <input value={item.note ?? ''} onChange={e => updateItem(item.id, { note: e.target.value })}
                        disabled={isDisabled}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#014A99] w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50" placeholder="비고" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeItem(item.id)} disabled={items.length === 1}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 차열재 섹션 — 프로화이어 전용 */}
        {isProfire && (
          <div className="border-t border-orange-100">
            <div className="px-5 py-2.5 bg-orange-50/70">
              <span className="text-xs font-semibold text-orange-700">차열재</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-orange-50/50 text-xs text-orange-600 border-b border-orange-100">
                <tr>
                  <th className="px-4 py-2 text-left">품명</th>
                  <th className="px-3 py-2 text-right w-28">수량 (롤)</th>
                  <th className="px-3 py-2 text-right w-32">단가</th>
                  <th className="px-3 py-2 text-right w-32">금액</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '50T×400×3.6M', qty: insul50Qty, setQty: setInsul50Qty, price: effectiveInsul50Price },
                  { label: '25T×400×7.2M', qty: insul25Qty, setQty: setInsul25Qty, price: effectiveInsul25Price },
                ].map(({ label, qty, setQty, price }) => (
                  <tr key={label} className="border-b border-orange-100">
                    <td className="px-4 py-2.5 text-orange-800 font-medium">{label}</td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={qty || ''} onChange={e => setQty(Number(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        className="border border-orange-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-orange-400 w-full bg-white" placeholder="0" />
                    </td>
                    <td className="px-3 py-2.5 text-right text-orange-700 tabular-nums">{price > 0 ? price.toLocaleString('ko-KR') : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-orange-800">
                      {qty > 0 && price > 0 ? (qty * price).toLocaleString('ko-KR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 합계 */}
        {grandTotal > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-500">합계</span>
            <span className="font-bold text-gray-800 tabular-nums">{grandTotal.toLocaleString('ko-KR')}원</span>
          </div>
        )}
      </div>

      {/* 차열재 계산 참고 — 프로화이어 전용 */}
      {isProfire && insulCalc && (
        <div className="mt-4 rounded-lg border border-orange-200 overflow-hidden">
          <div className="px-5 py-2.5 bg-orange-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-orange-700">차열재 계산 참고</span>
              <span className="flex items-center gap-1.5 text-xs text-orange-600">
                50T×400 <span className="bg-orange-200 text-orange-900 font-semibold px-1.5 py-0.5 rounded">{insulCalc.rolls50}롤</span>
                {insulCalc.rolls25 > 0 && <> · 25T×400 <span className="bg-orange-200 text-orange-900 font-semibold px-1.5 py-0.5 rounded">{insulCalc.rolls25}롤</span></>}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {insulCalc.wallRows.length > 0 && (
                <button onClick={() => setShowInsulCalcWall(v => !v)} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 cursor-pointer">
                  벽체 <svg className={`w-3.5 h-3.5 transition-transform ${showInsulCalcWall ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              )}
              {insulCalc.riserRows.length > 0 && (
                <button onClick={() => setShowInsulCalcRiser(v => !v)} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 cursor-pointer">
                  입상 <svg className={`w-3.5 h-3.5 transition-transform ${showInsulCalcRiser ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              )}
            </div>
          </div>

          {showInsulCalcWall && insulCalc.wallRows.length > 0 && (
            <InsulSection title="벽체" subtitle="50T×400" accent="orange">
              <InsulTable rows={insulCalc.wallRows.map(r => ({ dims: `${r.it.width}×${r.it.height}`, qty: r.it.quantity, formula: `둘레 ${r.pMm.toLocaleString()}mm×2(1·2단)×2(양면)×${r.it.quantity}(수량) = ${r.mm50.toLocaleString()}mm`, rolls: Math.ceil(r.mm50 / 3600) }))}
                totalMm={insulCalc.wallRows.reduce((s, r) => s + r.mm50, 0)} rollLen={3600} label="50T×400" />
            </InsulSection>
          )}
          {showInsulCalcRiser && insulCalc.riserRows.length > 0 && (
            <InsulSection title="입상" subtitle="50T×400 · 25T×400" accent="amber">
              <InsulTable rows={insulCalc.riserRows.map(r => ({ dims: `${r.it.width}×${r.it.height}`, qty: r.it.quantity, formula: `둘레 ${r.pMm.toLocaleString()}mm × ${r.it.quantity}(수량) × 2(1·2단) = ${r.mm50.toLocaleString()}mm`, rolls: Math.ceil(r.mm50 / 3600) }))}
                totalMm={insulCalc.riserRows.reduce((s, r) => s + r.mm50, 0)} rollLen={3600} label="50T×400" />
              <div className="border-t border-dashed border-orange-200 pt-3 mt-3">
                <InsulTable rows={insulCalc.riserRows.map(r => ({ dims: `${r.it.width}×${r.it.height}`, qty: r.it.quantity, formula: `둘레 ${r.pMm.toLocaleString()}mm × ${r.it.quantity}(수량) × 3(1·2·3단) = ${r.mm25.toLocaleString()}mm`, rolls: Math.ceil(r.mm25 / 7200) }))}
                  totalMm={insulCalc.riserRows.reduce((s, r) => s + r.mm25, 0)} rollLen={7200} label="25T×400" />
              </div>
            </InsulSection>
          )}
        </div>
      )}

      {/* 적용단가 계산식 — 프로화이어 전용 */}
      {isProfire && appliedCalc && salePrice && insulCalc && (
        <div className="mt-4 rounded-lg border border-blue-200 overflow-hidden">
          <div className="px-5 py-2.5 bg-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-700">적용단가 계산식</span>
              <span className="flex items-center gap-3 text-xs text-blue-600">
                {appliedCalc.riserTotalM > 0 && <span>입상 <span className="bg-blue-200 text-blue-900 font-semibold px-1.5 py-0.5 rounded">{appliedCalc.riserApplied.toLocaleString('ko-KR')}원/M</span></span>}
                {appliedCalc.wallTotalM  > 0 && <span>벽체 <span className="bg-blue-200 text-blue-900 font-semibold px-1.5 py-0.5 rounded">{appliedCalc.wallApplied.toLocaleString('ko-KR')}원/M</span></span>}
              </span>
            </div>
            <button onClick={() => setShowAppliedCalcDetail(v => !v)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 cursor-pointer">
              계산 보기 <svg className={`w-3.5 h-3.5 transition-transform ${showAppliedCalcDetail ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
          {showAppliedCalcDetail && (
            <div className="px-5 py-4 space-y-5 text-xs text-blue-900 border-t border-blue-100">
              <p className="text-blue-500 font-semibold">공식: ( 판매단가 × 총M - 차열재가격 ) / 총M → 천원 단위 반올림</p>
              {appliedCalc.riserTotalM > 0 && (
                <AppliedCalcBlock label="입상"
                  salePrice={salePrice.riser_sale_price} totalM={appliedCalc.riserTotalM}
                  insulCost={appliedCalc.riserInsulCost} applied={appliedCalc.riserApplied}
                  insulDetail={`50T: ${Math.ceil(insulCalc.riserMm50/3600)}롤 × ${effectiveInsul50Price.toLocaleString()}원${insulCalc.riserMm25 > 0 ? ` + 25T: ${Math.ceil(insulCalc.riserMm25/7200)}롤 × ${effectiveInsul25Price.toLocaleString()}원` : ''}`} />
              )}
              {appliedCalc.wallTotalM > 0 && (
                <AppliedCalcBlock label="벽체"
                  salePrice={salePrice.wall_sale_price} totalM={appliedCalc.wallTotalM}
                  insulCost={appliedCalc.wallInsulCost} applied={appliedCalc.wallApplied}
                  insulDetail={`50T: ${Math.ceil(insulCalc.wallMm50/3600)}롤 × ${effectiveInsul50Price.toLocaleString()}원`} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function InsulSection({ title, subtitle, accent, children }: { title: string; subtitle: string; accent: 'orange' | 'amber'; children: React.ReactNode }) {
  const borderCls = accent === 'amber' ? 'border-t-2 border-orange-300' : 'border-t-2 border-orange-200'
  const bgCls     = accent === 'amber' ? 'bg-amber-50' : 'bg-orange-100/60'
  const dotCls    = accent === 'amber' ? 'bg-amber-400' : 'bg-orange-400'
  return (
    <div className={borderCls}>
      <div className={`px-5 py-2 ${bgCls} border-b border-orange-200 flex items-center gap-2`}>
        <span className={`w-1 h-3.5 rounded-full ${dotCls} inline-block shrink-0`} />
        <span className="text-xs font-bold text-orange-700">{title}</span>
        <span className="text-xs text-orange-400">{subtitle}</span>
      </div>
      <div className="px-5 py-3 text-xs text-orange-900 space-y-3">{children}</div>
    </div>
  )
}

function InsulTable({ rows, totalMm, rollLen, label }: {
  rows: { dims: string; qty: number; formula: string; rolls: number }[]
  totalMm: number; rollLen: number; label: string
}) {
  return (
    <>
      <p className="font-semibold mb-1.5 text-orange-600">{label.includes('50T') ? label.includes('×400') && !label.includes('25T') ? '양면, 1·2단/면' : '1·2단 (50T)' : '1·2·3단 (25T)'}</p>
      <table className="w-full border-collapse">
        <thead><tr className="text-orange-500 border-b border-orange-200">
          <th className="text-left py-1 pr-4 font-medium">치수 (mm)</th>
          <th className="text-left py-1 pr-4 font-medium">수량</th>
          <th className="text-left py-1 pr-4 font-medium">계산식</th>
          <th className="text-right py-1 font-medium">롤</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-orange-100">
              <td className="py-1 pr-4">{r.dims}</td>
              <td className="py-1 pr-4">{r.qty}개</td>
              <td className="py-1 pr-4 font-mono">{r.formula}</td>
              <td className="py-1 text-right">{r.rolls}롤</td>
            </tr>
          ))}
          <tr className="text-orange-600">
            <td colSpan={2} className="pt-1.5">소계</td>
            <td className="pt-1.5 font-mono">{totalMm.toLocaleString()}mm ÷ {rollLen.toLocaleString()}</td>
            <td className="pt-1.5 text-right">{Math.ceil(totalMm / rollLen)}롤</td>
          </tr>
        </tbody>
      </table>
      <div className="pt-2 mt-1 border-t border-orange-200 font-semibold text-orange-800">
        {label} 합계: {totalMm.toLocaleString()}mm ÷ {rollLen.toLocaleString()} = <strong>{Math.ceil(totalMm / rollLen)}롤</strong>
      </div>
    </>
  )
}

function AppliedCalcBlock({ label, salePrice, totalM, insulCost, applied, insulDetail }: {
  label: string; salePrice: number; totalM: number; insulCost: number; applied: number; insulDetail: string
}) {
  return (
    <div>
      <p className="font-bold text-blue-700 mb-2">{label}</p>
      <table className="w-full border-collapse">
        <tbody className="divide-y divide-blue-100">
          <tr><td className="py-1.5 pr-4 text-blue-500 w-28">판매단가</td><td className="py-1.5 font-mono">{salePrice.toLocaleString('ko-KR')}원/M</td></tr>
          <tr><td className="py-1.5 pr-4 text-blue-500">총 M</td><td className="py-1.5 font-mono">{totalM.toFixed(3)}M</td></tr>
          <tr><td className="py-1.5 pr-4 text-blue-500">차열재가격</td><td className="py-1.5 font-mono">{insulDetail} = <strong>{insulCost.toLocaleString('ko-KR')}원</strong></td></tr>
          <tr className="text-blue-700 font-semibold">
            <td className="py-1.5 pr-4">적용단가</td>
            <td className="py-1.5 font-mono">
              ({salePrice.toLocaleString()}<span className="text-blue-400 font-normal">(판매단가)</span>
              {' × '}{totalM.toFixed(3)}<span className="text-blue-400 font-normal">(총 M)</span>
              {' - '}{insulCost.toLocaleString()}<span className="text-blue-400 font-normal">(차열재가격)</span>)
              {' / '}{totalM.toFixed(3)}<span className="text-blue-400 font-normal">(총 M)</span>
              {' = '}{((salePrice * totalM - insulCost) / totalM).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}원/M
              {' → 천원 단위 반올림 → '}<strong className="text-blue-800">{applied.toLocaleString('ko-KR')}원/M</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
