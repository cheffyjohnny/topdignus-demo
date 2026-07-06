import { supabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("category_id");
  const pipeSize = searchParams.get("pipe_size");

  let query = supabaseServer.from("products").select("*");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
    if (pipeSize) {
      query = query.eq("pipe_size", pipeSize);
    }
    query = query.order("pipe_size");
  } else {
    query = query.order("category").order("name");
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
