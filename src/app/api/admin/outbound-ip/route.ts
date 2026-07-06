import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json({ ip: data.ip })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
