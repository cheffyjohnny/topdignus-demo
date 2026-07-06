'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { OrderItem } from '@/lib/parse-order'
import { getDisplayName } from '@/lib/vendor-mappings'
import { lookupSalePrice, buildPipeSleeveStructure, calcIlwidaegaSale } from '@/lib/price-utils'
import { calcHeatInsulatorDetailed, calcSealant } from '@/lib/price-table'
import type { HeatCalcGrouped, SealantCalcResult } from '@/lib/price-table'

const PIPE_COL_DEFAULTS: Record<string, number> = {
  mfr: 112, name: 160, spec: 128, unit: 64, qty: 64,
  internal: 200, pipe: 112, sleeve: 112, price: 112, note: 120,
}
const PIPE_COL_KEY = 'pipe_items_col_widths'

interface PipeItemsTableProps {
  items: OrderItem[]
  onChange: (items: OrderItem[]) => void
  ps: ReturnType<typeof buildPipeSleeveStructure> | null
  priceMap: Map<string, number>
  pct: number | null
  sealantMap?: Map<string, number>
  showNote?: boolean
  autoParseSpec?: boolean
  showHeatCalc?: boolean
  hideAddButton?: boolean
  showManufacturer?: boolean
  manufacturers?: string[]
  defaultManufacturer?: string
  rightAction?: React.ReactNode
  psByManufacturer?: Map<string, ReturnType<typeof buildPipeSleeveStructure>>
  priceMapByManufacturer?: Map<string, Map<string, number>>
  ilwiRawMapByMfr?: Map<string, Map<string, number>>
}

