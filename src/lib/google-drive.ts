import { google } from 'googleapis'
import { Readable } from 'stream'
import sharp from 'sharp'

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return oauth2Client
}

// XLSX 버퍼를 Google Drive에 Google Sheets로 업로드 후 PDF로 내보내기.
export async function excelSheetToPdf(buffer: Buffer): Promise<Buffer> {
  const auth = getOAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  const uploaded = await drive.files.create({
    requestBody: {
      name: `pdf_temp_${Date.now()}`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Readable.from(buffer),
    },
    fields: 'id',
  })
  const fileId = uploaded.data.id!
  console.log('[pdf] Google Drive 업로드 완료 id:', fileId)

  try {
    const exported = await drive.files.export(
      { fileId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' }
    )
    return Buffer.from(exported.data as ArrayBuffer)
  } finally {
    await drive.files.delete({ fileId }).catch(() => {})
  }
}

export async function preprocessImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (mimeType === 'application/pdf') return { buffer, mimeType }
  const processed = await sharp(buffer)
    .grayscale()
    .sharpen({ sigma: 1.5 })
    .normalize()
    .resize({ width: 2400, withoutEnlargement: true })
    .png()
    .toBuffer()
  return { buffer: processed, mimeType: 'image/png' }
}

export async function ocrImageWithDrive(buffer: Buffer, mimeType: string): Promise<string> {
  const auth = getOAuthClient()
  const drive = google.drive({ version: 'v3', auth })

  const uploaded = await drive.files.create({
    requestBody: {
      name: `ocr_temp_${Date.now()}`,
      mimeType: 'application/vnd.google-apps.document',
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id',
  })

  const fileId = uploaded.data.id!

  try {
    const exported = await drive.files.export({
      fileId,
      mimeType: 'text/plain',
    })
    return (exported.data as string).trim()
  } finally {
    await drive.files.delete({ fileId }).catch(() => {})
  }
}
