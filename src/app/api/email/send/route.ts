import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await supabase
    .from("email_verifications")
    .delete()
    .eq("email", email)
    .eq("verified", false);

  const { error: dbError } = await supabase.from("email_verifications").insert({
    email,
    code,
    expires_at: expiresAt,
    verified: false,
  });

  if (dbError) {
    console.error("Supabase insert error:", dbError);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }

  const { error: emailError } = await resend.emails.send({
    from: "탑디뉴스 <no-reply@topdignus.co.kr>",
    to: email,
    subject: "[탑디뉴스] 이메일 인증번호",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #014A99; margin-bottom: 8px;">이메일 인증</h2>
        <p style="color: #555; font-size: 14px; margin-bottom: 24px;">아래 인증번호를 입력해 주세요. (5분 내 유효)</p>
        <div style="background: #f8fafd; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #014A99;">${code}</span>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">본인이 요청하지 않은 경우 이 메일을 무시해 주세요.</p>
      </div>
    `,
  });

  if (emailError) {
    console.error("Resend error:", emailError);
    return NextResponse.json({ error: "이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
