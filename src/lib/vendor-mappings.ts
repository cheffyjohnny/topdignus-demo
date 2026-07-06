// ── 표시명 / 단위 ──────────────────────────────────────────────────────────────

export const INTERNAL_TO_DISPLAY: Record<string, string> = {
  '입상_PVC_고정구_일체형': '내화채움재(PVC)입상',
  '입상_SU_고정구_일체형':  '내화채움재(SU)입상',
  '입상_강관_고정구_일체형': '내화채움재(강관)입상',
  '입상_PVC_고정틀':        '입상_PVC_고정틀',
  '입상_SU_고정틀':         '입상_SU_고정틀',
  '입상_강관_고정틀':       '입상_강관_고정틀',
  '입상_PVC_충진재':        '입상_PVC_충진재',
  '입상_SU_충진재':         '입상_SU_충진재',
  '입상_강관_충진재':       '입상_강관_충진재',
  '벽체_PVC':               '내화채움재(PVC)벽체',
  '벽체_강관':              '내화채움재(강관)벽체',
  '벽체_SU':                '내화채움재(SU)벽체',
  '차열재':                 '차열재',
  '실란트':                 '실란트',
  '원형덕트':               '원형덕트',
}

export const INTERNAL_TO_UNIT: Record<string, string> = {
  '차열재': '롤',
}

export function getDisplayName(internalName: string): string {
  return INTERNAL_TO_DISPLAY[internalName] ?? internalName
}

export function getUnit(internalName: string): string {
  return INTERNAL_TO_UNIT[internalName] ?? 'ea'
}

// 엑셀 시트 2 D열용: 배관 사이즈 정규화 (구버전 "20" → "20A", 신버전 "20A" 그대로)
export function normalizePipeForExcel(pipe: string): string {
  return /^\d+$/.test(pipe) ? `${pipe}A` : pipe
}
