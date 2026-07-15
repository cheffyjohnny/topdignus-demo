'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { statusLabel, ORDER_STATUS_LABEL } from '@/lib/status-labels'

type OrderStatus = '수주' | '발주' | '납품' | '취소'
type StatusTab = '전체' | OrderStatus
type TypeTab = '전체' | '배관' | '덕트' | '배관·덕트'
type SortDir = 'asc' | 'desc'

interface PipeOrder {
  id: string; order_no?: string; vendor: string; project: string; contact_name: string
  order_date: string; delivery_date: string; author: string; status: OrderStatus
  sale_amount: number; purchase_amount: number; freight: number
  manufacturer: string; group_id: string | null; no_invoice: boolean
}

interface DuctOrder {
  id: string; order_no?: string; manufacturer: string; customer_name: string; project: string
  contact_name: string; order_date: string; delivery_date: string; author: string; status: OrderStatus
  sale_amount: number; purchase_amount: number; freight: number; group_id: string | null; no_invoice: boolean
}

interface SubOrder {
  id: string; order_no?: string; manufacturer: string; status: string
  sale_amount: number; purchase_amount: number; freight: number
}

interface OrderGroup {
  id: string; vendor: string; order_client?: string; project?: string
  order_date?: string; author?: string; created_at: string
  pipe_orders: SubOrder[]
  duct_orders: SubOrder[]
}

interface ConfirmTarget {
  id: string; type: '배관' | '덕트' | '그룹'; vendor: string; project: string; order_date: string
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  '수주': 'bg-blue-50 text-blue-700 border-blue-200',
  '발주': 'bg-amber-50 text-amber-700 border-amber-200',
  '납품': 'bg-green-50 text-green-700 border-green-200',
  '취소': 'bg-gray-50 text-gray-500 border-gray-200',
}

const STATUS_TABS: StatusTab[] = ['전체', '수주', '발주', '납품', '취소']
const TYPE_TABS: TypeTab[] = ['전체', '배관', '덕트', '배관·덕트']
const TYPE_LABEL: Record<TypeTab, string> = { '전체': 'All', '배관': 'Pipe', '덕트': 'Duct', '배관·덕트': 'Pipe+Duct' }
const STATUS_TAB_LABEL: Record<StatusTab, string> = { '전체': 'All', '수주': 'Ordered', '발주': 'Purchased', '납품': 'Delivered', '취소': 'Cancelled' }

type ColKey = 'order_no' | 'order_date' | 'delivery_date' | 'vendor' | 'project' | 'manufacturer' | 'supply_amount' | 'sale_vat' | 'buy_vat' | 'profit' | 'status'

const COLUMNS: { key: ColKey; label: string; pinned?: boolean }[] = [
  { key: 'order_no',      label: 'Order No.' },
  { key: 'order_date',    label: 'Order Date' },
  { key: 'delivery_date', label: 'Delivery Date' },
  { key: 'vendor',        label: 'Vendor',   pinned: true },
  { key: 'project',       label: 'Project',  pinned: true },
  { key: 'manufacturer',  label: 'Manufacturer' },
  { key: 'supply_amount', label: 'Supply Amount' },
  { key: 'sale_vat',      label: 'Sales (VAT)' },
  { key: 'buy_vat',       label: 'Cost (VAT)' },
  { key: 'profit',        label: 'Profit' },
  { key: 'status',        label: 'Status',   pinned: true },
]
const ALL_COL_KEYS = COLUMNS.map(c => c.key)
const COL_VIS_KEY    = 'orders_columns'
const COL_ORDER_KEY  = 'orders_col_order'
const COL_WIDTHS_KEY = 'orders_col_widths'

const DEFAULT_WIDTHS: Record<ColKey, number> = {
  order_no:      112,
  order_date:    96,
  delivery_date: 96,
  vendor:        120,
  project:       144,
  manufacturer:  96,
  supply_amount: 112,
  sale_vat:      112,
  buy_vat:       112,
  profit:        112,
  status:        96,
}

