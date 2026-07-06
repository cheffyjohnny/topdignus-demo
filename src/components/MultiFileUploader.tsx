'use client'

import { useRef } from 'react'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  label?: string
}

function isImage(file: File) {
  return file.type.startsWith('image/')
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MultiFileUploader({ files, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrls = useRef<Map<File, string>>(new Map())

  function getPreview(file: File): string {
    if (!isImage(file)) return ''
    if (!previewUrls.current.has(file)) {
      previewUrls.current.set(file, URL.createObjectURL(file))
    }
    return previewUrls.current.get(file)!
  }

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const arr = Array.from(incoming)
    onChange([...files, ...arr])
  }

  function remove(idx: number) {
    const removed = files[idx]
    const url = previewUrls.current.get(removed)
    if (url) { URL.revokeObjectURL(url); previewUrls.current.delete(removed) }
    onChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.xlsx,.xls,.csv"
        className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#014A99] hover:bg-blue-50/30 transition-colors"
      >
        <div className="space-y-1.5 text-gray-400">
          <svg className="w-7 h-7 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <p className="text-sm">{label ?? '파일 드래그 또는 클릭하여 추가'}</p>
          <p className="text-xs">이미지 · PDF · 엑셀 지원 · 여러 파일 선택 가능</p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
              {isImage(file) ? (
                <img
                  src={getPreview(file)}
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover shrink-0 border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); remove(idx) }}
                className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
