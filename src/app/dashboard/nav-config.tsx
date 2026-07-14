import React from 'react'

export type SectionKey = 'quote' | 'order' | 'sales' | 'report' | 'law' | 'admin'

export interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  subscriberHide?: boolean
}

export interface NavSection {
  key: SectionKey
  label: string
  items: NavItem[]
}

const WrenchIcon  = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
const PenIcon     = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
const PlusIcon    = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
const ClipIcon    = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
const DocIcon     = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
const MoneyIcon   = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
const ChartIcon   = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
const UsersIcon   = () => <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'quote',
    label: 'Quotes',
    items: [
      { href: '/dashboard/quotes/new',             label: 'New Quote',   icon: <PlusIcon /> },
      { href: '/dashboard/quotes',                 label: 'Quote List',   icon: <ClipIcon /> },
    ],
  },
  {
    key: 'order',
    label: process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? 'Orders' : 'Order Processing',
    items: [
      { href: '/dashboard/orders/new',    label: 'New Order', icon: <PlusIcon /> },
      { href: '/dashboard/orders',        label: 'Order List',    icon: <ClipIcon /> },
      { href: '/dashboard/pipe-prices',   label: 'Pipe Pricing',   icon: <MoneyIcon /> },
      { href: '/dashboard/duct-prices',   label: 'Duct Pricing',   icon: <MoneyIcon /> },
      { href: '/dashboard/fire-blanket-prices', label: 'Fire Blanket Pricing', icon: <MoneyIcon /> },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    items: [
      { href: '/dashboard/sales-leads/new', label: 'New Lead',      icon: <PlusIcon /> },
      { href: '/dashboard/sales-leads',     label: 'Sales Leads',      icon: <ClipIcon /> },
      { href: '/dashboard/sales-accounts',  label: 'Sales Accounts',    icon: <UsersIcon /> },
    ],
  },
  {
    key: 'report',
    label: 'Reports',
    items: [
      { href: '/dashboard/weekly',  label: 'Weekly Report', icon: <ChartIcon /> },
      { href: '/dashboard/monthly', label: 'Monthly Report', icon: <ChartIcon /> },
      { href: '/dashboard/yearly',  label: 'Yearly Report', icon: <ChartIcon /> },
    ],
  },
  {
    key: 'law',
    label: 'Regulations',
    items: [
      { href: '/dashboard/crawler',     label: 'Crawled Data',  icon: <ChartIcon /> },
      { href: '/dashboard/subscribers', label: 'Subscribers',  icon: <UsersIcon />, subscriberHide: true },
    ],
  },
  {
    key: 'admin' as SectionKey,
    label: 'Admin',
    items: [
      { href: '/dashboard/admin', label: 'Admin Tools', icon: <WrenchIcon />, subscriberHide: true },
    ],
  },
]