function groupType(g: OrderGroup): '배관' | '덕트' | '배관·덕트' {
  const hasPipe = g.pipe_orders.length > 0, hasDuct = g.duct_orders.length > 0
  if (hasPipe && hasDuct) return '배관·덕트'
  if (hasDuct) return '덕트'
  return '배관'
}
function groupSale(g: OrderGroup) {
  return [...g.pipe_orders, ...g.duct_orders].reduce((s, o) => s + (o.sale_amount ?? 0) + (o.freight ?? 0), 0)
}
function groupPurchase(g: OrderGroup) {
  return [...g.pipe_orders, ...g.duct_orders].reduce((s, o) => s + (o.purchase_amount ?? 0) + (o.freight ?? 0), 0)
}

export default function OrdersPage() {
  const router = useRouter()
  const [typeTab, setTypeTab]       = useState<TypeTab>('전체')
  const [statusTab, setStatusTab]   = useState<StatusTab>('전체')
  const [pipeOrders, setPipeOrders] = useState<PipeOrder[]>([])
  const [ductOrders, setDuctOrders] = useState<DuctOrder[]>([])
  const [groups, setGroups]         = useState<OrderGroup[]>([])
  const [loading, setLoading]       = useState(true)
  const [vendorFilter, setVendorFilter] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [sortKey, setSortKey]       = useState<string | null>('order_no')
  const [sortDir, setSortDir]       = useState<SortDir>('desc')
  const [dateField, setDateField]   = useState<'order_date' | 'delivery_date'>('order_date')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)

  // column customization
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(ALL_COL_KEYS)
  const [colOrder, setColOrder]       = useState<ColKey[]>(ALL_COL_KEYS)
  const [colWidths, setColWidths]     = useState<Record<ColKey, number>>(DEFAULT_WIDTHS)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const [dragColIdx, setDragColIdx]   = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const colWidthsRef   = useRef<Record<ColKey, number>>(DEFAULT_WIDTHS)

  // load from localStorage
  useEffect(() => {
    try {
      const vis = localStorage.getItem(COL_VIS_KEY)
      if (vis) {
        const parsed = JSON.parse(vis) as ColKey[]
        const pinned = COLUMNS.filter(c => c.pinned).map(c => c.key)
        setVisibleCols([...new Set([...pinned, ...parsed.filter((k): k is ColKey => ALL_COL_KEYS.includes(k))])])
      }
      const ord = localStorage.getItem(COL_ORDER_KEY)
      if (ord) {
        const parsed = JSON.parse(ord) as ColKey[]
        const valid = parsed.filter((k): k is ColKey => ALL_COL_KEYS.includes(k))
        const missing = ALL_COL_KEYS.filter(k => !valid.includes(k))
        setColOrder([...valid, ...missing])
      }
      const widths = localStorage.getItem(COL_WIDTHS_KEY)
      if (widths) {
        const parsed = JSON.parse(widths) as Partial<Record<ColKey, number>>
        const merged = { ...DEFAULT_WIDTHS, ...parsed }
        setColWidths(merged)
        colWidthsRef.current = merged
      }
    } catch {}
  }, [])

  // click-outside for picker
  useEffect(() => {
    if (!colPickerOpen) return
    function h(e: MouseEvent) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setColPickerOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [colPickerOpen])

  const orderedVisibleCols = useMemo(
    () => colOrder.filter(k => visibleCols.includes(k)),
    [colOrder, visibleCols]
  )

  function toggleColVis(key: ColKey) {
    setVisibleCols(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      try { localStorage.setItem(COL_VIS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function reorderCols(from: number, to: number) {
    setColOrder(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      try { localStorage.setItem(COL_ORDER_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function startResize(e: React.MouseEvent, key: ColKey) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidthsRef.current[key]
    function onMove(e: MouseEvent) {
      const w = Math.max(60, startW + (e.clientX - startX))
      setColWidths(prev => {
        const next = { ...prev, [key]: w }
        colWidthsRef.current = next
        return next
      })
    }
    function onUp() {
      try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidthsRef.current)) } catch {}
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // data
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [pRes, dRes, gRes] = await Promise.all([
      fetch('/api/orders?standalone=true'),
      fetch('/api/duct-orders?standalone=true'),
      fetch('/api/order-groups'),
    ])
    const [pData, dData, gData] = await Promise.all([pRes.json(), dRes.json(), gRes.json()])
    setPipeOrders(Array.isArray(pData) ? pData : [])
    setDuctOrders(Array.isArray(dData) ? dData : [])
    setGroups(Array.isArray(gData) ? gData : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function onTypeTabChange(tab: TypeTab) { setTypeTab(tab); setVendorFilter(''); setSortKey(null) }

  const vendorList = useMemo(() => {
    const names: string[] = []
    if (typeTab === '전체' || typeTab === '배관')    names.push(...pipeOrders.map(o => o.vendor))
    if (typeTab === '전체' || typeTab === '덕트')    names.push(...ductOrders.map(o => o.customer_name))
    if (typeTab === '전체' || typeTab === '배관·덕트') names.push(...groups.map(g => g.vendor))
    return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [typeTab, pipeOrders, ductOrders, groups])

  const typeCounts = useMemo(() => ({
    '전체': pipeOrders.length + ductOrders.length + groups.length,
    '배관': pipeOrders.length, '덕트': ductOrders.length, '배관·덕트': groups.length,
  }), [pipeOrders, ductOrders, groups])

  function matchesFilter(status: OrderStatus, date: string, vendor: string) {
    if (statusTab !== '전체' && status !== statusTab) return false
    const d = date?.slice(0, 10) ?? ''
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (vendorFilter && vendor !== vendorFilter) return false
    return true
  }
  function groupMatchesFilter(g: OrderGroup) {
    const allSt = [...g.pipe_orders, ...g.duct_orders].map(o => o.status as OrderStatus)
    if (statusTab !== '전체' && !allSt.includes(statusTab)) return false
    const d = g.order_date?.slice(0, 10) ?? ''
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    if (vendorFilter && g.vendor !== vendorFilter) return false
    return true
  }
  function sortList<T extends Record<string, any>>(list: T[]): T[] {
    if (!sortKey) return list
    return [...list].sort((a, b) => {
      const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'ko', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filteredPipe   = useMemo(() => sortList(pipeOrders.filter(o => matchesFilter(o.status, o[dateField], o.vendor))), [pipeOrders, statusTab, vendorFilter, dateFrom, dateTo, dateField, sortKey, sortDir])
  const filteredDuct   = useMemo(() => sortList(ductOrders.filter(o => matchesFilter(o.status, o[dateField], o.customer_name))), [ductOrders, statusTab, vendorFilter, dateFrom, dateTo, dateField, sortKey, sortDir])
  const filteredGroups = useMemo(() => groups.filter(groupMatchesFilter), [groups, statusTab, vendorFilter, dateFrom, dateTo])

  async function confirmDelete() {
    if (!confirmTarget) return
    setDeletingId(confirmTarget.id)
    setConfirmTarget(null)
    if (confirmTarget.type === '배관') {
      await fetch(`/api/orders/${confirmTarget.id}`, { method: 'DELETE' })
      setPipeOrders(prev => prev.filter(o => o.id !== confirmTarget.id))
    } else if (confirmTarget.type === '덕트') {
      await fetch(`/api/duct-orders/${confirmTarget.id}`, { method: 'DELETE' })
      setDuctOrders(prev => prev.filter(o => o.id !== confirmTarget.id))
    } else {
      await fetch(`/api/order-groups/${confirmTarget.id}`, { method: 'DELETE' })
      setGroups(prev => prev.filter(g => g.id !== confirmTarget.id))
    }
    setDeletingId(null)
  }

  // column renderer registry
  type GroupExtras = { sale: number; saleVat: number; buyVat: number | null; profitVal: number | null; allSubs: SubOrder[] }
  const colRender: Record<ColKey, {
    th: () => React.ReactNode
    groupTd: (g: OrderGroup, ex: GroupExtras) => React.ReactNode
    pipeTd:  (o: PipeOrder) => React.ReactNode
    ductTd:  (o: DuctOrder) => React.ReactNode
  }> = {
    order_no: {
      th: () => <SortThR key="order_no" label="Order No." col="order_no" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} width={colWidths.order_no} onResizeStart={e => startResize(e, 'order_no')} />,
      groupTd: () => <td key="order_no" className="px-4 py-3 text-gray-400 text-xs">—</td>,
      pipeTd:  o  => <td key="order_no" className="px-4 py-3 text-gray-500 text-xs font-mono">{o.order_no ?? '-'}</td>,
      ductTd:  o  => <td key="order_no" className="px-4 py-3 text-gray-500 text-xs font-mono">{o.order_no ?? '-'}</td>,
    },
    order_date: {
      th: () => <SortThR key="order_date" label="Order Date" col="order_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} width={colWidths.order_date} onResizeStart={e => startResize(e, 'order_date')} />,
      groupTd: g  => <td key="order_date" className="px-4 py-3 text-gray-500">{g.order_date?.slice(0, 10) ?? '-'}</td>,
      pipeTd:  o  => <td key="order_date" className="px-4 py-3 text-gray-500">{o.order_date?.slice(0, 10) ?? '-'}</td>,
      ductTd:  o  => <td key="order_date" className="px-4 py-3 text-gray-500">{o.order_date?.slice(0, 10) ?? '-'}</td>,
    },
    delivery_date: {
      th: () => <SortThR key="delivery_date" label="Delivery Date" col="delivery_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} width={colWidths.delivery_date} onResizeStart={e => startResize(e, 'delivery_date')} />,
      groupTd: () => <td key="delivery_date" className="px-4 py-3 text-gray-400">—</td>,
      pipeTd:  o  => <td key="delivery_date" className="px-4 py-3 text-gray-500">{o.delivery_date?.slice(0, 10) ?? '-'}</td>,
      ductTd:  o  => <td key="delivery_date" className="px-4 py-3 text-gray-500">{o.delivery_date?.slice(0, 10) ?? '-'}</td>,
    },
    vendor: {
      th: () => <SortThR key="vendor" label="Vendor" col="vendor" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} width={colWidths.vendor} onResizeStart={e => startResize(e, 'vendor')} />,
      groupTd: g  => <td key="vendor" className="px-4 py-3 font-medium">{g.vendor}</td>,
      pipeTd:  o  => <td key="vendor" className="px-4 py-3 font-medium">{o.vendor}</td>,
      ductTd:  o  => <td key="vendor" className="px-4 py-3 font-medium">{o.customer_name || '-'}</td>,
    },
    project: {
      th: () => <SortThR key="project" label="Project" col="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} width={colWidths.project} onResizeStart={e => startResize(e, 'project')} />,
      groupTd: g  => <td key="project" className="px-4 py-3">{g.project || '-'}</td>,
      pipeTd:  o  => <td key="project" className="px-4 py-3"><div className="flex items-center gap-1.5">{o.project || '-'}{o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">No Invoice</span>}</div></td>,
      ductTd:  o  => <td key="project" className="px-4 py-3"><div className="flex items-center gap-1.5">{o.project || '-'}{o.no_invoice && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 whitespace-nowrap flex-shrink-0">No Invoice</span>}</div></td>,
    },
    manufacturer: {
      th: () => <PlainThR key="manufacturer" label="Manufacturer" width={colWidths.manufacturer} onResizeStart={e => startResize(e, 'manufacturer')} />,
      groupTd: g  => <td key="manufacturer" className="px-4 py-3 text-xs text-gray-500">{[...new Set([...g.pipe_orders, ...g.duct_orders].map(s => s.manufacturer).filter(Boolean))].join(', ') || '-'}</td>,
      pipeTd:  o  => <td key="manufacturer" className="px-4 py-3 text-xs text-gray-500">{o.manufacturer || '-'}</td>,
      ductTd:  o  => <td key="manufacturer" className="px-4 py-3 text-xs text-gray-500">{o.manufacturer || '-'}</td>,
    },
    supply_amount: {
      th: () => <PlainThR key="supply_amount" label="Supply Amount" align="right" className="text-gray-400" width={colWidths.supply_amount} onResizeStart={e => startResize(e, 'supply_amount')} />,
      groupTd: (_, { sale })     => <td key="supply_amount" className="px-4 py-3 text-right text-xs tabular-nums text-gray-500">{fmt(sale)}</td>,
      pipeTd:  o                 => <td key="supply_amount" className="px-4 py-3 text-right text-xs tabular-nums text-gray-500">{fmt(o.no_invoice ? (o.freight ?? 0) : (o.sale_amount ?? 0) + (o.freight ?? 0))}</td>,
      ductTd:  o                 => <td key="supply_amount" className="px-4 py-3 text-right text-xs tabular-nums text-gray-500">{fmt(o.no_invoice ? (o.freight ?? 0) : (o.sale_amount ?? 0) + (o.freight ?? 0))}</td>,
    },
    sale_vat: {
      th: () => <PlainThR key="sale_vat" label="Sales (VAT)" align="right" className="text-blue-600" width={colWidths.sale_vat} onResizeStart={e => startResize(e, 'sale_vat')} />,
      groupTd: (_, { saleVat })  => <td key="sale_vat" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-blue-700">{fmt(saleVat)}</td>,
      pipeTd:  o                 => <td key="sale_vat" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-blue-700">{fmt(Math.round((o.no_invoice ? (o.freight ?? 0) : (o.sale_amount ?? 0) + (o.freight ?? 0)) * 1.1))}</td>,
      ductTd:  o                 => <td key="sale_vat" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-blue-700">{fmt(Math.round((o.no_invoice ? (o.freight ?? 0) : (o.sale_amount ?? 0) + (o.freight ?? 0)) * 1.1))}</td>,
    },
    buy_vat: {
      th: () => <PlainThR key="buy_vat" label="Cost (VAT)" align="right" className="text-red-500" width={colWidths.buy_vat} onResizeStart={e => startResize(e, 'buy_vat')} />,
      groupTd: (_, { buyVat })   => <td key="buy_vat" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-red-500">{buyVat ? fmt(buyVat) : '—'}</td>,
      pipeTd:  o                 => <td key="buy_vat" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-red-500">{o.no_invoice ? (o.freight ? fmt(Math.round((o.freight ?? 0) * 1.1)) : '—') : o.purchase_amount > 0 ? fmt(Math.round(((o.purchase_amount ?? 0) + (o.freight ?? 0)) * 1.1)) : '—'}</td>,
      ductTd:  o                 => <td key="buy_vat" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-red-500">{o.no_invoice ? (o.freight ? fmt(Math.round((o.freight ?? 0) * 1.1)) : '—') : o.purchase_amount > 0 ? fmt(Math.round(((o.purchase_amount ?? 0) + (o.freight ?? 0)) * 1.1)) : '—'}</td>,
    },
    profit: {
      th: () => <PlainThR key="profit" label="Profit" align="right" className="text-green-600" width={colWidths.profit} onResizeStart={e => startResize(e, 'profit')} />,
      groupTd: (_, { profitVal }) => <td key="profit" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-green-600">{profitVal != null ? fmt(profitVal) : '—'}</td>,
      pipeTd:  o                  => <td key="profit" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-green-600">{o.no_invoice ? '—' : o.purchase_amount > 0 ? fmt((o.sale_amount ?? 0) - (o.purchase_amount ?? 0)) : '—'}</td>,
      ductTd:  o                  => <td key="profit" className="px-4 py-3 text-right text-xs tabular-nums font-medium text-green-600">{o.no_invoice ? '—' : o.purchase_amount > 0 ? fmt((o.sale_amount ?? 0) - (o.purchase_amount ?? 0)) : '—'}</td>,
    },
    status: {
      th: () => <PlainThR key="status" label="Status" align="center" width={colWidths.status} onResizeStart={e => startResize(e, 'status')} />,
      groupTd: (_, { allSubs }) => (
        <td key="status" className="px-4 py-3 text-center">
          <div className="flex flex-col gap-0.5 items-center">
            {allSubs.map(s => (
              <span key={s.id} className={`text-xs font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[s.status as OrderStatus]}`}>{s.manufacturer.slice(0, 4)} {statusLabel(s.status, ORDER_STATUS_LABEL)}</span>
            ))}
          </div>
        </td>
      ),
      pipeTd: o => <td key="status" className="px-4 py-3 text-center"><span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[o.status]}`}>{statusLabel(o.status, ORDER_STATUS_LABEL)}</span></td>,
      ductTd: o => <td key="status" className="px-4 py-3 text-center"><span className={`text-xs font-medium px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[o.status]}`}>{statusLabel(o.status, ORDER_STATUS_LABEL)}</span></td>,
    },
  }

  const hasFilters   = vendorFilter || dateFrom || dateTo
  const displayCount = typeTab === '배관' ? filteredPipe.length : typeTab === '덕트' ? filteredDuct.length : typeTab === '배관·덕트' ? filteredGroups.length : filteredPipe.length + filteredDuct.length + filteredGroups.length

  return (
    <>
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage pipe and duct order records.</p>
        </div>
        <div className="flex items-center gap-2">
          {(typeTab === '전체' || typeTab === '배관·덕트') && (
            <button onClick={() => router.push('/dashboard/orders/groups/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Group Order
            </button>
          )}
          {(typeTab === '전체' || typeTab === '배관') && (
            <button onClick={() => router.push('/dashboard/orders/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {typeTab === '전체' ? 'New Pipe Order' : 'New Order'}
            </button>
          )}
          {(typeTab === '전체' || typeTab === '덕트') && (
            <button onClick={() => router.push('/dashboard/duct-orders/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {typeTab === '전체' ? 'New Duct Order' : 'New Order'}
            </button>
          )}
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1">
        {TYPE_TABS.map(tab => (
          <button key={tab} onClick={() => onTypeTabChange(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              typeTab === tab
                ? tab === '덕트' ? 'bg-orange-500 text-white'
                  : tab === '배관·덕트' ? 'bg-purple-600 text-white'
                  : 'bg-[#014A99] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {TYPE_LABEL[tab]}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{typeCounts[tab]}</span>
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setStatusTab(tab)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px cursor-pointer ${statusTab === tab ? 'border-[#014A99] text-[#014A99]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {STATUS_TAB_LABEL[tab]}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button onClick={() => setDateField('order_date')} className={`px-2.5 py-1.5 transition-colors cursor-pointer ${dateField === 'order_date' ? 'bg-[#014A99] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Order Date</button>
          <button onClick={() => setDateField('delivery_date')} className={`px-2.5 py-1.5 transition-colors cursor-pointer ${dateField === 'delivery_date' ? 'bg-[#014A99] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Delivery Date</button>
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white" />
        <span className="text-gray-400 text-sm">~</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white" />
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#014A99] bg-white cursor-pointer">
          <option value="">All Vendors</option>
          {vendorList.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setVendorFilter(''); setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Reset
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{displayCount}</span>
        <button onClick={() => { const p = new URLSearchParams({ type: typeTab, status: statusTab }); if (dateFrom) p.set('dateFrom', dateFrom); if (dateTo) p.set('dateTo', dateTo); if (vendorFilter) p.set('vendor', vendorFilter); window.location.href = `/api/orders/export?${p}` }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Excel
        </button>

        {/* Column picker */}
        <div className="relative" ref={colPickerRef}>
          <button onClick={() => setColPickerOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
            Columns
          </button>
          {colPickerOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52 space-y-0.5">
              <p className="text-xs text-gray-400 px-2 pb-1.5 border-b border-gray-100 mb-1.5">Drag to reorder</p>
              {colOrder.map((key, idx) => {
                const c = COLUMNS.find(c => c.key === key)!
                return (
                  <div key={key} draggable={!c.pinned}
                    onDragStart={() => { if (!c.pinned) setDragColIdx(idx) }}
                    onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                    onDrop={e => { e.preventDefault(); if (dragColIdx !== null && dragColIdx !== idx) reorderCols(dragColIdx, idx); setDragColIdx(null); setDragOverIdx(null) }}
                    onDragEnd={() => { setDragColIdx(null); setDragOverIdx(null) }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors select-none
                      ${dragOverIdx === idx && dragColIdx !== idx ? 'bg-blue-50 border border-blue-200' : ''}
                      ${dragColIdx === idx ? 'opacity-40' : ''}
                      ${c.pinned ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                    <svg className={`w-3 h-3 text-gray-300 flex-shrink-0 ${c.pinned ? 'cursor-not-allowed' : 'cursor-grab'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8-12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                    </svg>
                    <input type="checkbox" checked={visibleCols.includes(key)} disabled={!!c.pinned}
                      onChange={() => { if (!c.pinned) toggleColVis(key) }}
                      className="rounded cursor-pointer" onClick={e => e.stopPropagation()} />
                    <span className={c.pinned ? '' : 'cursor-grab'}>{c.label}</span>
                    {c.pinned && <span className="text-gray-300 ml-auto">Fixed</span>}
                  </div>
                )
              })}
              <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                <button onClick={() => { setColWidths(DEFAULT_WIDTHS); colWidthsRef.current = DEFAULT_WIDTHS; try { localStorage.removeItem(COL_WIDTHS_KEY) } catch {} }}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 px-2 py-1 text-left transition-colors cursor-pointer">
                  Reset Column Widths
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
      ) : displayCount === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No orders.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 48 }} />
              <col style={{ width: 80 }} />
              {orderedVisibleCols.map(k => <col key={k} style={{ width: colWidths[k] }} />)}
              <col style={{ width: 56 }} />
            </colgroup>
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">No.</th>
                <th className="px-4 py-3 text-left">Type</th>
                {orderedVisibleCols.map(k => colRender[k].th())}
                <th className="px-4 py-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(typeTab === '전체' || typeTab === '배관·덕트') && filteredGroups.map((g, i) => {
                const type = groupType(g)
                const sale = groupSale(g)
                const purchase = groupPurchase(g)
                const saleVat  = Math.round(sale * 1.1)
                const buyVat   = purchase > 0 ? Math.round(purchase * 1.1) : null
                const profitVal = purchase > 0 ? sale - [...g.pipe_orders, ...g.duct_orders].reduce((s, o) => s + (o.purchase_amount ?? 0), 0) : null
                const allSubs  = [...g.pipe_orders, ...g.duct_orders]
                return (
                  <tr key={`group-${g.id}`} onClick={() => router.push(`/dashboard/orders/groups/${g.id}`)}
                    className="bg-purple-50/30 hover:bg-purple-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs text-center">{i + 1}</td>
                    <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap bg-purple-50 text-purple-700 border-purple-200">{TYPE_LABEL[type]}</span></td>
                    {orderedVisibleCols.map(k => colRender[k].groupTd(g, { sale, saleVat, buyVat, profitVal, allSubs }))}
                    <td className="px-4 py-3 text-center">
                      <DeleteBtn id={g.id} deletingId={deletingId} onClick={e => { e.stopPropagation(); setConfirmTarget({ id: g.id, type: '그룹', vendor: g.vendor, project: g.project ?? '', order_date: g.order_date ?? '' }) }} />
                    </td>
                  </tr>
                )
              })}
              {(typeTab === '전체' || typeTab === '배관') && filteredPipe.map((o, i) => (
                <tr key={`pipe-${o.id}`} onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                  className="bg-white hover:bg-blue-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs text-center">{filteredGroups.length + i + 1}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200">Pipe</span></td>
                  {orderedVisibleCols.map(k => colRender[k].pipeTd(o))}
                  <td className="px-4 py-3 text-center"><DeleteBtn id={o.id} deletingId={deletingId} onClick={e => { e.stopPropagation(); setConfirmTarget({ id: o.id, type: '배관', vendor: o.vendor, project: o.project, order_date: o.order_date }) }} /></td>
                </tr>
              ))}
              {(typeTab === '전체' || typeTab === '덕트') && filteredDuct.map((o, i) => (
                <tr key={`duct-${o.id}`} onClick={() => router.push(`/dashboard/duct-orders/${o.id}`)}
                  className="bg-white hover:bg-orange-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs text-center">{filteredGroups.length + filteredPipe.length + i + 1}</td>
                  <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap bg-orange-50 text-orange-600 border-orange-200">Duct</span></td>
                  {orderedVisibleCols.map(k => colRender[k].ductTd(o))}
                  <td className="px-4 py-3 text-center"><DeleteBtn id={o.id} deletingId={deletingId} onClick={e => { e.stopPropagation(); setConfirmTarget({ id: o.id, type: '덕트', vendor: o.customer_name, project: o.project, order_date: o.order_date }) }} /></td>
                </tr>
              ))}
            </tbody>
            {(() => {
              const allFiltered = [
                ...((typeTab === '전체' || typeTab === '배관') ? filteredPipe : []),
                ...((typeTab === '전체' || typeTab === '덕트') ? filteredDuct : []),
              ]
              const groupSaleTotal    = (typeTab === '전체' || typeTab === '배관·덕트') ? filteredGroups.reduce((s, g) => s + groupSale(g), 0) : 0
              const groupPurchTotal   = (typeTab === '전체' || typeTab === '배관·덕트') ? filteredGroups.reduce((s, g) => s + groupPurchase(g), 0) : 0
              const supplyTotal  = allFiltered.reduce((s, o) => s + (o.no_invoice ? (o.freight ?? 0) : (o.sale_amount ?? 0) + (o.freight ?? 0)), 0) + groupSaleTotal
              const saleVatTotal = Math.round(supplyTotal * 1.1)
              const buyVatTotal  = Math.round((allFiltered.reduce((s, o) => s + (o.no_invoice ? (o.freight ?? 0) : (o.purchase_amount ?? 0) + (o.freight ?? 0)), 0) + groupPurchTotal) * 1.1)
              const profitTotal  = allFiltered.reduce((s, o) => o.no_invoice ? s : s + (o.sale_amount ?? 0) - (o.purchase_amount ?? 0), 0) + (groupSaleTotal - groupPurchTotal)
              const totalCount   = displayCount
              return (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 text-xs font-semibold text-gray-600">
                    <td className="px-4 py-3 text-center text-gray-400">{totalCount}</td>
                    <td className="px-4 py-3 text-gray-400">Total</td>
                    {orderedVisibleCols.map(k => {
                      if (k === 'supply_amount') return <td key={k} className="px-4 py-3 text-right tabular-nums text-gray-700">{fmt(supplyTotal)}</td>
                      if (k === 'sale_vat')      return <td key={k} className="px-4 py-3 text-right tabular-nums text-blue-700">{fmt(saleVatTotal)}</td>
                      if (k === 'buy_vat')       return <td key={k} className="px-4 py-3 text-right tabular-nums text-red-500">{fmt(buyVatTotal)}</td>
                      if (k === 'profit')        return <td key={k} className="px-4 py-3 text-right tabular-nums text-green-600">{fmt(profitTotal)}</td>
                      return <td key={k} />
                    })}
                    <td />
                  </tr>
                </tfoot>
              )
            })()}
          </table>
        </div>
      )}
    </div>

    {confirmTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{confirmTarget.type === '그룹' ? 'Delete Group Order' : 'Delete Order'}</p>
              <p className="text-sm text-gray-500 mt-0.5">{confirmTarget.type === '그룹' ? 'Sub-orders will be detached from the group.' : 'This cannot be undone.'}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <p><span className="text-gray-400 w-16 inline-block">Vendor</span><span className="font-medium">{confirmTarget.vendor}</span></p>
            <p><span className="text-gray-400 w-16 inline-block">Project</span><span>{confirmTarget.project || '-'}</span></p>
            <p><span className="text-gray-400 w-16 inline-block">Order Date</span><span>{confirmTarget.order_date?.slice(0, 10) ?? '-'}</span></p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setConfirmTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
            <button onClick={confirmDelete} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 cursor-pointer">Delete</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function fmt(n: number | null | undefined) {
  if (!n) return '—'
  return Math.round(n).toLocaleString('ko-KR')
}

function DeleteBtn({ id, deletingId, onClick }: { id: string; deletingId: string | null; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} disabled={deletingId === id} className="text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer">
      {deletingId === id
        ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
    </button>
  )
}

// 정렬 가능 th + 리사이즈 핸들
function SortThR({ label, col, sortKey, sortDir, onSort, width, onResizeStart }: {
  label: string; col: string; sortKey: string | null; sortDir: 'asc' | 'desc'
  onSort: (col: string) => void; width: number; onResizeStart: (e: React.MouseEvent) => void
}) {
  const active = sortKey === col
  return (
    <th style={{ width, minWidth: 60 }}
      className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-700 group relative overflow-hidden"
      onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1 truncate">
        {label}
        <span className={`flex-shrink-0 transition-colors ${active ? 'text-[#014A99]' : 'text-gray-300 group-hover:text-gray-400'}`}>
          {active && sortDir === 'asc' ? '↑' : active && sortDir === 'desc' ? '↓' : '↕'}
        </span>
      </span>
      <div onMouseDown={e => { e.stopPropagation(); onResizeStart(e) }}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50 group-hover:bg-gray-300/40" />
    </th>
  )
}

// 일반 th + 리사이즈 핸들
function PlainThR({ label, width, onResizeStart, align = 'left', className = '' }: {
  label: string; width: number; onResizeStart: (e: React.MouseEvent) => void
  align?: 'left' | 'right' | 'center'; className?: string
}) {
  return (
    <th style={{ width, minWidth: 60 }}
      className={`px-4 py-3 relative overflow-hidden ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${className}`}>
      <span className="truncate block">{label}</span>
      <div onMouseDown={e => { e.stopPropagation(); onResizeStart(e) }}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50 hover:bg-gray-300/40" />
    </th>
  )
}
