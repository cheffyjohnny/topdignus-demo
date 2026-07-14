'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SidebarNav } from './SidebarNav'

interface Props {
  role: string | undefined
  year: number
  onToggleMode: () => void
}

export function CollapsibleSidebar({ role, year, onToggleMode }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('sidebar_collapsed')
      if (s !== null) setCollapsed(JSON.parse(s))
    } catch {}
    setMounted(true)
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar_collapsed', JSON.stringify(next)) } catch {}
      return next
    })
  }

  if (!mounted) {
    return <aside className="hidden md:flex w-60 flex-col flex-shrink-0 text-white" style={{ backgroundColor: '#014A99' }} />
  }

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 text-white transition-all duration-200 ease-in-out overflow-hidden ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ backgroundColor: '#014A99' }}
    >
      {/* 헤더 */}
      <div className={`flex items-center h-16 border-b border-white/10 px-3 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link href="/" className="flex-1 flex items-center">
            <Image src="/logo-bg-white.png" alt="Topdignus" width={55} height={20} className="object-contain" style={{ borderRadius: '4px' }} />
          </Link>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer p-1.5 rounded flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            }
          </svg>
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-0.5">
        {role !== 'subscriber' && (
          <>
            <SidebarLink href="/dashboard" collapsed={collapsed} label="Home"
              icon={
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              }
            />
            <SidebarLink href="/dashboard/order-memos" collapsed={collapsed} label="Shared Notes"
              icon={
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              }
            />
          </>
        )}
        <SidebarNav role={role} collapsed={collapsed} />
      </nav>

      {/* 설정 */}
      {role === 'admin' && (
        <div className="px-2 pb-2 flex-shrink-0">
          <SidebarLink href="/dashboard/settings" collapsed={collapsed} label="Settings"
            icon={
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* 상단 메뉴로 전환 */}
      <div className={`px-2 pb-1 flex-shrink-0 border-t border-white/10 pt-2 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={onToggleMode}
          title="Switch to top menu"
          className={`text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors cursor-pointer rounded p-1.5 ${collapsed ? '' : 'w-full flex items-center gap-2 px-3 text-xs'}`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {!collapsed && 'Switch to top menu'}
        </button>
      </div>

      {/* 푸터 */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10 text-xs text-white/40 text-center flex-shrink-0">
          © {year} Topdignus
        </div>
      )}
    </aside>
  )
}

export function SidebarLink({ href, icon, label, collapsed }: {
  href: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-md text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors ${
        collapsed ? 'justify-center px-1 py-3' : 'gap-3 px-3 py-2.5'
      }`}
    >
      {icon}
      {!collapsed && label}
    </Link>
  )
}
