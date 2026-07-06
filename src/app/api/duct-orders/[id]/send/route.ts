import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ error: '데모 버전에서는 이메일 전송이 지원되지 않습니다.' }, { status: 403 })
}
