import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CAREER_TESTS } from "@/types/careerTests";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const CAREER_ATTACHMENTS_BUCKET = "career-attachments";

// 검사별 raw_result 파싱용
const TEST_MAP: Record<string, { path: string[]; nameKey: string; scoreKey: string; title: string }> = {
  maturity: { path: ["result", "realms"], nameKey: "name", scoreKey: "t", title: "진로성숙도" },
  interest_h: { path: ["result", "wonscore"], nameKey: "type", scoreKey: "score", title: "직업흥미(H)" },
  interest_k: { path: ["result", "wonscore"], nameKey: "type", scoreKey: "score", title: "직업흥미(K)" },
  value: { path: ["result", "valueScores"], nameKey: "name", scoreKey: "score", title: "직업가치관" },
  aptitude: { path: ["result", "aptitudeScores"], nameKey: "area", scoreKey: "score", title: "직업적성검사" },
  competency: { path: ["result", "competencyScores"], nameKey: "name", scoreKey: "score", title: "진로개발역량" },
};

function getNestedArray(obj: unknown, path: string[]): unknown[] | null {
  if (!obj || typeof obj !== "object") return null;
  let cur: unknown = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return null;
    const o = cur as Record<string, unknown>;
    cur = o[key] ?? o[(key as string).toUpperCase()] ?? o[(key as string).toLowerCase()];
  }
  return Array.isArray(cur) ? cur : null;
}

function formatTestResult(r: { test_id: string; completed_at: string; raw_result?: unknown; summary?: Record<string, unknown> }): string {
  const config = TEST_MAP[r.test_id];
  const meta = CAREER_TESTS.find((t) => t.id === r.test_id);
  const title = config?.title ?? meta?.name ?? r.test_id;
  let text = `\n### ${title} (${new Date(r.completed_at).toLocaleDateString("ko-KR")})\n`;

  const rawArray = config ? getNestedArray(r.raw_result, config.path) : null;
  if (rawArray && rawArray.length > 0) {
    const sorted = [...rawArray].sort(
      (a: unknown, b: unknown) =>
        Number((b as Record<string, unknown>)?.[config.scoreKey] ?? 0) -
        Number((a as Record<string, unknown>)?.[config.scoreKey] ?? 0)
    );
    sorted.slice(0, 6).forEach((item: unknown, idx: number) => {
      const name = (item as Record<string, unknown>)?.[config.nameKey];
      const score = (item as Record<string, unknown>)?.[config.scoreKey];
      if (name != null || score != null) {
        text += `- ${String(name ?? "-")}: ${score ?? "-"}\n`;
      }
    });
  } else {
    text += "(상세 점수 없음)\n";
  }
  return text;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    // 1. 진로 검사 결과 조회
    const { data: results } = await supabase
      .from("career_test_results")
      .select("test_id, completed_at, summary, raw_result")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    let resultsText = "## 진로심리검사 결과\n";
    if (results && results.length > 0) {
      results.forEach((r) => {
        resultsText += formatTestResult(r);
      });
    } else {
      resultsText += "\n(완료된 검사 결과가 없습니다.)\n";
    }

    // 2. 첨부 파일 수집 (Storage)
    const fileParts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
    const textMimes = ["text/plain"];
    const imageMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const pdfMime = "application/pdf";

    for (const test of CAREER_TESTS) {
      const folderPath = `${user.id}/${test.id}`;
      const { data: files } = await supabase.storage
        .from(CAREER_ATTACHMENTS_BUCKET)
        .list(folderPath, { limit: 20 });

      for (const f of files ?? []) {
        if (!f.name) continue;
        const filePath = `${folderPath}/${f.name}`;
        const { data: fileData, error } = await supabase.storage
          .from(CAREER_ATTACHMENTS_BUCKET)
          .download(filePath);
        if (error || !fileData) continue;

        const buf = Buffer.from(await fileData.arrayBuffer());
        const b64 = buf.toString("base64");
        const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
        let mime = "application/octet-stream";
        if ([".txt"].includes(ext)) mime = "text/plain";
        else if ([".png"].includes(ext)) mime = "image/png";
        else if ([".jpg", ".jpeg"].includes(ext)) mime = "image/jpeg";
        else if ([".webp"].includes(ext)) mime = "image/webp";
        else if ([".pdf"].includes(ext)) mime = "application/pdf";

        if (textMimes.includes(mime)) {
          const textContent = buf.toString("utf-8").slice(0, 8000);
          fileParts.push({ text: `\n[첨부: ${test.name} - ${f.name}]\n${textContent}\n` });
        } else if (imageMimes.includes(mime) || mime === pdfMime) {
          fileParts.push({
            inlineData: { mimeType: mime, data: b64 },
          });
        }
      }
    }

    let filesIntro = "";
    if (fileParts.length > 0) {
      filesIntro = "\n\n아래에는 사용자가 검사별로 첨부한 파일(이미지, PDF, 텍스트)의 내용이 포함되어 있습니다. 이를 종합해 피드백해 주세요.";
    }

    // 3. Gemini 호출
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `당신은 특성화고등학교(직업계고) 학생들을 위한 전문 진로 상담사입니다.
'직업계고 학생을 위한 AI 기반 자기주도적 진로 설계'에 맞게,
검사 결과와 첨부 자료를 종합 분석하여 진로 방향, 전공·직업 연계, 실질적 조언을 제공해 주세요.
답변은 한국어로, 400~800자 정도로 핵심 위주로 작성하고, 구체적이며 실행 가능한 조언을 포함해 주세요.`;

    const contents = [
      {
        text: systemPrompt + "\n\n" + resultsText + filesIntro,
      },
      ...fileParts,
    ];

    const result = await model.generateContent(contents);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ feedback: text });
  } catch (err) {
    console.error("AI 피드백 오류:", err);
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `AI 피드백 생성 중 오류가 발생했습니다: ${msg}` },
      { status: 500 }
    );
  }
}
