import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
]

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 })
  }

  const raw = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() ?? ''
  const storagePath = `${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseServer.storage
    .from('order-images')
    .upload(storagePath, raw, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: '이미지 업로드 실패: ' + uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseServer.storage
    .from('order-images')
    .getPublicUrl(storagePath)

  const publicUrl = urlData?.publicUrl ?? null
  const imageUrl = publicUrl ? `${publicUrl}#name=${encodeURIComponent(file.name)}` : null
  return NextResponse.json({ imageUrl })
}
