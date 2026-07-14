'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { statusLabel, SALES_LEAD_STATUS_LABEL } from '@/lib/status-labels'

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
      if (leadData.error) { toast.error('Not found.'); router.push('/dashboard/sales-leads'); return }
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
      if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
      setLead(data)
      setEditing(false)
      setForm(null)
      toast.success('Saved successfully.')
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
      if (!res.ok) { toast.error(data.error ?? 'Status change failed'); return }
      setLead(data)
      toast.success(`Status changed to "${statusLabel(status, SALES_LEAD_STATUS_LABEL)}".`)
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this sales lead?')) return
    await fetch(`/api/sales-leads/${id}`, { method: 'DELETE' })
    toast.success('Deleted successfully.')
    router.push('/dashboard/sales-leads')
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>
  if (!lead) return null

  const display = editing && form ? form : toForm(lead)

  // Currently linked account info (view mode)
  const linkedAccount = editing
    ? accounts.find(a => a.id === form?.account_id) ?? null
    : lead.account

  // Legacy text data (no FK)
  const hasLegacyCompany = !lead.account_id && (lead.construction_company || lead.facility_company)

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { sessionStorage.setItem('sl_from_back', '1'); router.push('/dashboard/sales-leads') }}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            ← List
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {lead.project_name || '(No project name)'}
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
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleEditCancel}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEditStart}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 border border-red-200 text-red-600 text-sm rounded-md hover:bg-red-50 cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status change */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-sm text-gray-500 font-medium">Status</span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[lead.status] ?? STATUS_STYLES['등록']}`}>
          {statusLabel(lead.status, SALES_LEAD_STATUS_LABEL)}
        </span>
        <span className="text-gray-300">→</span>
        <select
          value={lead.status}
          onChange={e => handleStatusChange(e.target.value as Status)}
          disabled={statusSaving}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{statusLabel(s, SALES_LEAD_STATUS_LABEL)}</option>
          ))}
        </select>
        {statusSaving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>

      {/* Basic info */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Info</span>
        </div>
        <div className="divide-y divide-gray-100">
          <Row label="Dealership">
            {editing
              ? <Input value={form!.dealership} onChange={v => setField('dealership', v)} />
              : display.dealership || '—'}
          </Row>
          <Row label="Project Name">
            {editing
              ? <Input value={form!.project_name} onChange={v => setField('project_name', v)} />
              : display.project_name || '—'}
          </Row>
          <Row label="Address">
            {editing
              ? <Input value={form!.address} onChange={v => setField('address', v)} />
              : display.address || '—'}
          </Row>
          <Row label="Scale">
            {editing
              ? <Input value={form!.scale} onChange={v => setField('scale', v)} />
              : display.scale || '—'}
          </Row>
          <Row label="Last Updated">
            {lead?.last_update ? new Date(lead.last_update).toLocaleString('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
          </Row>
        </div>
      </div>

      {/* Company info */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</span>
          {!editing && linkedAccount && (
            <button
              onClick={() => router.push(`/dashboard/sales-accounts/${linkedAccount.id}`)}
              className="text-xs text-green-600 hover:underline cursor-pointer"
            >
              Account Details →
            </button>
          )}
        </div>
        <div className="p-4">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Select Company</label>
                <select
                  value={form!.account_id}
                  onChange={e => setField('account_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                >
                  <option value="">— None —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {accounts.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    No accounts registered.{' '}
                    <button onClick={() => router.push('/dashboard/sales-accounts/new')} className="text-green-600 hover:underline cursor-pointer">
                      Add an account →
                    </button>
                  </p>
                )}
              </div>
              {/* Selected account preview */}
              {linkedAccount && (
                <div className="bg-green-100 border border-green-200 rounded-md px-3 py-2.5 text-sm space-y-1">
                  <p className="font-medium text-green-800">{linkedAccount.name}</p>
                  {linkedAccount.contact_name && <p className="text-green-700 text-xs">Contact: {linkedAccount.contact_name}</p>}
                  {linkedAccount.contact_phone && <p className="text-green-700 text-xs">Phone: {linkedAccount.contact_phone}</p>}
                </div>
              )}
            </div>
          ) : linkedAccount ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-gray-900">{linkedAccount.name}</p>
              {linkedAccount.contact_name && (
                <p className="text-sm text-gray-600">Contact: {linkedAccount.contact_name}</p>
              )}
              {linkedAccount.contact_phone && (
                <p className="text-sm text-gray-600">Phone: {linkedAccount.contact_phone}</p>
              )}
            </div>
          ) : hasLegacyCompany ? (
            // Legacy text data display
            <div className="space-y-1.5">
              {lead.construction_company && <p className="text-sm text-gray-700">Contractor: {lead.construction_company}</p>}
              {lead.facility_company && <p className="text-sm text-gray-700">Facility Company: {lead.facility_company}</p>}
              {lead.contact_name && <p className="text-sm text-gray-600">Contact: {lead.contact_name}</p>}
              {lead.contact_phone && <p className="text-sm text-gray-600">Phone: {lead.contact_phone}</p>}
              <p className="text-xs text-gray-400 mt-2">Edit and link an account for more effective management.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No linked company.</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</span>
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

      {/* Source URL */}
      {(display.source_url || editing) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Link</span>
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

      {/* Status change history */}
      {lead.status_history.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status Change History</span>
          </div>
          <div className="divide-y divide-gray-100">
            {[...lead.status_history].reverse().map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-xs text-gray-400 w-36 flex-shrink-0">
                  {new Date(entry.changed_at).toLocaleString('en-US', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                {entry.from_status && (
                  <>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[entry.from_status as Status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel(entry.from_status, SALES_LEAD_STATUS_LABEL)}
                    </span>
                    <span className="text-gray-400 text-xs">→</span>
                  </>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[entry.to_status as Status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel(entry.to_status, SALES_LEAD_STATUS_LABEL)}
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
