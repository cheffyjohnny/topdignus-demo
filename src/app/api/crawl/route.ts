import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: '데모 버전에서는 크롤러가 비활성화되어 있습니다.' }, { status: 403 })
}

export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: '데모 버전에서는 크롤러가 비활성화되어 있습니다.' }, { status: 403 })
}
