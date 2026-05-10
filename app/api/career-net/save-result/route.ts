import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CareerTestResultPayload } from "@/types/careerTests";

export async function POST(request: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[career-net/save-result] Supabase env missing");
    return NextResponse.json(
      { error: "서버 설정 오류", detail: "Supabase 환경 변수가 없습니다." },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: CareerTestResultPayload & { raw?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const { testId, testName, qestrnSeq, summary, raw, completedAt } = body;
  if (!testId || !summary) {
    return NextResponse.json(
      { error: "testId, testName, summary가 필요합니다." },
      { status: 400 }
    );
  }

  // summary는 JSONB: 객체로 통일 (문자열이면 래핑)
  const summaryJson =
    typeof summary === "object" && summary !== null
      ? summary
      : { message: typeof summary === "string" ? summary : "응답 저장됨" };

  // profiles에 사용자 없으면 생성 (career_test_results FK 충족)
  await supabase.rpc("ensure_profile", {
    p_id: user.id,
    p_name: user.email || user.user_metadata?.full_name || user.user_metadata?.name || "",
  });

  const { error } = await supabase.from("career_test_results").upsert(
    {
      user_id: user.id,
      test_id: testId,
      test_name: testName || testId,
      qestrn_seq: qestrnSeq || null,
      summary: summaryJson,
      raw_result: raw || null,
      completed_at: completedAt || new Date().toISOString(),
    },
    { onConflict: "user_id,test_id" }
  );

  if (error) {
    console.error("[career-net/save-result] Supabase upsert error:", {
      code: (error as { code?: string })?.code,
      message: error.message,
      details: (error as { details?: unknown })?.details,
    });
    return NextResponse.json(
      {
        error: "결과 저장에 실패했습니다.",
        detail: error.message,
        code: (error as { code?: string })?.code,
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
