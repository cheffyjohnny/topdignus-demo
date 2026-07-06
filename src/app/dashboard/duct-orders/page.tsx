'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DuctOrdersRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/orders') }, [router])
  return null
}
