'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (status === 'loading') return null
  if (!session || (session.user as any).role !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    if (newPassword !== confirmPassword) {
      setResult({ ok: false, message: 'New passwords do not match.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error })
      } else {
        setResult({ ok: true, message: 'Password changed successfully.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setResult({ ok: false, message: 'An error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account settings.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">New Password <span className="text-gray-400">(6+ characters)</span></label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#014A99]"
            />
          </div>

          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-colors"
            style={{ backgroundColor: '#014A99' }}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
