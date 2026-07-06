'use client'

import { useState, useEffect, useRef } from 'react'

interface Memo {
  id: string
  content: string
  author: string | null
  created_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function MemoCard({
  memo,
  onDelete,
  onUpdate,
}: {
  memo: Memo
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, content: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(memo.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  async function save() {
    if (!draft.trim() || saving) return
    setSaving(true)
    await onUpdate(memo.id, draft)
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setDraft(memo.content)
    setEditing(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(memo.id)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 group hover:border-gray-300 transition-colors">
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
              if (e.key === 'Escape') cancel()
            }}
            rows={Math.max(3, draft.split('\n').length + 1)}
            className="w-full text-sm text-gray-800 border border-[#014A99] rounded-lg px-3 py-2.5 resize-y focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={cancel} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
              취소
            </button>
            <button
              onClick={save}
              disabled={!draft.trim() || saving}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: '#014A99' }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
              {memo.content}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {memo.author && (
                <span className="text-xs text-gray-400">{memo.author}</span>
              )}
              {memo.author && <span className="text-xs text-gray-200">·</span>}
              <span className="text-xs text-gray-400">{formatDate(memo.created_at)}</span>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            <button
              onClick={() => setEditing(true)}
              className="text-gray-300 hover:text-blue-400 cursor-pointer"
              title="편집"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-300 hover:text-red-400 cursor-pointer disabled:opacity-30"
              title="삭제"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrderMemosPage() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/order-memos')
      .then(r => r.json())
      .then(data => { setMemos(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function submit() {
    const trimmed = input.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    const res = await fetch('/api/order-memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed }),
    })
    if (res.ok) {
      const memo = await res.json()
      setMemos(prev => [memo, ...prev])
      setInput('')
      textareaRef.current?.focus()
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/order-memos?id=${id}`, { method: 'DELETE' })
    if (res.ok) setMemos(prev => prev.filter(m => m.id !== id))
  }

  async function handleUpdate(id: string, content: string) {
    const res = await fetch('/api/order-memos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMemos(prev => prev.map(m => m.id === id ? updated : m))
    }
  }

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">수발거인 메모</h1>

      {/* 입력 영역 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
          placeholder="메모를 입력하세요. (Ctrl+Enter로 저장)"
          rows={4}
          className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:border-[#014A99] placeholder:text-gray-300"
        />
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!input.trim() || submitting}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{ backgroundColor: '#014A99' }}
          >
            {submitting ? '저장 중...' : '메모 추가'}
          </button>
        </div>
      </div>

      {/* 메모 리스트 */}
      {loading ? (
        <div className="text-center text-sm text-gray-400 py-12">불러오는 중...</div>
      ) : memos.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-12">
          아직 메모가 없습니다.<br />위에서 첫 번째 메모를 추가해보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {memos.map(memo => (
            <MemoCard
              key={memo.id}
              memo={memo}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
