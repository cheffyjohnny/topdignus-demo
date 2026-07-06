'use client'

import { useCallback, useRef } from 'react'

export interface FireBlanketItem {
  id: number
  name: string
  spec?: string
  manufacturer?: string
  quantity: number
  unit_price: number
  note?: string
}

interface FireBlanketPrice {
  manufacturer: string
  item_name: string
  spec: string
  roll_price: number
}

interface FireBlanketSalePrice {
  manufacturer: string
  item_name: string
  customer_id: string
  roll_sale_price: number
}

interface Customer { id: string; name: string }

interface FireBlanketItemsTableProps {
  items: FireBlanketItem[]
  onChange: (items: FireBlanketItem[]) => void
  fireBlanketPrices: FireBlanketPrice[]
  fireBlanketSalePrices: FireBlanketSalePrice[]
  customers: Customer[]
  customerName: string
  deleteButton?: React.ReactNode
  onGrandTotal?: (total: number) => void
}

function calcAmount(item: FireBlanketItem) {
  return Math.round((item.unit_price || 0) * (item.quantity || 0))
}

let _nextId = 100

export function FireBlanketItemsTable({
  items, onChange, fireBlanketPrices, fireBlanketSalePrices, customers, customerName,
  deleteButton, onGrandTotal,
}: FireBlanketItemsTableProps) {
  const getAutoUnitPrice = useCallback((mfr: string, itemName: string): number => {
    const cid = customers.find(c => c.name === customerName)?.id
    if (cid) {
      const sp = fireBlanketSalePrices.find(d => d.manufacturer === mfr && d.item_name === itemName && d.customer_id === cid)
      if (sp && (sp.roll_sale_price ?? 0) > 0) return sp.roll_sale_price
    }
    return fireBlanketPrices.find(p => p.manufacturer === mfr && p.item_name === itemName)?.roll_price ?? 0
  }, [customers, customerName, fireBlanketPrices, fireBlanketSalePrices])

  function updateItem(id: number, patch: Partial<FireBlanketItem>) {
    onChange(items.map(it => {
      if (it.id !== id) return it
      const updated = { ...it, ...patch }

      if ('manufacturer' in patch) {
        // 제조사 변경 → 첫 번째 품목으로 초기화
        const mfrItems = fireBlanketPrices.filter(p => p.manufacturer === updated.manufacturer)
        const first = mfrItems[0]
        updated.name = first?.item_name ?? ''
        updated.spec = first?.spec ?? ''
        updated.unit_price = first ? getAutoUnitPrice(updated.manufacturer ?? '', first.item_name) : 0
      } else if ('name' in patch) {
        // 품명 변경 → 규격·단가 자동 갱신
        const matched = fireBlanketPrices.find(p => p.manufacturer === updated.manufacturer && p.item_name === updated.name)
        if (matched) {
          updated.spec = matched.spec
          updated.unit_price = getAutoUnitPrice(updated.manufacturer ?? '', updated.name)
        }
      }

      return updated
    }))
  }

  function addItem() {
    const first = fireBlanketPrices[0]
    onChange([...items, {
      id: _nextId++,
      name: first?.item_name ?? '',
      spec: first?.spec ?? '',
      manufacturer: first?.manufacturer,
      quantity: 1,
      unit_price: first ? getAutoUnitPrice(first.manufacturer, first.item_name) : 0,
    }])
  }

  function removeItem(id: number) {
    if (items.length === 1) return
    onChange(items.filter(it => it.id !== id))
  }

  const grandTotal = items.reduce((sum, it) => sum + calcAmount(it), 0)

  const prevGrandTotal = useRef(grandTotal)
  if (prevGrandTotal.current !== grandTotal) { prevGrandTotal.current = grandTotal; onGrandTotal?.(grandTotal) }

  return (
    <div>
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
            <span className="text-xs text-gray-400">단가/롤 (자동)</span>
            <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-[#014A99] hover:opacity-70 transition-opacity cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              행 추가
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-left w-36">제조사</th>
                <th className="px-3 py-2.5 text-left w-48">품명</th>
                <th className="px-3 py-2.5 text-left w-36">규격</th>
                <th className="px-3 py-2.5 text-right w-24">수량 (롤)</th>
                <th className="px-3 py-2.5 text-right w-32">단가</th>
                <th className="px-3 py-2.5 text-right w-32">금액</th>
                <th className="px-3 py-2.5 text-left">비고</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const amt = calcAmount(item)
                const mfrItems = fireBlanketPrices.filter(p => p.manufacturer === item.manufacturer)
                const matchedItem = mfrItems.find(p => p.item_name === item.name)

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    {/* 제조사 */}
                    <td className="px-3 py-2">
                      <select
                        value={item.manufacturer ?? ''}
                        onChange={e => updateItem(item.id, { manufacturer: e.target.value })}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#014A99] w-full cursor-pointer"
                      >
                        <option value="">-- 선택 --</option>
                        {[...new Set(fireBlanketPrices.map(p => p.manufacturer))].map(mfr => (
                          <option key={mfr} value={mfr}>{mfr}</option>
                        ))}
                      </select>
                    </td>

                    {/* 품명 */}
                    <td className="px-3 py-2">
                      {mfrItems.length > 0 ? (
                        <select
                          value={item.name}
                          onChange={e => updateItem(item.id, { name: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#014A99] w-full cursor-pointer"
                        >
                          {!item.name && <option value="">-- 선택 --</option>}
                          {mfrItems.map(p => (
                            <option key={p.item_name} value={p.item_name}>
                              {p.item_name || item.manufacturer || '(기본 품목)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={item.name}
                          onChange={e => updateItem(item.id, { name: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#014A99] w-full"
                          placeholder="품명"
                        />
                      )}
                    </td>

                    {/* 규격 */}
                    <td className="px-3 py-2">
                      {matchedItem ? (
                        <span className="text-sm text-gray-600 px-1">{matchedItem.spec || '—'}</span>
                      ) : (
                        <input
                          value={item.spec ?? ''}
                          onChange={e => updateItem(item.id, { spec: e.target.value })}
                          className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#014A99] w-full"
                          placeholder="규격"
                        />
                      )}
                    </td>

                    {/* 수량 */}
                    <td className="px-3 py-2">
                      <input
                        type="number" min={1} value={item.quantity || ''}
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) || 1 })}
                        onFocus={e => e.target.select()}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#014A99] w-full"
                        placeholder="1"
                      />
                    </td>

                    {/* 단가 */}
                    <td className="px-3 py-2">
                      <input
                        type="number" min={0} value={item.unit_price || ''}
                        onChange={e => updateItem(item.id, { unit_price: Number(e.target.value) || 0 })}
                        onFocus={e => e.target.select()}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:border-[#014A99] w-full tabular-nums"
                        placeholder="0"
                      />
                    </td>

                    {/* 금액 */}
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-gray-700">
                      {amt > 0 ? amt.toLocaleString('ko-KR') : '-'}
                    </td>

                    {/* 비고 */}
                    <td className="px-3 py-2">
                      <input
                        value={item.note ?? ''}
                        onChange={e => updateItem(item.id, { note: e.target.value })}
                        className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#014A99] w-full"
                        placeholder="비고"
                      />
                    </td>

                    {/* 삭제 */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors cursor-pointer"
                      >
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

        {grandTotal > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50/60">
            <span className="text-xs font-semibold text-gray-500">합계</span>
            <span className="font-bold text-gray-800 tabular-nums">{grandTotal.toLocaleString('ko-KR')}원</span>
          </div>
        )}
      </div>
    </div>
  )
}
