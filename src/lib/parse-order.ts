export interface OrderHeader {
  serialNo?: string
  recipient?: string
  businessNo?: string
  companyName?: string
  representative?: string
  address?: string
  contact?: string
  deliveryDate?: string
  project?: string
  deliveryAddress?: string
}

export interface OrderItem {
  no: number
  name: string        // OCR 원문 또는 입력명
  // Part A — 내부 단가산출용 (Sheet 2 입력)
  internalName?: string  // e.g., 입상_강관_충진재
  pipeSpec?: string      // e.g., "20" (관경, A 없이 숫자만)
  sleeveSpec?: string    // e.g., "75" (슬리브, A 없이 숫자만)
  // Part B — 외부 표시용 (Sheet 5 입력)
  displayName?: string   // e.g., 내화채움재(강관)입상
  spec: string           // e.g., "20*75" (원본 규격 문자열)
  unit: string           // e.g., 개소 | 롤
  quantity: number
  unitPrice?: number
  note?: string
  uncertain?: boolean
  manufacturer?: string   // 배관 품목별 제조사 (다중 제조사 지원용)
}

export interface ParsedOrder {
  header: OrderHeader
  items: OrderItem[]
}

// 단어 교정 목록 (OCR 오인식 → 올바른 값)
const WORD_CORRECTIONS: [RegExp, string][] = [
  [/(?<!일)체형/g, '일체형'],
  [/BU관/g, 'SU관'],
  [/내화채재/g, '내화채움재'],
  [/내화채육재/g, '내화채움재'],
  [/\(감관\)/g, '(강관)'],
  [/감관/g, '강관'],
  [/\(감\)/g, '(강관)'],
]

function applyWordCorrections(text: string): string {
  return WORD_CORRECTIONS.reduce((t, [p, r]) => t.replace(p, r), text)
}

// 수량 OCR 오인식 보정
function fixQuantity(raw: string): { value: number; uncertain: boolean } {
  let s = raw.trim().toUpperCase()
  let uncertain = false

  s = s
    .replace(/^B(\d)/g, '8$1')     // B5EA → 85EA
    .replace(/^SOEA$/, '50EA')
    .replace(/^BEA$/, '8EA')
    .replace(/^OEA$/, '0EA')
    .replace(/[IL]/g, '1')

  if (/S/.test(s)) {
    uncertain = true
    s = s
      .replace(/^SEA$/, '9EA')
      .replace(/(\d)SEA$/, '$19EA') // 1SEA → 19EA
      .replace(/S/g, '9')
  }

  const numStr = s.replace(/[^0-9]/g, '')
  return { value: parseInt(numStr) || 0, uncertain }
}

function extractHeader(text: string): OrderHeader {
  const header: OrderHeader = {}
  const line = (p: RegExp) => text.match(p)?.[1]?.trim()

  // OCR이 "일련번호 수신 {수신값}\n{일련번호값}" 순서로 라벨과 값을 뒤섞어 내보내는 레이아웃 대응
  const serialRecipientCombo = text.match(/일련번호\s+수\s*신\s+([^\n]+)\n([^\n]+)/)
  if (serialRecipientCombo) {
    header.recipient = serialRecipientCombo[1].trim()
    header.serialNo = serialRecipientCombo[2].trim()
  } else {
    header.serialNo = line(/일련번호[^\n]*\n([^\n]+)/)
    header.recipient = line(/수\s*신[^\n]*\n([^\n]+)/) ?? line(/수신\s*[:：]?\s*([^\n]+)/)
  }

  header.businessNo = line(/사업자등록번호\s+([0-9\-]+)/)
  header.companyName = line(/회사명[\/\s]*대표\s+([^\/\n]+)/)
  header.representative = text.match(/회사명[\/\s]*대표\s+[^\/\n]+\/\s*([^\n]+)/)?.[1]?.trim()

  // OCR이 "주소 담당/연락처" 라벨만 한 줄에 묶고 값은 다음 두 줄에 순서대로 내보내는 레이아웃 대응
  const addressContactCombo = text.match(/주\s*소\s+담당[\/\s]*연락처\s*\n([^\n]+)\n([^\n]+)/)
  if (addressContactCombo) {
    header.address = addressContactCombo[1].trim()
    header.contact = addressContactCombo[2].trim()
  } else {
    header.address = line(/주\s*소\s+([^\n]+)/)
    header.contact = line(/담당[\/\s]*연락처\s+([^\n]+)/)
  }
  header.deliveryDate = line(/납기일자[^\n]*\n([^\n]+)/) ?? line(/납기일자\s*[:：]?\s*([^\n]+)/)
  header.project = line(/프로젝트\s*[:：]?\s*([^\n]+)/)
  header.deliveryAddress = line(/납품주소\s*[:：]?\s*([^\n]+)/)

  return header
}

