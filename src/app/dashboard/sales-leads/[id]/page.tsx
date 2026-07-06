'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

type Status = '등록' | '진행중' | '착공전' | '이관' | '체결' | '종료'

interface HistoryEntry {
  from_status: string | null
  to_status: string
  changed_at: string
}

interface SalesAccount {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
}

const STATUS_STYLES: Record<Status, string> = {
  등록: 'bg-gray-100 text-gray-600',
  진행중: 'bg-blue-100 text-blue-700',
  착공전: 'bg-purple-100 text-purple-700',
  이관: 'bg-amber-100 text-amber-700',
  체결: 'bg-green-100 text-green-700',
  종료: 'bg-red-100 text-red-600',
}

const STATUS_OPTIONS: Status[] = ['등록', '진행중', '착공전', '이관', '체결', '종료']

interface SalesLead {
  id: string
  dealership: string | null
  project_name: string | null
  address: string | null
  last_update: string | null
  construction_company: string | null
  facility_company: string | null
  contact_name: string | null
  contact_phone: string | null
  scale: string | null
  notes: string | null
  source_url: string | null
  status: Status
  status_history: HistoryEntry[]
  created_at: string
  account_id: string | null
  account: SalesAccount | null
}

interface FormData {
  dealership: string
  project_name: string
  address: string
  scale: string
  notes: string
  source_url: string
  account_id: string
}

function toForm(lead: SalesLead): FormData {
  return {
    dealership: lead.dealership ?? '',
    project_name: lead.project_name ?? '',
    address: lead.address ?? '',
    scale: lead.scale ?? '',
    notes: lead.notes ?? '',
    source_url: lead.source_url ?? '',
    account_id: lead.account_id ?? '',
  }
}

