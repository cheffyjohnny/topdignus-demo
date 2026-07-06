'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CollapsibleSidebar } from './CollapsibleSidebar'
import { TopNavbar } from './TopNavbar'
import { MobileSidebar } from './MobileSidebar'
import { LogoutButton } from './LogoutButton'

type NavMode = 'sidebar' | 'navbar'
const NAV_MODE_KEY = 'nav_mode'

interface Props {
  role: string | undefined
  userName: string
  userEmail: string
  greeting: string
  year: number
  children: React.ReactNode
}

export function DashboardShell({ role, userName, userEmail, greeting, year, children }: Props) {
  const [navMode, setNavMode] = useState<NavMode>('sidebar')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem(NAV_MODE_KEY) as NavMode | null
      if (s === 'navbar' || s === 'sidebar') setNavMode(s)
    } catch {}
    setMounted(true)
  }, [])

  function toggleMode() {
    setNavMode(prev => {
      const next: NavMode = prev === 'sidebar' ? 'navbar' : 'sidebar'
      try { localStorage.setItem(NAV_MODE_KEY, next) } catch {}
      return next
    })
  }

  if (!mounted) {
    return (
      <div className="flex h-screen bg-gray-50">
        <aside className="hidden md:flex w-60 flex-col flex-shrink-0" style={{ backgroundColor: '#014A99' }} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-gray-200 flex-shrink-0" />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    )
  }

  // ── Navbar 모드 ────────────────────────────────────────────────
  if (navMode === 'navbar') {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <TopNavbar
          role={role}
          userName={userName}
          userEmail={userEmail}
          greeting={greeting}
          year={year}
          onToggleMode={toggleMode}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    )
  }

  // ── Sidebar 모드 ───────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      <CollapsibleSidebar role={role} year={year} onToggleMode={toggleMode} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <MobileSidebar role={role} />
            <span className="text-sm font-semibold text-gray-700">Topdignus 관리자</span>
            <span className="hidden md:inline text-gray-300 text-sm">|</span>
            <span className="hidden md:inline text-sm text-gray-400">{greeting}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden md:inline text-sm text-gray-600">
              <span className="font-medium">{userName}</span> 님
              <span className="text-gray-400 ml-1">({userEmail})</span>
            </span>
            <span className="md:hidden text-sm font-medium text-gray-700">{userName}</span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
