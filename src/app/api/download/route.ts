import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url  = req.nextUrl.searchParams.get('url')
  const name = req.nextUrl.searchParams.get('name') ?? 'file'

  if (!url) return NextResponse.json({ error: 'url 파라미터 필요' }, { status: 400 })

  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ error: '파일을 가져올 수 없습니다.' }, { status: 502 })

  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  })
}
