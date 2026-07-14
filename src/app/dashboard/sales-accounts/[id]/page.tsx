'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { statusLabel, SALES_LEAD_STATUS_LABEL } from '@/lib/status-labels'

interface SalesAccount {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface LinkedLead {
  id: string
  project_name: string | null
  address: string | null
  status: string
  created_at: string
}

interface FormData {
  name: string
  contact_name: string
  contact_phone: string
  email: string
  notes: string
}

function toForm(a: SalesAccount): FormData {
  return {
    name: a.name ?? '',
    contact_name: a.contact_name ?? '',
    contact_phone: a.contact_phone ?? '',
    email: a.email ?? '',
    notes: a.notes ?? '',
  }
}

export default function SalesAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [account, setAccount] = useState<SalesAccount | null>(null)
  const [linkedLeads, setLinkedLeads] = useState<LinkedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormData | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales-accounts/${id}`).then(r => r.json()),
      fetch(`/api/sales-leads?account_id=${id}`).then(r => r.json()),
    ]).then(([accountData, leadsData]) => {
      if (accountData.error) { toast.error('Not found.'); router.push('/dashboard/sales-accounts'); return }
      setAccount(accountData)
      setLinkedLeads(Array.isArray(leadsData) ? leadsData.filter((l: LinkedLead & { account_id?: string }) => l.account_id === id) : [])
    }).finally(() => setLoading(false))
  }, [id])

  function setField(key: keyof FormData, value: string) {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function handleEditStart() {
    if (!account) return
    setForm(toForm(account))
    setEditing(true)
  }

  function handleEditCancel() {
    setEditing(false)
    setForm(null)
  }

  async function handleSave() {
    if (!form) return
    if (!form.name.trim()) { toast.error('Please enter a company name.'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/sales-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Save failed'); return }
      setAccount(data)
      setEditing(false)
      setForm(null)
      toast.success('Saved successfully.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!account) return
    if (!confirm(`Delete account "${account.name}"?\nLinked sales leads will also have their contractor info unlinked.`)) return
    await fetch(`/api/sales-accounts/${id}`, { method: 'DELETE' })
    toast.success('Deleted successfully.')
    router.push('/dashboard/sales-accounts')
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>
  if (!account) return null

  const display = editing && form ? form : toForm(account)

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/sales-accounts')}
            className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            ← List
          </button>
          <h1 className="text-xl font-bold text-gray-900">{account.name}</h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 cursor-pointer"
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

      {/* Account info */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Info</span>
        </div>
        <div className="divide-y divide-gray-100">
          <Row label="Company">
            {editing
              ? <Input value={form!.name} onChange={v => setField('name', v)} />
              : <span className="font-medium">{display.name}</span>}
          </Row>
          <Row label="Contact">
            {editing
              ? <Input value={form!.contact_name} onChange={v => setField('contact_name', v)} />
              : display.contact_name || '—'}
          </Row>
          <Row label="Phone">
            {editing
              ? <Input value={form!.contact_phone} onChange={v => setField('contact_phone', v)} placeholder="010-0000-0000" />
              : display.contact_phone || '—'}
          </Row>
          <Row label="Email">
            {editing
              ? <Input value={form!.email} onChange={v => setField('email', v)} />
              : display.email
                ? <a href={`mailto:${display.email}`} className="text-blue-600 hover:underline">{display.email}</a>
                : '—'}
          </Row>
          <Row label="Registered">
            {new Date(account.created_at).toLocaleDateString('en-US')}
          </Row>
        </div>
      </div>

      {/* Notes */}
      {(display.notes || editing) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</span>
          </div>
          <div className="p-4">
            {editing ? (
              <textarea
                value={form!.notes}
                onChange={e => setField('notes', e.target.value)}
                rows={5}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{display.notes || '—'}</p>
            )}
          </div>
        </div>
      )}

      {/* Linked sales leads */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Sales Leads</span>
          <span className="text-xs text-gray-400">{linkedLeads.length}</span>
        </div>
        {linkedLeads.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No linked leads.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {linkedLeads.map(lead => (
              <button
                key={lead.id}
                onClick={() => router.push(`/dashboard/sales-leads/${lead.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer text-left transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{lead.project_name || '(No project name)'}</p>
                  {lead.address && <p className="text-xs text-gray-500 mt-0.5">{lead.address}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  lead.status === '진행중' ? 'bg-blue-100 text-blue-700' :
                  lead.status === '착공전' ? 'bg-purple-100 text-purple-700' :
                  lead.status === '이관' ? 'bg-amber-100 text-amber-700' :
                  lead.status === '체결' ? 'bg-green-100 text-green-700' :
                  lead.status === '종료' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {statusLabel(lead.status, SALES_LEAD_STATUS_LABEL)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex px-4 py-2.5 text-sm">
      <span className="w-28 flex-shrink-0 text-gray-500 font-medium">{label}</span>
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
      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
    />
  )
}
