import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const { name, company, phone, email, region, needsCrew, message } = await req.json();

  if (!name || !company || !phone || !email || !region) {
    return NextResponse.json({ error: "필수 항목을 모두 입력해 주세요." }, { status: 400 });
  }

  const crewLabel: Record<string, string> = {
    yes: "필요합니다",
    no: "자체 시공팀 보유",
    undecided: "미정",
  };

  const { error: emailError } = await resend.emails.send({
    from: "탑디뉴스 파트너십 <no-reply@topdignus.co.kr>",
    to: "topdi@topdignus.co.kr",
    subject: `[파트너십 신청] ${company} / ${name}`,
    html: `
      <div style="font-family:'맑은 고딕',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#222;font-size:14px;">
        <h2 style="color:#014A99;margin:0 0 24px;">파트너십 신청이 접수되었습니다</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:10px 8px;font-weight:600;width:140px;color:#555;">담당자명</td><td style="padding:10px 8px;">${name}</td></tr>
          <tr style="background:#f8fafd;"><td style="padding:10px 8px;font-weight:600;color:#555;">회사명</td><td style="padding:10px 8px;">${company}</td></tr>
          <tr><td style="padding:10px 8px;font-weight:600;color:#555;">연락처</td><td style="padding:10px 8px;">${phone}</td></tr>
          <tr style="background:#f8fafd;"><td style="padding:10px 8px;font-weight:600;color:#555;">이메일</td><td style="padding:10px 8px;">${email}</td></tr>
          <tr><td style="padding:10px 8px;font-weight:600;color:#555;">희망 지역</td><td style="padding:10px 8px;">${region}</td></tr>
          <tr style="background:#f8fafd;"><td style="padding:10px 8px;font-weight:600;color:#555;">시공팀 협력</td><td style="padding:10px 8px;">${crewLabel[needsCrew] ?? "-"}</td></tr>
          <tr><td style="padding:10px 8px;font-weight:600;color:#555;vertical-align:top;">문의 내용</td><td style="padding:10px 8px;white-space:pre-wrap;">${message || "-"}</td></tr>
        </table>
      </div>
    `,
  });

  if (emailError) {
    console.error("[partnership] Resend error:", emailError);
    return NextResponse.json({ error: "이메일 전송 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
