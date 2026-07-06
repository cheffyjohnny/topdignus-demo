import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseServer } from '@/lib/supabase-server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}
const FROM_EMAIL = '주식회사 탑디뉴스 <topdi@topdignus.co.kr>'
const NOTIFY_TO = 'topdi@topdignus.co.kr'
const BASE_URL = 'https://topdignus.co.kr'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (body.type !== 'email.delivered') {
    return NextResponse.json({ ok: true })
  }

  const emailId: string = body.data?.email_id
  const to: string = body.data?.to?.[0] ?? ''
  const deliveredAt = new Date().toISOString()

  if (!emailId) return NextResponse.json({ ok: true })

  // 배관 주문 조회
  const { data: pipeOrder } = await supabaseServer
    .from('pipe_orders')
    .select('id, project, vendor, order_no, status_history')
    .eq('resend_id', emailId)
    .single()

  if (pipeOrder) {
    const newHistory = [
      ...((pipeOrder.status_history ?? []) as object[]),
      { type: 'delivered', to, at: deliveredAt },
    ]
    await supabaseServer
      .from('pipe_orders')
      .update({ status_history: newHistory })
      .eq('id', pipeOrder.id)

    await sendNotification({
      orderType: '배관',
      orderId: pipeOrder.id,
      project: pipeOrder.project,
      orderNo: pipeOrder.order_no,
      to,
      deliveredAt,
    })
    return NextResponse.json({ ok: true })
  }

  // 덕트 주문 조회
  const { data: ductOrder } = await supabaseServer
    .from('duct_orders')
    .select('id, project, customer_name, order_no, status_history')
    .eq('resend_id', emailId)
    .single()

  if (ductOrder) {
    const newHistory = [
      ...((ductOrder.status_history ?? []) as object[]),
      { type: 'delivered', to, at: deliveredAt },
    ]
    await supabaseServer
      .from('duct_orders')
      .update({ status_history: newHistory })
      .eq('id', ductOrder.id)

    await sendNotification({
      orderType: '덕트',
      orderId: ductOrder.id,
      project: ductOrder.project,
      orderNo: ductOrder.order_no,
      to,
      deliveredAt,
    })
  }

  return NextResponse.json({ ok: true })
}

async function sendNotification({
  orderType, orderId, project, orderNo, to, deliveredAt,
}: {
  orderType: string
  orderId: string
  project: string | null
  orderNo: string | null
  to: string
  deliveredAt: string
}) {
  const projectName = project ?? '현장명 없음'
  const kstTime = new Date(deliveredAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  const detailUrl = `${BASE_URL}/dashboard/${orderType === '덕트' ? 'duct-orders' : 'orders'}/${orderId}`

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: NOTIFY_TO,
    subject: `[전송확인] ${projectName} ${orderType} 발주서 도달 완료`,
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,'맑은 고딕',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#014A99;padding:20px 28px;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">✅ 발주서 전달 완료</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 20px;font-size:14px;color:#374151;">발주서 이메일이 수신자의 메일 서버에 <strong>정상적으로 도달</strong>했습니다.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:13px;">
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;color:#6b7280;width:110px;border-bottom:1px solid #e5e7eb;">현장명</td>
                  <td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;font-weight:600;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #e5e7eb;">수주서 번호</td>
                  <td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${orderNo ?? '—'}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 16px;color:#6b7280;border-bottom:1px solid #e5e7eb;">수신자</td>
                  <td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${to}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;">도달 시각</td>
                  <td style="padding:10px 16px;color:#111827;">${kstTime}</td>
                </tr>
              </table>
              <p style="margin:24px 0 0;text-align:center;">
                <a href="${detailUrl}" style="display:inline-block;background:#014A99;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 24px;border-radius:6px;">발주 상세 보기</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}
