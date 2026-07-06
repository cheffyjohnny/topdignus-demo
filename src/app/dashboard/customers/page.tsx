'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Customer {
  id: string
  name: string
  sale_pct: number
  email: string | null
}

export default function CustomersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', sale_pct: 55, email: '' })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') router.replace('/dashboard')
  }, [status, session, router])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/customers')
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch { setCustomers([]) }
    setLoading(false)
  }

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', sale_pct: 55, email: '' })
    setShowForm(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, sale_pct: c.sale_pct, email: c.email ?? '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing?.id, ...form }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setShowForm(false)
      setMessage({ type: 'success', text: editing ? '수정 완료' : '추가 완료' })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? '오류 발생' })
    }
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setMessage({ type: 'success', text: '삭제 완료' })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? '삭제 오류' })
    }
  }

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">거래처 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">거래처별 판매가 비율을 관리합니다. 판매가 = 협가 × 비율%</p>
        </div>
        <div className="flex items-center gap-2">
          {message && (
            <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </span>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#014A99' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            거래처 추가
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {customers.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            등록된 거래처가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <th className="px-4 py-3 text-left font-medium">업체명</th>
                <th className="px-4 py-3 text-right font-medium w-32">판매가 비율</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">이메일</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                      협가 × {c.sale_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{c.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        title="수정"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {editing ? '거래처 수정' : '거래처 추가'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">업체명 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="예) 피앤지"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">판매가 비율 (%) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.sale_pct}
                    onChange={e => setForm(p => ({ ...p, sale_pct: Number(e.target.value) }))}
                    placeholder="55"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99] pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-400">판매가 = 협가(단가×200%) × {form.sale_pct}%</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">이메일</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="example@company.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#014A99]"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40"
                style={{ backgroundColor: '#014A99' }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
