export const INPUT_CLS = 'w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:border-[#014A99]'

export function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-1.5">
      <p className="text-xs font-semibold text-gray-500 mb-2">{title}</p>
      {children}
    </div>
  )
}

export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-800 whitespace-pre-wrap">{value}</span>
    </div>
  )
}

export function EditCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#014A99]/30 rounded-xl p-4 space-y-2 bg-blue-50/20">
      <p className="text-xs font-semibold text-gray-500 mb-2">{title}</p>
      {children}
    </div>
  )
}

export function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 w-24 shrink-0 text-xs pt-2">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
