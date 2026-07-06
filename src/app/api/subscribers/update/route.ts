import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, email, company } = await req.json();
  if (!id || !name || !email) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("newsletter_subscribers")
    .update({ name, email, company: company || null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // users 테이블도 동기화
  await supabaseServer
    .from("users")
    .update({ name, email })
    .eq("email", email)
    .eq("role", "subscriber");

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id 누락" }, { status: 400 });

  // 이메일 조회 후 users도 삭제
  const { data: sub } = await supabaseServer
    .from("newsletter_subscribers")
    .select("email")
    .eq("id", id)
    .single();

  if (sub?.email) {
    await supabaseServer
      .from("users")
      .delete()
      .eq("email", sub.email)
      .eq("role", "subscriber");
  }

  const { error } = await supabaseServer
    .from("newsletter_subscribers")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
