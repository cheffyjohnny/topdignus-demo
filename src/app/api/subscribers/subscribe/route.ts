import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

export async function POST(req: NextRequest) {
  const { name, email, company } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "이름과 이메일은 필수입니다." }, { status: 400 });
  }

  // 중복 신청 확인
  const { data: existing } = await supabaseServer
    .from("newsletter_subscribers")
    .select("id, status")
    .eq("email", email)
    .single();

  if (existing) {
    if (existing.status === "active") {
      return NextResponse.json({ error: "이미 구독 중인 이메일입니다." }, { status: 409 });
    }
    if (existing.status === "pending") {
      return NextResponse.json({ error: "이미 검토 중인 신청입니다." }, { status: 409 });
    }
  }

  // DB 저장
  const { error: dbError } = await supabaseServer
    .from("newsletter_subscribers")
    .upsert(
      { name, email, company: company || null, status: "pending", requested_at: new Date().toISOString() },
      { onConflict: "email" }
    );

  if (dbError) {
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  // 신청자에게 확인 이메일
  const { error: confirmError } = await getResend().emails.send({
    from: "탑디뉴스 <no-reply@topdignus.co.kr>",
    to: email,
    subject: "[탑디뉴스] 구독 신청이 접수되었습니다",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #014A99; padding: 28px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; font-size: 20px; margin: 0;">구독 신청이 접수되었습니다</h1>
        </div>
        <div style="background: #f8fafd; padding: 28px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0 0 16px;">안녕하세요, <strong>${name}</strong>님.</p>
          <p style="margin: 0 0 16px; color: #444;">탑디뉴스 뉴스레터 구독 신청이 정상적으로 접수되었습니다.<br/>검토 후 승인 여부를 이메일로 안내드리겠습니다.</p>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 6px; font-size: 13px; color: #888;">신청 정보</p>
            <p style="margin: 0; font-size: 14px;"><strong>이름:</strong> ${name}</p>
            <p style="margin: 4px 0 0; font-size: 14px;"><strong>이메일:</strong> ${email}</p>
            ${company ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>회사:</strong> ${company}</p>` : ""}
          </div>
          <p style="margin: 16px 0 0; font-size: 13px; color: #888;">본인이 신청하지 않으셨다면 이 메일을 무시하셔도 됩니다.</p>
        </div>
      </div>
    `,
  });

  if (confirmError) {
    // 이메일 발송 실패 = 유효하지 않은 이메일일 가능성
    await supabaseServer
      .from("newsletter_subscribers")
      .update({ status: "rejected" })
      .eq("email", email);
    return NextResponse.json({ error: "유효하지 않은 이메일 주소입니다." }, { status: 400 });
  }

  // 관리자 알림
  await getResend().emails.send({
    from: "탑디뉴스 <no-reply@topdignus.co.kr>",
    to: "topdi@topdignus.co.kr",
    subject: `[탑디뉴스] 새 구독 신청 — ${name}${company ? ` (${company})` : ""}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #014A99;">새 구독 신청이 들어왔습니다</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px; font-weight: bold; width: 80px;">이름</td><td style="padding: 8px;">${name}</td></tr>
          <tr style="background:#f8fafd;"><td style="padding: 8px; font-weight: bold;">이메일</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">회사</td><td style="padding: 8px;">${company || "—"}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 13px; color: #888;">
          <a href="https://topdignus.co.kr/dashboard/crawler?tab=subscribers" style="color: #014A99;">대시보드에서 승인/거절</a>
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
