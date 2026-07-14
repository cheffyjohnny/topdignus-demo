'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

interface FormData {
  name: string
  contact_name: string
  contact_phone: string
  email: string
  notes: string
}

const EMPTY: FormData = { name: '', contact_name: '', contact_phone: '', email: '', notes: '' }

export default function SalesAccountsNewPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [saving, setSaving] = useState(false)

  function setField(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Please enter a company name.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/sales-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Save failed'); return }
      toast.success('Account added.')
      router.push(`/dashboard/sales-accounts/${d.id}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">New Sales Account</h1>
        <button
          onClick={() => router.push('/dashboard/sales-accounts')}
          className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          ← Back to list
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Company Name <span className="text-red-500">*</span></label>
          <input
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="e.g. Acme Construction"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contact</label>
            <input
              value={form.contact_name}
              onChange={e => setField('contact_name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input
              value={form.contact_phone}
              onChange={e => setField('contact_phone', e.target.value)}
              placeholder="010-0000-0000"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => router.push('/dashboard/sales-accounts')}
          className="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
