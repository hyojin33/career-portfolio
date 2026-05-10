import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabaseWithAuth(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** GET: 저장된 AI 피드백 기록 목록 조회 */
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = getSupabaseWithAuth(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("ai_feedback_records")
    .select("id, feedback, created_at, test_names")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ai-feedback-records] GET error:", error);
    return NextResponse.json(
      { error: "기록 조회에 실패했습니다.", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ records: data ?? [] });
}

/** POST: AI 피드백 저장 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = getSupabaseWithAuth(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { feedback?: string; test_names?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
  if (!feedback) {
    return NextResponse.json({ error: "feedback 내용이 필요합니다." }, { status: 400 });
  }

  const testNames = typeof body.test_names === "string" ? body.test_names.trim() || null : null;

  const { data, error } = await supabase
    .from("ai_feedback_records")
    .insert({ user_id: user.id, feedback, test_names: testNames })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[ai-feedback-records] POST error:", error);
    return NextResponse.json(
      { error: "저장에 실패했습니다.", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, id: data.id, created_at: data.created_at });
}

/** DELETE: AI 피드백 기록 삭제 (query id=uuid) */
export async function DELETE(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = getSupabaseWithAuth(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("ai_feedback_records")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[ai-feedback-records] DELETE error:", error);
    return NextResponse.json(
      { error: "삭제에 실패했습니다.", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
