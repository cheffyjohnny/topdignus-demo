'use client'

import { useState, useEffect } from 'react'
import { NAV_SECTIONS, type SectionKey } from './nav-config'
import { SidebarLink } from './CollapsibleSidebar'

const SESSIONS_KEY = 'sidebar_sections'
type OpenState = Record<SectionKey, boolean>
const DEFAULT_OPEN: OpenState = { quote: false, order: false, sales: false, report: false, law: false, admin: false }

function loadOpen(): OpenState {
  try {
    const s = sessionStorage.getItem(SESSIONS_KEY)
    return s ? { ...DEFAULT_OPEN, ...JSON.parse(s) } : DEFAULT_OPEN
  } catch { return DEFAULT_OPEN }
}
function saveOpen(s: OpenState) {
  try { sessionStorage.setItem(SESSIONS_KEY, JSON.stringify(s)) } catch {}
}

type Props = { role: string | undefined; collapsed: boolean }

export function SidebarNav({ role, collapsed }: Props) {
  const [open, setOpen] = useState<OpenState>(DEFAULT_OPEN)

  useEffect(() => { setOpen(loadOpen()) }, [])

  function toggleSection(key: SectionKey) {
    setOpen(prev => {
      const next = { ...prev, [key]: !prev[key] }
      saveOpen(next)
      return next
    })
  }

  const isSubscriber = role === 'subscriber'

  // ── 접힌 상태: 아이콘만 ──────────────────────────────────────────
  if (collapsed) {
    return (
      <>
        {NAV_SECTIONS.map(section => {
          if (isSubscriber && section.key !== 'law') return null
          return section.items
            .filter(item => !(item.subscriberHide && isSubscriber))
            .map(item => (
              <SidebarLink key={item.href} href={item.href} label={item.label} collapsed icon={item.icon} />
            ))
        })}
      </>
    )
  }

  // ── 펼친 상태: 섹션 헤더 + 아이템 ──────────────────────────────
  return (
    <>
      {NAV_SECTIONS.map(section => {
        if (isSubscriber && section.key !== 'law') return null
        const isOpen = open[section.key]
        return (
          <div key={section.key}>
            <div className="mt-2 mb-1 border-t border-white/10" />
            <button
              onClick={() => toggleSection(section.key)}
              className="flex items-center justify-between w-full px-3 mb-0.5 cursor-pointer group"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-yellow-300/90 group-hover:text-yellow-200 transition-colors">
                {section.label}
              </span>
              <svg
                className={`w-3 h-3 text-yellow-300/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && section.items
              .filter(item => !(item.subscriberHide && isSubscriber))
              .map(item => (
                <SidebarLink key={item.href} href={item.href} label={item.label} collapsed={false} icon={item.icon} />
              ))
            }
          </div>
        )
      })}
    </>
  )
}
