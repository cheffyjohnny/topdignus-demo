import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'

// Windows 기본 LibreOffice 경로
const SOFFICE_PATH = process.env.LIBREOFFICE_PATH
  ?? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'

export async function excelToPdf(xlsxBuffer: Buffer): Promise<Buffer> {
  const tmpDir = os.tmpdir()
  const uid = randomUUID()
  const inFile = path.join(tmpDir, `order_${uid}.xlsx`)
  const outFile = path.join(tmpDir, `order_${uid}.pdf`)

  try {
    fs.writeFileSync(inFile, xlsxBuffer)

    execSync(
      `"${SOFFICE_PATH}" --headless --convert-to pdf --outdir "${tmpDir}" "${inFile}"`,
      { timeout: 30000 }
    )

    if (!fs.existsSync(outFile)) {
      throw new Error('LibreOffice PDF 변환 실패: 출력 파일이 생성되지 않았습니다.')
    }

    return fs.readFileSync(outFile)
  } finally {
    if (fs.existsSync(inFile)) fs.unlinkSync(inFile)
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile)
  }
}
