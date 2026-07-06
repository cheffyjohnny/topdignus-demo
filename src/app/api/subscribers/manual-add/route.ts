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
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, company } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "이름과 이메일은 필수입니다." }, { status: 400 });
  }

  // newsletter_subscribers 중복 확인
  const { data: existingSub } = await supabaseServer
    .from("newsletter_subscribers")
    .select("id, status")
    .eq("email", email)
    .single();

  if (existingSub?.status === "active") {
    return NextResponse.json({ error: "이미 승인된 구독자입니다." }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (existingSub) {
    await supabaseServer
      .from("newsletter_subscribers")
      .update({ status: "active", name, company: company || null, approved_at: now })
      .eq("id", existingSub.id);
  } else {
    await supabaseServer.from("newsletter_subscribers").insert({
      name, email, company: company || null,
      status: "active",
      requested_at: now,
      approved_at: now,
    });
  }

  // users 계정 생성 (없는 경우만)
  const { data: existingUser } = await supabaseServer
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  let username = ""
  if (!existingUser) {
    const base = email.split("@")[0];
    username = base;
    let attempt = 0;
    while (true) {
      const { data: conflict } = await supabaseServer
        .from("users").select("id").eq("username", username).single();
      if (!conflict) break;
      attempt++;
      username = `${base}${attempt}`;
    }

    const hashedPassword = await bcrypt.hash(username, 10);
    const { error: insertError } = await supabaseServer.from("users").insert({
      username, email, name, password: hashedPassword, role: "subscriber",
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, username: username || null });
}
