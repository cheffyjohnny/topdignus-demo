export interface EmailSignature {
  id: string
  label: string
  name: string
  title: string
  phone: string
  email: string
  web: string
  address: string
  logoUrl?: string
}

const STORAGE_KEY = 'topdignus_email_signatures_v2'
const SELECTED_KEY = 'topdignus_email_signature_selected'

const COMPANY = {
  email: 'topdi@topdignus.co.kr',
  web: 'topdignus.co.kr',
  address: '경기도 화성시 동탄대로 636-3 메가비즈타워C동 1206호',
}

export const DEFAULT_SIGNATURES: EmailSignature[] = [
  {
    id: 'sig_jooheon',
    label: '이주헌 (영업부 차장)',
    name: '이주헌',
    title: '영업부 차장  |  탑디뉴스',
    phone: '010-2739-8742',
    ...COMPANY,
  },
  {
    id: 'sig_joosun',
    label: '이주선 (실장)',
    name: '이주선',
    title: '실장  |  탑디뉴스',
    phone: '010-7103-3144',
    ...COMPANY,
  },
  {
    id: 'sig_minsu',
    label: '이민수 (대표)',
    name: '이민수',
    title: '대표  |  탑디뉴스',
    phone: '010-8884-4742',
    ...COMPANY,
  },
  {
    id: 'sig_joosong',
    label: '이주송 (관리부 부장)',
    name: '이주송',
    title: '관리부 부장  |  탑디뉴스',
    phone: '010-9308-5358',
    ...COMPANY,
  },
]

export const DEFAULT_SIGNATURE = DEFAULT_SIGNATURES[0]

export function loadSignatures(): EmailSignature[] {
  if (typeof window === 'undefined') return DEFAULT_SIGNATURES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SIGNATURES
    const parsed = JSON.parse(raw) as EmailSignature[]
    return parsed.length > 0 ? parsed : DEFAULT_SIGNATURES
  } catch {
    return DEFAULT_SIGNATURES
  }
}

export function saveSignatures(sigs: EmailSignature[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sigs))
}

export function loadSelectedSigId(): string {
  if (typeof window === 'undefined') return DEFAULT_SIGNATURES[0].id
  return localStorage.getItem(SELECTED_KEY) ?? DEFAULT_SIGNATURES[0].id
}

export function saveSelectedSigId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SELECTED_KEY, id)
}