export function PipeItemsTable({
  items,
  onChange,
  ps,
  priceMap,
  pct,
  sealantMap = new Map(),
  showNote = false,
  autoParseSpec = false,
  showHeatCalc = false,
  hideAddButton = false,
  showManufacturer = false,
  manufacturers = [],
  defaultManufacturer,
  rightAction,
  psByManufacturer,
  priceMapByManufacturer,
  ilwiRawMapByMfr,
}: PipeItemsTableProps) {
  function effectivePs(manufacturer?: string) {
    return (manufacturer ? psByManufacturer?.get(manufacturer) : undefined) ?? ps
  }
  function effectivePriceMap(manufacturer?: string) {
    return (manufacturer ? priceMapByManufacturer?.get(manufacturer) : undefined) ?? priceMap
  }

  const prevPctRef = useRef<number | null | 'initial'>('initial')
  useEffect(() => {
    if (prevPctRef.current === 'initial') { prevPctRef.current = pct; return }
    if (prevPctRef.current === pct) return
    prevPctRef.current = pct
    if (!items.some(it => it.internalName)) return
    onChange(items.map(it => {
      if (!it.internalName) return it
      if (ilwiMode && ilwiRawMapByMfr && pct != null) {
        const mfr = it.manufacturer ?? '필립산업'
        const mfrMap = ilwiRawMapByMfr.get(mfr) ?? ilwiRawMapByMfr.get('필립산업')
        const key = getIlwiProdKey(it)
        const raw = key ? mfrMap?.get(key) : undefined
        return {
          ...it,
          unitPrice: raw != null
            ? calcIlwidaegaSale(raw, pct)
            : lookupSalePrice(effectivePriceMap(it.manufacturer), pct, it.internalName, it.pipeSpec, it.sleeveSpec),
        }
      }
      return {
        ...it,
        unitPrice: pct != null
          ? lookupSalePrice(effectivePriceMap(it.manufacturer), pct, it.internalName, it.pipeSpec, it.sleeveSpec)
          : undefined,
      }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct])

  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [sealantOpen, setSealantOpen] = useState(false)
  const [ilwiMode, setIlwiMode] = useState(false)

  const [colW, setColW] = useState<Record<string, number>>(PIPE_COL_DEFAULTS)
  useEffect(() => {
    try {
      const s = localStorage.getItem(PIPE_COL_KEY)
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
          setColW(prev => { try { localStorage.setItem(PIPE_COL_KEY, JSON.stringify(prev)) } catch {} ; return prev })
        }
        el.addEventListener('pointermove', onMove)
        el.addEventListener('pointerup', onUp)
      }}
    />
  ), [colW])

  function getIlwiProdKey(item: { internalName?: string; pipeSpec?: string; sleeveSpec?: string }): string | null {
    if (!item.internalName) return null
    if (item.pipeSpec && item.sleeveSpec) return `${item.internalName}_${item.pipeSpec}_${item.sleeveSpec}`
    if (item.pipeSpec) return `${item.internalName}_${item.pipeSpec}`
    return null
  }

  function lookupIlwiRaw(item: { internalName?: string; pipeSpec?: string; sleeveSpec?: string; manufacturer?: string }): number | undefined {
    if (!ilwiRawMapByMfr) return undefined
    const mfr = item.manufacturer ?? '필립산업'
    const mfrMap = ilwiRawMapByMfr.get(mfr) ?? ilwiRawMapByMfr.get('필립산업')
    if (!mfrMap) return undefined
    const key = getIlwiProdKey(item)
    return key ? mfrMap.get(key) : undefined
  }

  function toggleIlwiMode() {
    const next = !ilwiMode
    setIlwiMode(next)
    if (next && ilwiRawMapByMfr && pct != null) {
      onChange(items.map(it => {
        const mfr = it.manufacturer ?? '필립산업'
        const mfrMap = ilwiRawMapByMfr.get(mfr) ?? ilwiRawMapByMfr.get('필립산업')
        const key = getIlwiProdKey(it)
        const raw = key ? mfrMap?.get(key) : undefined
        return {
          ...it,
          unitPrice: raw != null
            ? calcIlwidaegaSale(raw, pct)
            : lookupSalePrice(effectivePriceMap(it.manufacturer), pct, it.internalName, it.pipeSpec, it.sleeveSpec),
        }
      }))
    } else if (!next && pct != null) {
      onChange(items.map(it => ({
        ...it,
        unitPrice: lookupSalePrice(effectivePriceMap(it.manufacturer), pct, it.internalName, it.pipeSpec, it.sleeveSpec),
      })))
    }
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number | boolean) {
    onChange(items.map((item, i) => {
      if (i !== idx) return item
      const updated: OrderItem = { ...item, [field]: value, uncertain: false }

      if (autoParseSpec && field === 'spec' && typeof value === 'string') {
        const parts = value.split('*')
        updated.pipeSpec = parts[0]?.trim() || undefined
        updated.sleeveSpec = parts[1]?.trim() || undefined
      }

      if (field === 'manufacturer' && typeof value === 'string') {
        updated.internalName = undefined
        updated.pipeSpec = undefined
        updated.sleeveSpec = undefined
        updated.unitPrice = undefined
        updated.displayName = undefined
      }

      if (field === 'internalName' && typeof value === 'string') {
        updated.displayName = value ? getDisplayName(value) : undefined
        updated.pipeSpec = undefined
        updated.sleeveSpec = undefined
        // 수기 금액 행은 단가 자동 조회 안 함
        if (value === '수기 금액 추가') updated.unitPrice = undefined
      }

      const curPs = effectivePs(updated.manufacturer)
      if (field === 'pipeSpec' && typeof value === 'string' && item.internalName && curPs?.hasSleeve(item.internalName)) {
        updated.sleeveSpec = undefined
      }

      if (['internalName', 'pipeSpec', 'sleeveSpec'].includes(field as string) && updated.internalName !== '수기 금액 추가') {
        if (ilwiMode && ilwiRawMapByMfr && pct != null) {
          const raw = lookupIlwiRaw(updated)
          updated.unitPrice = raw != null
            ? calcIlwidaegaSale(raw, pct)
            : lookupSalePrice(effectivePriceMap(updated.manufacturer), pct, updated.internalName, updated.pipeSpec, updated.sleeveSpec)
        } else {
          updated.unitPrice = pct != null
            ? lookupSalePrice(effectivePriceMap(updated.manufacturer), pct, updated.internalName, updated.pipeSpec, updated.sleeveSpec)
            : undefined
        }
      }

      return updated
    }))
  }

  function addItem() {
    const nextNo = items.length > 0 ? Math.max(...items.map(i => i.no)) + 1 : 1
    onChange([...items, { no: nextNo, name: '', spec: '', unit: 'ea', quantity: 1, manufacturer: bulkMfr || defaultManufacturer }])
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function reorderItems(fromIdx: number, toIdx: number) {
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onChange(next)
  }

  const [bulkMfr, setBulkMfr] = useState('')

  function handleBulkMfrChange(newMfr: string) {
    setBulkMfr(newMfr)
    if (newMfr) {
      onChange(items.map(it => ({
        ...it,
        manufacturer: newMfr,
        internalName: undefined, displayName: undefined,
        pipeSpec: undefined, sleeveSpec: undefined, unitPrice: undefined,
      })))
    }
  }

  const showTopBar = (showManufacturer && manufacturers.length > 0) || !!ilwiRawMapByMfr

  return (
    <div>
      {showTopBar && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 gap-4">
          <div className="flex items-center gap-2">
            {showManufacturer && manufacturers.length > 0 && (
              <>
                <span className="text-xs text-gray-500 font-medium">기본 제조사</span>
                <select
                  value={bulkMfr}
                  onChange={e => handleBulkMfrChange(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#014A99] bg-white cursor-pointer"
                >
                  <option value="">-- 개별 선택 --</option>
                  {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {bulkMfr && (
                  <button
                    onClick={() => setBulkMfr('')}
                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                    title="기본 제조사 해제"
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
          {ilwiRawMapByMfr && (
            <button
              onClick={toggleIlwiMode}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                ilwiMode
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'text-orange-600 border-orange-300 hover:bg-orange-50'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {ilwiMode ? '일위대가 모드 ON' : '일위대가 모드'}
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${showNote ? 'min-w-[1200px]' : 'min-w-[900px]'}`}>
          <thead>
            <tr className="text-xs font-semibold border-b border-gray-100">
              <th className="bg-gray-50 w-6" rowSpan={2} />
              {showManufacturer && (
                <th className="relative group/th bg-gray-50 px-3 py-2 text-left text-xs font-normal text-gray-500 select-none" rowSpan={2} style={{ width: colW.mfr }}>제조사{rh('mfr')}</th>
              )}
              <th className="bg-gray-50 w-8" rowSpan={2} />
              <th className="relative group/th px-3 py-2 text-left bg-gray-50 text-gray-500 select-none" rowSpan={2} style={{ width: colW.name }}>업체 품목명{rh('name')}</th>
              <th colSpan={3} className="px-3 py-2 text-center text-blue-700 bg-blue-50 border-x border-blue-100">
                그룹 A — 외부 표시
              </th>
              <th colSpan={4} className="px-3 py-2 text-center text-green-700 bg-green-50 border-x border-green-100">
                그룹 B — 내부 단가산출
              </th>
              {showNote && (
                <th className="relative group/th bg-gray-50 px-3 py-2 text-left text-xs font-normal text-gray-500 select-none" rowSpan={2} style={{ width: colW.note }}>비고{rh('note')}</th>
              )}
              <th className="bg-gray-50 w-8" rowSpan={2} />
            </tr>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="relative group/th px-3 py-2 text-left bg-blue-50/60 border-l border-blue-100 select-none" style={{ width: colW.spec }}>규격{rh('spec')}</th>
              <th className="relative group/th px-3 py-2 text-center bg-blue-50/60 select-none" style={{ width: colW.unit }}>단위{rh('unit')}</th>
              <th className="relative group/th px-3 py-2 text-center bg-blue-50/60 border-r border-blue-100 select-none" style={{ width: colW.qty }}>수량{rh('qty')}</th>
              <th className="relative group/th px-3 py-2 text-left bg-green-50/60 border-l border-green-100 select-none" style={{ width: colW.internal }}>내부 품명{rh('internal')}</th>
              <th className="relative group/th px-3 py-2 text-center bg-green-50/60 select-none" style={{ width: colW.pipe }}>배관{rh('pipe')}</th>
              <th className="relative group/th px-3 py-2 text-center bg-green-50/60 select-none" style={{ width: colW.sleeve }}>슬리브{rh('sleeve')}</th>
              <th className="relative group/th px-3 py-2 text-right bg-green-50/60 border-r border-green-100 select-none" style={{ width: colW.price }}>판매가{rh('price')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const isDisabled = showManufacturer && !item.manufacturer
              return (
              <tr
                key={idx}
                draggable
                onDragStart={() => setDragSrcIdx(idx)}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                onDrop={e => {
                  e.preventDefault()
                  if (dragSrcIdx !== null && dragSrcIdx !== idx) reorderItems(dragSrcIdx, idx)
                  setDragSrcIdx(null)
                  setDragOverIdx(null)
                }}
                onDragEnd={() => { setDragSrcIdx(null); setDragOverIdx(null) }}
                className={`hover:bg-gray-50/50 ${item.uncertain ? 'bg-amber-50' : 'bg-white'} ${dragOverIdx === idx && dragSrcIdx !== idx ? 'border-t-2 border-blue-400' : ''} ${dragSrcIdx === idx ? 'opacity-40' : ''}`}
              >
                <td className="pl-2 py-2.5 text-gray-300 cursor-grab active:cursor-grabbing w-6">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8-12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                  </svg>
                </td>
                {showManufacturer && (
                  <td className="px-2 py-2.5">
                    <select
                      value={item.manufacturer ?? ''}
                      onChange={e => updateItem(idx, 'manufacturer', e.target.value)}
                      className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#014A99] outline-none py-0.5 cursor-pointer"
                    >
                      <option value="">-- 선택 --</option>
                      {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                )}
                <td className="px-3 py-2.5 text-center text-gray-400 text-xs w-8">{idx + 1}</td>
                <td className="px-2 py-2.5">
                  <input
                    className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#014A99] outline-none py-0.5 text-xs text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    value={item.name}
                    placeholder="품목명 입력"
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    disabled={isDisabled}
                  />
                </td>
                <td className="px-2 py-2.5 bg-blue-50/20 border-l border-blue-50">
                  <input
                    className="w-full bg-transparent border-b border-transparent hover:border-blue-300 focus:border-[#014A99] outline-none py-0.5 text-xs text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    value={item.spec}
                    placeholder="20*75"
                    onChange={e => updateItem(idx, 'spec', e.target.value)}
                    disabled={isDisabled}
                  />
                </td>
                <td className="px-2 py-2.5 bg-blue-50/20">
                  <input
                    className="w-full text-center bg-transparent border-b border-transparent hover:border-blue-300 focus:border-[#014A99] outline-none py-0.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    value={item.unit}
                    placeholder="ea"
                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                    disabled={isDisabled}
                  />
                </td>
                <td className="px-2 py-2.5 bg-blue-50/20 border-r border-blue-50">
                  <input
                    type="number"
                    className="w-full text-center bg-transparent border-b border-transparent hover:border-blue-300 focus:border-[#014A99] outline-none py-0.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    value={item.quantity}
                    onFocus={e => e.target.select()}
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    disabled={isDisabled}
                  />
                </td>
                <td className="px-2 py-2.5 bg-green-50/20 border-l border-green-50">
                  <select
                    value={item.internalName ?? ''}
                    onChange={e => updateItem(idx, 'internalName', e.target.value)}
                    className="w-full text-xs bg-transparent border-b border-transparent hover:border-green-300 focus:border-[#014A99] outline-none py-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={isDisabled}
                  >
                    <option value="">-- 선택 --</option>
                    {(effectivePs(item.manufacturer)?.allNames ?? []).map(n => <option key={n} value={n}>{n}</option>)}
                    <option disabled>──────────</option>
                    <option value="수기 금액 추가">수기 금액 추가</option>
                  </select>
                </td>
                <td className="px-2 py-2.5 bg-green-50/20">
                  {item.internalName === '수기 금액 추가' ? (
                    <span className="block text-center text-gray-300 text-xs">-</span>
                  ) : (() => {
                    const name = item.internalName ?? ''
                    const rowPs = effectivePs(item.manufacturer)
                    if (rowPs?.hasSleeve(name)) {
                      return (
                        <select
                          value={item.pipeSpec ?? ''}
                          onChange={e => updateItem(idx, 'pipeSpec', e.target.value)}
                          className="w-full text-center text-xs bg-transparent border-b border-transparent hover:border-green-300 focus:border-[#014A99] outline-none py-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={isDisabled}
                        >
                          <option value="">-</option>
                          {rowPs.getPipeSizes(name).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )
                    }
                    if (rowPs?.isSpecOnly(name)) {
                      return (
                        <select
                          value={item.pipeSpec ?? ''}
                          onChange={e => updateItem(idx, 'pipeSpec', e.target.value)}
                          className="w-full text-xs bg-transparent border-b border-transparent hover:border-green-300 focus:border-[#014A99] outline-none py-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={isDisabled}
                        >
                          <option value="">-</option>
                          {rowPs.getSpecOptions(name).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )
                    }
                    return <span className="block text-center text-gray-300 text-xs">-</span>
                  })()}
                </td>
                <td className="px-2 py-2.5 bg-green-50/20">
                  {item.internalName === '수기 금액 추가' ? (
                    <span className="block text-center text-gray-300 text-xs">-</span>
                  ) : (() => {
                    const name = item.internalName ?? ''
                    const rowPs = effectivePs(item.manufacturer)
                    if (rowPs?.hasSleeve(name) && item.pipeSpec) {
                      return (
                        <select
                          value={item.sleeveSpec ?? ''}
                          onChange={e => updateItem(idx, 'sleeveSpec', e.target.value)}
                          className="w-full text-center text-xs bg-transparent border-b border-transparent hover:border-green-300 focus:border-[#014A99] outline-none py-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={isDisabled}
                        >
                          <option value="">-</option>
                          {rowPs.getSleeveOptions(name, item.pipeSpec).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )
                    }
                    return <span className="block text-center text-gray-300 text-xs">-</span>
                  })()}
                </td>
                <td className="px-2 py-2.5 bg-green-50/20 border-r border-green-50 text-right text-xs tabular-nums text-gray-500">
                  {item.internalName === '수기 금액 추가' ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full text-right bg-transparent border-b border-amber-300 focus:border-amber-500 outline-none py-0.5 text-xs text-amber-700 font-medium"
                      value={item.unitPrice ? item.unitPrice.toLocaleString('ko-KR') : ''}
                      placeholder="금액 입력"
                      onFocus={e => e.target.select()}
                      onChange={e => updateItem(idx, 'unitPrice', parseInt(e.target.value.replace(/,/g, ''), 10) || 0)}
                      disabled={isDisabled}
                    />
                  ) : item.unitPrice != null ? item.unitPrice.toLocaleString() : '—'}
                </td>
                {showNote && (
                  <td className="px-2 py-2.5">
                    <input
                      className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#014A99] outline-none py-0.5 text-xs text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      value={item.note ?? ''}
                      placeholder="비고"
                      onChange={e => updateItem(idx, 'note', e.target.value)}
                      disabled={isDisabled}
                    />
                  </td>
                )}
                <td className="px-2 py-2.5 text-center">
                  <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {(!hideAddButton || rightAction) && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-3">
          {rightAction && <div>{rightAction}</div>}
          {!hideAddButton && (
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-colors"
              style={{ color: '#014A99' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              행 추가
            </button>
          )}
        </div>
      )}

      {showHeatCalc && <HeatCalcSection items={items} openGroups={openGroups} setOpenGroups={setOpenGroups} />}
      {showHeatCalc && <SealantCalcSection items={items} sealantMap={sealantMap} open={sealantOpen} setOpen={setSealantOpen} />}
    </div>
  )
}

function heatTypeLabel(type: string) {
  return type.replace(/\*/g, '×').replace(/\d{3,4}$/, s => s) // "38T*400*4800" → "38T×400×4800"
}

function HeatCalcSection({
  items,
  openGroups,
  setOpenGroups,
}: {
  items: OrderItem[]
  openGroups: Set<string>
  setOpenGroups: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  const groups: HeatCalcGrouped[] = calcHeatInsulatorDetailed(items)
  if (groups.length === 0) return null

  function toggle(type: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  return (
    <div className="mt-3 rounded-xl border border-orange-200 overflow-hidden">
      {/* 헤더 요약 */}
      <div className="px-5 py-2.5 bg-orange-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-orange-700">차열재 계산 참고</span>
          <span className="flex items-center gap-2 text-xs text-orange-600">
            {groups.map(g => (
              <span key={g.type}>
                {heatTypeLabel(g.type)}{' '}
                <span className="bg-orange-200 text-orange-900 font-semibold px-1.5 py-0.5 rounded">{g.rolls}롤</span>
              </span>
            ))}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {groups.map(g => (
            <button
              key={g.type}
              onClick={() => toggle(g.type)}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 transition-colors cursor-pointer"
            >
              {heatTypeLabel(g.type)}
              <svg className={`w-3.5 h-3.5 transition-transform ${openGroups.has(g.type) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* 그룹별 상세 */}
      {groups.map(g => openGroups.has(g.type) && (
        <div key={g.type} className="border-t-2 border-orange-200">
          <div className="px-5 py-2 bg-orange-100/60 border-b border-orange-200 flex items-center gap-2">
            <span className="w-1 h-3.5 rounded-full bg-orange-400 inline-block shrink-0" />
            <span className="text-xs font-bold text-orange-700">{heatTypeLabel(g.type)}</span>
            <span className="text-xs text-orange-400">1롤 = {g.rollLengthMm.toLocaleString()}mm</span>
          </div>
          <div className="px-5 py-3 text-xs text-orange-900">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-orange-500 border-b border-orange-200">
                  <th className="text-left py-1 pr-4 font-medium">내부 품명</th>
                  <th className="text-left py-1 pr-4 font-medium">배관 × 슬리브</th>
                  <th className="text-left py-1 pr-4 font-medium">수량</th>
                  <th className="text-left py-1 pr-4 font-medium">계산식</th>
                  <th className="text-right py-1 font-medium">mm</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((r, i) => (
                  <tr key={i} className="border-b border-orange-100">
                    <td className="py-1 pr-4">{r.internalName}</td>
                    <td className="py-1 pr-4">{r.pipeSpec}{r.sleeveSpec ? ` × ${r.sleeveSpec}` : ''}</td>
                    <td className="py-1 pr-4">{r.quantity}개</td>
                    <td className="py-1 pr-4 font-mono">{r.lengthMmPerItem}mm × {r.quantity} =</td>
                    <td className="py-1 text-right">{r.totalMm.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="text-orange-600 font-semibold">
                  <td colSpan={3} className="pt-1.5">합계</td>
                  <td className="pt-1.5 font-mono">{g.totalMm.toLocaleString()}mm ÷ {g.rollLengthMm.toLocaleString()}</td>
                  <td className="pt-1.5 text-right">{g.rolls}롤</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function SealantCalcSection({
  items,
  sealantMap,
  open,
  setOpen,
}: {
  items: OrderItem[]
  sealantMap: Map<string, number>
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const result: SealantCalcResult | null = calcSealant(items, sealantMap)
  if (!result) return null

  return (
    <div className="mt-3 rounded-xl border border-teal-200 overflow-hidden">
      <div className="px-5 py-2.5 bg-teal-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-700">실란트 계산 참고</span>
          <span className="bg-teal-200 text-teal-900 font-semibold text-xs px-1.5 py-0.5 rounded">{result.count}개</span>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-700 transition-colors cursor-pointer"
        >
          상세보기
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="px-5 py-3 text-xs text-teal-900 border-t-2 border-teal-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-teal-500 border-b border-teal-200">
                <th className="text-left py-1 pr-4 font-medium">내부 품명</th>
                <th className="text-left py-1 pr-4 font-medium">배관 × 슬리브</th>
                <th className="text-left py-1 pr-4 font-medium">수량</th>
                <th className="text-left py-1 pr-4 font-medium">계산식</th>
                <th className="text-right py-1 font-medium">용량</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((r, i) => (
                <tr key={i} className="border-b border-teal-100">
                  <td className="py-1 pr-4">{r.internalName}</td>
                  <td className="py-1 pr-4">{r.pipeSpec}{r.sleeveSpec ? ` × ${r.sleeveSpec}` : ''}</td>
                  <td className="py-1 pr-4">{r.quantity}개</td>
                  <td className="py-1 pr-4 font-mono">{r.volumePerItem} × {r.quantity} =</td>
                  <td className="py-1 text-right">{r.totalVolume.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="text-teal-600 font-semibold">
                <td colSpan={3} className="pt-1.5">합계</td>
                <td className="pt-1.5 font-mono">{result.totalVolume.toLocaleString()} → 올림</td>
                <td className="pt-1.5 text-right">{result.count}개</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
