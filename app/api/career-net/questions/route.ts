import { NextRequest, NextResponse } from "next/server";
import { CAREER_TEST_MAP, type CareerTestId } from "@/types/careerTests";

// V1 (5종): .../test/questions — 검사번호 파라미터 q
const V1_QUESTIONS_URL = "https://www.career.go.kr/inspct/openapi/test/questions";
// V2 (직업흥미검사 H): .../v2/test (뒤에 /questions 없음) — 검사번호 파라미터 q (예: q=34)
const V2_QUESTIONS_URL = "https://www.career.go.kr/inspct/openapi/v2/test";

export async function GET(request: NextRequest) {
  const testId = request.nextUrl.searchParams.get("testId") as CareerTestId | null;
  if (!testId || !CAREER_TEST_MAP[testId]) {
    return NextResponse.json(
      { error: "유효한 testId가 필요합니다." },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_CAREER_NET_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CAREER_NET_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const config = CAREER_TEST_MAP[testId];
  /** interest_h=34(v2), interest_k=31, value=25, maturity=36, aptitude=21, competency=27 */
  const q = config.q;
  const jsonParam = "&contentType=json";
  let url: string;

  if (config.apiVersion === "v2") {
    url = `${V2_QUESTIONS_URL}?apikey=${encodeURIComponent(apiKey)}&q=${q}${jsonParam}`;
  } else {
    url = `${V1_QUESTIONS_URL}?apikey=${encodeURIComponent(apiKey)}&q=${q}${jsonParam}`;
  }

  console.log("[career-net/questions] testId:", testId, "q:", q, "url:", url);

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "CareerPortfolio/1.0" },
    });
    const text = await res.text();

    console.log("[career-net/questions] 응답 상태:", res.status, res.statusText);
    console.log("[career-net/questions] 응답 원본 (앞 2000자):", text.slice(0, 2000));
    if (text.length > 2000) console.log("[career-net/questions] ... (총", text.length, "자)");

    if (!res.ok) {
      return NextResponse.json(
        { error: "커리어넷 API 오류", statusCode: res.status, detail: text.slice(0, 1000) },
        { status: 502 }
      );
    }

    const trimmed = text.trim();
    const looksLikeJson = trimmed.startsWith("{");
    const contentType = res.headers.get("content-type") || "";

    if (!looksLikeJson && !contentType.includes("application/json")) {
      return NextResponse.json(
        {
          error: "커리어넷 API가 JSON이 아닌 형식을 반환했습니다.",
          statusCode: res.status,
          detail: text.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    if (contentType.includes("application/json") || looksLikeJson) {
      const json = JSON.parse(text) as {
        SUCC_YN?: string;
        success?: string;
        ERROR_REASON?: string;
        message?: string;
        RESULT?: unknown[];
        result?: { questions?: unknown[]; [k: string]: unknown };
        [k: string]: unknown;
      };
      const isSuccess = json.SUCC_YN === "Y" || json.success === "Y" || json.success === "y";
      if (!isSuccess && (json.SUCC_YN !== undefined || json.success !== undefined)) {
        return NextResponse.json(
          {
            error: (json.ERROR_REASON ?? json.message ?? "커리어넷 API에서 오류를 반환했습니다.") as string,
            statusCode: res.status,
            detail: trimmed.slice(0, 500),
          },
          { status: 502 }
        );
      }
      let toReturn = json;
      const resultObj = json.result;
      if (resultObj && typeof resultObj === "object" && Array.isArray((resultObj as { questions?: unknown[] }).questions)) {
        const questions = (resultObj as { questions: unknown[] }).questions;
        toReturn = { ...json, RESULT: questions };
        console.log("[career-net/questions] V2 result.questions → RESULT 변환, 문항 수:", questions.length);
      } else {
        const resultLen = Array.isArray(json.RESULT) ? json.RESULT.length : 0;
        console.log("[career-net/questions] 응답 최상위 키:", Object.keys(json).join(", "), "| RESULT 길이:", resultLen);
      }
      return NextResponse.json(toReturn);
    }
    return new NextResponse(text, {
      headers: { "Content-Type": contentType || "application/xml" },
    });
  } catch (e) {
    console.error("career-net questions fetch error:", e);
    return NextResponse.json(
      { error: "검사 문항을 불러오는 중 오류가 발생했습니다." },
      { status: 502 }
    );
  }
}
