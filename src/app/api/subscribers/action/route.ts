import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";
import { Resend } from "resend";
import bcrypt from "bcryptjs";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json();

  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "reject") {
    const { error } = await supabaseServer
      .from("newsletter_subscribers")
      .update({ status: "rejected", approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // 승인: subscriber 정보 조회
  const { data: sub, error: fetchError } = await supabaseServer
    .from("newsletter_subscribers")
    .select("name, email")
    .eq("id", id)
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: "구독자를 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 users 계정이 있는지 확인
  const { data: existing } = await supabaseServer
    .from("users")
    .select("id")
    .eq("email", sub.email)
    .single();

  if (!existing) {
    const hashedPassword = await bcrypt.hash(sub.name, 10);
    // username: 이메일 앞부분, 중복 시 뒤에 숫자 추가
    const base = sub.email.split("@")[0]
    let username = base
    let attempt = 0
    while (true) {
      const { data: conflict } = await supabaseServer
        .from("users")
        .select("id")
        .eq("username", username)
        .single()
      if (!conflict) break
      attempt++
      username = `${base}${attempt}`
    }

    const { error: insertError } = await supabaseServer.from("users").insert({
      username,
      email: sub.email,
      name: sub.name,
      password: hashedPassword,
      role: "subscriber",
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 신청자에게 로그인 정보 발송
    await getResend().emails.send({
      from: "탑디뉴스 <no-reply@topdignus.co.kr>",
      to: sub.email,
      subject: "[탑디뉴스] 구독이 승인되었습니다 — 로그인 정보 안내",
      html: `
        <div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:480px;margin:0 auto;color:#222;">
          <div style="background:#014A99;padding:24px 28px;border-radius:10px 10px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:18px;">구독이 승인되었습니다</h2>
          </div>
          <div style="background:#f8fafd;padding:24px 28px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none;">
            <p style="margin:0 0 16px;">안녕하세요, <strong>${sub.name}</strong>님.</p>
            <p style="margin:0 0 20px;color:#444;">탑디뉴스 수집 데이터 열람 계정이 발급되었습니다.<br/>아래 정보로 로그인하세요.</p>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:13px;color:#888;">로그인 정보</p>
              <p style="margin:0;font-size:15px;"><strong>아이디:</strong> <span style="color:#014A99;">${username}</span></p>
              <p style="margin:6px 0 0;font-size:15px;"><strong>비밀번호:</strong> <span style="color:#014A99;">${sub.name}</span></p>
            </div>
            <a href="https://topdignus.co.kr/login" style="display:inline-block;background:#014A99;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">로그인하기</a>
            <p style="margin-top:20px;font-size:12px;color:#999;">탑디뉴스 · topdi@topdignus.co.kr</p>
          </div>
        </div>
      `,
    }).catch(() => {});
  }

  // newsletter_subscribers 상태 업데이트
  const { error } = await supabaseServer
    .from("newsletter_subscribers")
    .update({ status: "active", approved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: "active" });
}