// OCR이 테이블 중간에 끼워넣는 노이즈 줄 목록
const NOISE_LINES = new Set(['수량', '단가', '공급가액', '부가세', '적요', 'CV', ''])

// 순번 라인: 숫자만 or "5 내화..." (숫자+한글)
function matchItemNo(line: string): { no: number; rest: string } | null {
  const m = line.match(/^\|?(\d{1,2})(\s+[가-힣].*)?$/)
  if (!m) return null
  const no = parseInt(m[1])
  if (no < 1 || no > 50) return null
  return { no, rest: (m[2] ?? '').trim() }
}

// 수량 라인: 숫자+EA or OCR 오인식 패턴
function matchQty(line: string): string | null {
  if (/^\d{1,4}EA$/i.test(line)) return line
  if (/^[BSO]{1,2}\d*EA$/i.test(line)) return line  // BEA, SEA, SOEA, B5EA
  if (/^\d[SE]EA$/i.test(line)) return line          // 1SEA 등
  return null
}

// 테이블 종료 판별 (합계 행)
function isTableEnd(line: string): boolean {
  return /^(합계|수량\s+\d|480\s|0\s+합계)/.test(line)
}

function extractItems(text: string): OrderItem[] {
  const tableStart = text.search(/순번[\s\S]{0,80}품목명/)
  if (tableStart === -1) return []

  const tableText = text.slice(tableStart)

  // 노이즈 줄과 (W0원) 같은 금액 메타 정보 사전 제거
  const lines = tableText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !NOISE_LINES.has(l) && !/^\(W\d/.test(l) && !/^\/\s*VAT/.test(l))

  const items: OrderItem[] = []
  let i = 0

  // 첫 순번 줄까지 건너뛰기
  while (i < lines.length && !matchItemNo(lines[i])) i++

  while (i < lines.length) {
    if (isTableEnd(lines[i])) break

    const matched = matchItemNo(lines[i])
    if (!matched) { i++; continue }

    const { no, rest } = matched
    const nameParts: string[] = rest ? [rest] : []
    let quantityRaw = ''
    i++

    while (i < lines.length) {
      const next = lines[i]

      if (isTableEnd(next)) { i = lines.length; break }

      const qty = matchQty(next)
      if (qty) { quantityRaw = qty; i++; break }

      if (matchItemNo(next)) break

      nameParts.push(next)
      i++
    }

    const fullName = nameParts.join(' ').replace(/\s+/g, ' ').trim()
    if (!fullName || !quantityRaw) continue

    const specMatch = fullName.match(/\[([^\]]+)\]/)
    const spec = specMatch ? specMatch[1].replace(/-/g, '*') : ''
    const name = fullName.replace(/\[([^\]]+)\]/, '').replace(/\s+/g, ' ').trim()

    const { value: quantity, uncertain } = fixQuantity(quantityRaw)
    items.push({ no, name, spec, quantity, unit: 'EA', uncertain })
  }

  return items
}

// OCR로 추출한 납기일자 원문(e.g. "7/9", "2026.7.9", "2026-07-09")을
// <input type="date">에 쓸 수 있는 "yyyy-mm-dd"로 정규화.
// 연도가 없는 M/D 표기는 기준일(basisDate) 연도를 쓰고, 기준일보다 과거면 다음 해로 넘김.
export function normalizeDeliveryDate(raw: string | undefined, basisDate: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()

  const iso = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const md = trimmed.match(/^(\d{1,2})[./](\d{1,2})$/)
  if (md) {
    const basisMatch = (basisDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
    const now = new Date()
    const [basisY, basisM, basisD] = basisMatch
      ? basisMatch.slice(1).map(Number)
      : [now.getFullYear(), now.getMonth() + 1, now.getDate()]

    let year = basisY
    const month = parseInt(md[1])
    const day = parseInt(md[2])
    // 월/일만으로는 basis보다 과거가 되면 다음 해로 간주
    if (month < basisM || (month === basisM && day < basisD)) year += 1

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return ''
}

export function parseOrder(ocrText: string): ParsedOrder {
  const corrected = applyWordCorrections(ocrText)
  return {
    header: extractHeader(corrected),
    items: extractItems(corrected),
  }
}
