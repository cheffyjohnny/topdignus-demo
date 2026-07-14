// DB/로직에는 한글 status 값을 그대로 쓰고, 화면 표시만 영어로 바꾸기 위한 매핑.
// DB 컬럼 값, 객체 키, 비교 로직(status === '완료' 등)은 절대 이 값으로 바꾸지 말 것 —
// 오직 JSX에서 렌더링할 때만 이 함수들을 통과시켜서 영어 라벨을 보여준다.

export const ORDER_STATUS_LABEL: Record<string, string> = {
  수주: 'Ordered',
  발주: 'Purchased',
  납품: 'Delivered',
  취소: 'Cancelled',
}

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  검토중: 'In Review',
  검토완료: 'Reviewed',
  송부완료: 'Sent',
  수주확정: 'Confirmed',
  취소: 'Cancelled',
}

export const SALES_LEAD_STATUS_LABEL: Record<string, string> = {
  등록: 'Registered',
  진행중: 'In Progress',
  착공전: 'Pre-Construction',
  이관: 'Transferred',
  체결: 'Signed',
  종료: 'Closed',
}

export const SUBSCRIBER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  rejected: 'Rejected',
}

export function statusLabel(status: string, map: Record<string, string>): string {
  return map[status] ?? status
}
