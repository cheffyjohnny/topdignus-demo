'use client'

import Link from 'next/link'
import Image from 'next/image'
import { NAV_SECTIONS } from './nav-config'
import { LogoutButton } from './LogoutButton'
import { MobileSidebar } from './MobileSidebar'

interface Props {
  role: string | undefined
  userName: string
  userEmail: string
  greeting: string
  year: number
  onToggleMode: () => void
}

export function TopNavbar({ role, userName, userEmail, greeting, onToggleMode }: Props) {
  const isSubscriber = role === 'subscriber'

  return (
    <header className="w-full h-16 bg-[#014A99] text-white flex items-center px-4 gap-2 flex-shrink-0 z-40 relative">
      {/* 모바일 햄버거 */}
      <div className="md:hidden">
        <MobileSidebar role={role} />
      </div>

      {/* 로고 */}
      <Link href="/" className="flex items-center mr-2 flex-shrink-0">
        <Image src="/logo-bg-white.png" alt="Topdignus" width={50} height={18} className="object-contain" style={{ borderRadius: '3px' }} />
      </Link>

      {/* 홈 */}
      {!isSubscriber && (
        <Link href="/dashboard"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </Link>
      )}

      {/* 섹션 드롭다운 */}
      <nav className="hidden md:flex items-center gap-0.5">
        {NAV_SECTIONS.map(section => {
          if (isSubscriber && section.key !== 'law') return null
          const visibleItems = section.items.filter(item => !(item.subscriberHide && isSubscriber))
          return (
            <div key={section.key} className="relative group">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                {section.label}
                <svg className="w-3 h-3 mt-0.5 transition-transform group-hover:rotate-180 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* 드롭다운 */}
              <div className="absolute left-0 top-full pt-1.5 hidden group-hover:block z-50 min-w-[180px]">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 overflow-hidden">
                  {visibleItems.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#014A99] transition-colors"
                    >
                      <span className="text-gray-400">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* 인사말 */}
      <span className="hidden lg:inline text-sm text-white/50 ml-8 flex-shrink-0">{greeting}</span>

      {/* spacer */}
      <div className="flex-1" />

      {/* 우측 영역 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="hidden md:inline text-sm text-white/80">
          <span className="font-medium">{userName}</span>
          <span className="text-white/50 ml-1 text-xs">({userEmail})</span>
        </span>
        <span className="md:hidden text-sm font-medium">{userName}</span>
        <LogoutButton variant="light" />

        {/* 레이아웃 전환 버튼 */}
        <button
          onClick={onToggleMode}
          title="Switch to side menu"
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      </div>
    </header>
  )
}