export default function SalesLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState<SalesLead | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [accounts, setAccounts] = useState<SalesAccount[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales-leads/${id}`).then(r => r.json()),
      fetch('/api/sales-accounts').then(r => r.json()),
    ]).then(([leadData, accountData]) => {
      if (leadData.error) { toast.error('찾을 수 없습니다.'); router.push('/dashboard/sales-leads'); return }
      setLead(leadData)
      setAccounts(Array.isArray(accountData) ? accountData : [])
    }).finally(() => setLoading(false))
  }, [id])

  function setField(key: keyof FormData, value: string) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function handleEditStart() {
    if (!lead) return
    setForm(toForm(lead))
    setEditing(true)
  }

  function handleEditCancel() {
    setEditing(false)
    setForm(null)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sales-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          account_id: form.account_id || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? '저장 실패'); return }
      setLead(data)
      setEditing(false)
      setForm(null)
      toast.success('저장되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(status: Status) {
    if (!lead || status === lead.status) return
    setStatusSaving(true)
    try {
      const res = await fetch(`/api/sales-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? '상태 변경 실패'); return }
      setLead(data)
      toast.success(`상태가 "${status}"로 변경되었습니다.`)
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('이 영업현장을 삭제하시겠습니까?')) return
    await fetch(`/api/sales-leads/${id}`, { method: 'DELETE' })
    toast.success('삭제되었습니다.')
    router.push('/dashboard/sales-leads')
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">불러오는 중...</div>
  if (!lead) return null

  const display = editing && form ? form : toForm(lead)

  // 현재 연결된 거래처 정보 (뷰 모드)
  const linkedAccount = editing
    ? accounts.find(a => a.id === form?.account_id) ?? null
    : lead.account

  // 구 텍스트 데이터 (FK 없는 레거시)
  const hasLegacyCompany = !lead.account_id && (lead.construction_company || lead.facility_company)

  return (
    <div className="p-6 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { sessionStorage.setItem('sl_from_back', '1'); router.push('/dashboard/sales-leads') }}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            ← 목록
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {lead.project_name || '(현장명 없음)'}
          </h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={handleEditCancel}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEditStart}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
              >
                편집
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 border border-red-200 text-red-600 text-sm rounded-md hover:bg-red-50 cursor-pointer"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 상태 변경 */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-sm text-gray-500 font-medium">상태</span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[lead.status] ?? STATUS_STYLES['등록']}`}>
          {lead.status}
        </span>
        <span className="text-gray-300">→</span>
        <select
          value={lead.status}
          onChange={e => handleStatusChange(e.target.value as Status)}
          disabled={statusSaving}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {statusSaving && <span className="text-xs text-gray-400">저장 중...</span>}
      </div>

      {/* 기본 정보 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">기본 정보</span>
        </div>
        <div className="divide-y divide-gray-100">
          <Row label="대리점">
            {editing
              ? <Input value={form!.dealership} onChange={v => setField('dealership', v)} />
              : display.dealership || '—'}
          </Row>
          <Row label="현장명">
            {editing
              ? <Input value={form!.project_name} onChange={v => setField('project_name', v)} />
              : display.project_name || '—'}
          </Row>
          <Row label="주소">
            {editing
              ? <Input value={form!.address} onChange={v => setField('address', v)} />
              : display.address || '—'}
          </Row>
          <Row label="규모">
            {editing
              ? <Input value={form!.scale} onChange={v => setField('scale', v)} />
              : display.scale || '—'}
          </Row>
          <Row label="최근 수정일">
            {lead?.last_update ? new Date(lead.last_update).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
          </Row>
        </div>
      </div>

      {/* 업체명 정보 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">업체명</span>
          {!editing && linkedAccount && (
            <button
              onClick={() => router.push(`/dashboard/sales-accounts/${linkedAccount.id}`)}
              className="text-xs text-green-600 hover:underline cursor-pointer"
            >
              거래처 상세 →
            </button>
          )}
        </div>
        <div className="p-4">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">업체명 선택</label>
                <select
                  value={form!.account_id}
                  onChange={e => setField('account_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  <option value="">— 선택 안 함 —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {accounts.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    등록된 거래처가 없습니다.{' '}
                    <button onClick={() => router.push('/dashboard/sales-accounts/new')} className="text-green-600 hover:underline cursor-pointer">
                      거래처 추가하기 →
                    </button>
                  </p>
                )}
              </div>
              {/* 선택된 거래처 미리보기 */}
              {linkedAccount && (
                <div className="bg-green-100 border border-green-200 rounded-md px-3 py-2.5 text-sm space-y-1">
                  <p className="font-medium text-green-800">{linkedAccount.name}</p>
                  {linkedAccount.contact_name && <p className="text-green-700 text-xs">담당자: {linkedAccount.contact_name}</p>}
                  {linkedAccount.contact_phone && <p className="text-green-700 text-xs">연락처: {linkedAccount.contact_phone}</p>}
                </div>
              )}
            </div>
          ) : linkedAccount ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-900">{linkedAccount.name}</p>
              {linkedAccount.contact_name && (
                <p className="text-sm text-gray-600">담당자: {linkedAccount.contact_name}</p>
              )}
              {linkedAccount.contact_phone && (
                <p className="text-sm text-gray-600">연락처: {linkedAccount.contact_phone}</p>
              )}
            </div>
          ) : hasLegacyCompany ? (
            // 레거시 텍스트 데이터 표시
            <div className="space-y-1.5">
              {lead.construction_company && <p className="text-sm text-gray-700">건설사: {lead.construction_company}</p>}
              {lead.facility_company && <p className="text-sm text-gray-700">설비사: {lead.facility_company}</p>}
              {lead.contact_name && <p className="text-sm text-gray-600">담당자: {lead.contact_name}</p>}
              {lead.contact_phone && <p className="text-sm text-gray-600">연락처: {lead.contact_phone}</p>}
              <p className="text-xs text-gray-400 mt-2">편집하여 거래처를 연결하면 더 효과적으로 관리할 수 있습니다.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">연결된 업체가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 비고 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">비고</span>
        </div>
        <div className="p-4">
          {editing ? (
            <textarea
              value={form!.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={8}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{display.notes || '—'}</p>
          )}
        </div>
      </div>

      {/* 출처 URL */}
      {(display.source_url || editing) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">링크</span>
          </div>
          <div className="p-4">
            {editing ? (
              <Input value={form!.source_url} onChange={v => setField('source_url', v)} placeholder="https://..." />
            ) : (
              <a
                href={display.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all cursor-pointer"
              >
                {display.source_url}
              </a>
            )}
          </div>
        </div>
      )}

      {/* 상태 변경 이력 */}
      {lead.status_history.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">상태 변경 이력</span>
          </div>
          <div className="divide-y divide-gray-100">
            {[...lead.status_history].reverse().map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-xs text-gray-400 w-36 flex-shrink-0">
                  {new Date(entry.changed_at).toLocaleString('ko-KR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {entry.from_status && (
                  <>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[entry.from_status as Status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {entry.from_status}
                    </span>
                    <span className="text-gray-400 text-xs">→</span>
                  </>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[entry.to_status as Status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {entry.to_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex px-4 py-2.5 text-sm">
      <span className="w-32 flex-shrink-0 text-gray-500 font-medium">{label}</span>
      <span className="flex-1 text-gray-900">{children}</span>
    </div>
  )
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}
