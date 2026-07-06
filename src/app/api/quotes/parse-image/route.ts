import { NextRequest, NextResponse } from 'next/server'
import { ocrImageWithDrive, preprocessImage } from '@/lib/google-drive'
import { parseOrder } from '@/lib/parse-order'
import { enrichOrderItem, loadPipeSleeveStructure } from '@/lib/order-enrichment'
import { supabaseServer } from '@/lib/supabase-server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const vendor = (formData.get('vendor') as string | null) ?? ''

  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 })
  }

  const raw = Buffer.from(await file.arrayBuffer())
  const { buffer, mimeType } = await preprocessImage(raw, file.type)

  // Supabase Storage에 원본 이미지 업로드 (실패해도 OCR은 계속)
  let imageUrl: string | null = null
  try {
    const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await supabaseServer.storage
      .from('order-images')
      .upload(storagePath, raw, { contentType: file.type, upsert: false })
    if (!uploadError) {
      const { data: urlData } = supabaseServer.storage
        .from('order-images')
        .getPublicUrl(storagePath)
      imageUrl = urlData?.publicUrl ?? null
    }
  } catch {
    // 이미지 저장 실패는 무시
  }

  try {
    const text = await ocrImageWithDrive(buffer, mimeType)
    const parsed = parseOrder(text)
    const ps = await loadPipeSleeveStructure()
    parsed.items = parsed.items.map(item => enrichOrderItem(item, ps))

    return NextResponse.json({ text, fileName: file.name, parsed, imageUrl })
  } catch (e) {
    console.error('[parse-image]', e)
    return NextResponse.json({ error: 'OCR 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
