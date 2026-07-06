import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const { name, company, phone, email, message } = await req.json();

  if (!name || !message) {
    return NextResponse.json({ error: "성함과 문의 내용은 필수입니다." }, { status: 400 });
  }

  // Save to Supabase
  const { error: dbError } = await supabase.from("inquiries").insert({
    name,
    company,
    phone,
    email,
    message,
  });

  if (dbError) {
    console.error("Supabase insert error:", dbError);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  // Send notification + auto-reply in parallel
  const [{ error: notifyError }, { error: autoReplyError }] = await Promise.all([
    resend.emails.send({
      from: "탑디뉴스 문의 <no-reply@topdignus.co.kr>",
      to: "topdi@topdignus.co.kr",
      subject: `[탑디뉴스] 새 문의 - ${name}${company ? ` (${company})` : ""}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #014A99;">새 문의가 접수되었습니다</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; width: 100px;">성함</td><td style="padding: 8px;">${name}</td></tr>
            <tr style="background:#f8fafd;"><td style="padding: 8px; font-weight: bold;">회사명</td><td style="padding: 8px;">${company || "-"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">연락처</td><td style="padding: 8px;">${phone || "-"}</td></tr>
            <tr style="background:#f8fafd;"><td style="padding: 8px; font-weight: bold;">이메일</td><td style="padding: 8px;">${email || "-"}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; vertical-align: top;">문의 내용</td><td style="padding: 8px; white-space: pre-wrap;">${message}</td></tr>
          </table>
        </div>
      `,
    }),
    resend.emails.send({
      from: "탑디뉴스 <no-reply@topdignus.co.kr>",
      to: email,
      subject: "[탑디뉴스] 문의가 접수되었습니다",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #222;">
          <div style="background: #014A99; padding: 28px 32px; border-radius: 8px 8px 0 0;">
            <img src="https://topdignus.co.kr/logo.png" alt="탑디뉴스" style="height: 32px;" />
          </div>
          <div style="background: #ffffff; padding: 36px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; font-weight: 600; margin: 0 0 16px;">${name} 님, 안녕하세요.</p>
            <p style="font-size: 14px; line-height: 1.8; margin: 0 0 24px; color: #444;">
              탑디뉴스에 문의해 주셔서 감사합니다.<br />
              보내주신 내용은 정상적으로 접수되었으며,<br />
              담당자 검토 후 빠른 시일 내에 답변 드리겠습니다.
            </p>
            <div style="background: #f8fafd; border-radius: 6px; padding: 20px 24px; margin-bottom: 24px;">
              <p style="font-size: 13px; font-weight: 600; color: #014A99; margin: 0 0 12px;">접수된 문의 내용</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr><td style="padding: 5px 0; font-weight: 600; width: 80px; color: #555;">성함</td><td style="padding: 5px 0; color: #333;">${name}</td></tr>
                ${company ? `<tr><td style="padding: 5px 0; font-weight: 600; color: #555;">회사명</td><td style="padding: 5px 0; color: #333;">${company}</td></tr>` : ""}
                ${phone ? `<tr><td style="padding: 5px 0; font-weight: 600; color: #555;">연락처</td><td style="padding: 5px 0; color: #333;">${phone}</td></tr>` : ""}
                <tr><td style="padding: 5px 0; font-weight: 600; color: #555; vertical-align: top; padding-top: 8px;">문의 내용</td><td style="padding: 5px 0; color: #333; white-space: pre-wrap; padding-top: 8px;">${message}</td></tr>
              </table>
            </div>
            <p style="font-size: 13px; color: #888; margin: 0;">
              본 메일은 발신 전용입니다. 추가 문의는 <a href="https://topdignus.co.kr/#contact" style="color: #014A99;">홈페이지 문의 폼</a>을 이용해 주세요.
            </p>
          </div>
          <p style="font-size: 12px; color: #bbb; text-align: center; margin-top: 20px;">
            © 탑디뉴스 · topdignus.co.kr
          </p>
        </div>
      `,
    }),
  ]);

  if (notifyError) console.error("Notify email error:", JSON.stringify(notifyError));
  if (autoReplyError) console.error("Auto-reply email error:", JSON.stringify(autoReplyError));

  return NextResponse.json({ success: true });
}
