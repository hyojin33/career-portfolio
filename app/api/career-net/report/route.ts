import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CAREER_TEST_MAP, type CareerTestId } from "@/types/careerTests";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** v1 결과 전송 Endpoint (aptitude, value, maturity, competency, interest_k) */
const V1_REPORT_URL = "https://www.career.go.kr/inspct/openapi/test/report";
/** v2 결과 전송 Endpoint (interest_h 전용, qno 배열 형식) */
const V2_REPORT_URL = "https://www.career.go.kr/inspct/openapi/v2/report";

/** interest_h: display no → API no (qno34 고등 145문항)
 *  1~120 그대로, 121~128=1-1~1-8, 129~131=2-1~2-3, 132~133=3-1~3-2,
 *  134=4-1(좋아하는 1·2순위 콤마합침), 135=4-2(싫어하는), 136=5, 137~145=6-1~6-9
 */
const INTEREST_H_DISPLAY_TO_API: Record<string, number> = {
  "1-1": 121, "1-2": 122, "1-3": 123, "1-4": 124, "1-5": 125, "1-6": 126, "1-7": 127, "1-8": 128,
  "2-1": 129, "2-2": 130, "2-3": 131,
  "3-1": 132, "3-2": 133,
  "4-1": 134, "4-2": 135,
  "5": 136,
  "6-1": 137, "6-2": 138, "6-3": 139, "6-4": 140, "6-5": 141, "6-6": 142, "6-7": 143, "6-8": 144, "6-9": 145,
};

/** 고등학생 대상코드 100207 (매뉴얼 9페이지) — 100208(대학생) 아님 */
const TRGET_SE_HIGH = "100207";
/** 성별: 남 100323, 여 100324 */
const GENDER = { MALE: "100323", FEMALE: "100324" } as const;

type ReportBody = {
  testId: CareerTestId;
  /** "1=5 2=4 3=1" 형식 — 문항번호=응답값, 공백 구분 */
  answers: string;
  /** 검사 시작 시각 타임스탬프 (ms) */
  startDtm: number;
  /** 전체 문항 수 (미응답 더미 채우기용) */
  questionCount?: number;
  name?: string;
  /** '100323'(남) | '100324'(여) */
  gender?: string;
  grade?: string;
  school?: string;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_CAREER_NET_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CAREER_NET_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
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

  let body: ReportBody | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }
  if (body == null || typeof body !== "object") {
    return NextResponse.json({ error: "요청 본문이 null이거나 객체가 아닙니다." }, { status: 400 });
  }

  /** 클라이언트 데이터 null 사전 체크 (매뉴얼 v4.0 지침) */
  const { testId, answers, startDtm, questionCount, name: bodyName, gender: bodyGender, school: bodySchool, grade: bodyGrade } = body;

  if (testId == null || typeof testId !== "string") {
    return NextResponse.json({ error: "testId가 필요합니다." }, { status: 400 });
  }
  if (!CAREER_TEST_MAP[testId]) {
    return NextResponse.json({ error: `유효한 testId가 필요합니다. (받은 값: ${testId})` }, { status: 400 });
  }
  if (answers == null) {
    return NextResponse.json({ error: "answers가 null입니다." }, { status: 400 });
  }
  if (typeof answers !== "string") {
    return NextResponse.json({ error: "answers는 문자열이어야 합니다." }, { status: 400 });
  }
  if (String(answers).trim() === "") {
    return NextResponse.json({ error: "answers가 비어 있습니다." }, { status: 400 });
  }
  if (startDtm == null || (typeof startDtm !== "number" && typeof startDtm !== "string")) {
    return NextResponse.json({ error: "startDtm이 필요합니다." }, { status: 400 });
  }

  const config = CAREER_TEST_MAP[testId];

  let name: string;
  if (bodyName != null && typeof bodyName === "string" && bodyName.trim().length > 0) {
    name = bodyName.trim().slice(0, 50);
  } else {
    const fromMeta = user.user_metadata?.full_name ?? user.email;
    name = fromMeta != null ? String(fromMeta).trim().slice(0, 50) : "Guest";
  }
  if (!name || name.length === 0) name = "Guest";

  const gender =
    bodyGender === GENDER.FEMALE || bodyGender === "100324"
      ? GENDER.FEMALE
      : GENDER.MALE;

  const school = bodySchool != null && String(bodySchool).trim() ? String(bodySchool).trim() : "특성화고";
  const grade = bodyGrade != null && String(bodyGrade).trim() ? String(bodyGrade).trim() : "3";

  const startDtmMs = Number(startDtm) || Date.now();
  const answersNorm = String(answers).trim().replace(/\s+/g, " ").trim();
  let reportUrl: string;
  let fetchOpts: RequestInit;
  let finalAnswersCountForSummary: number;

  if (testId === "interest_k") {
    // K형: 415 방지 — V1 report API는 application/json만 수용 (매뉴얼 6페이지)
    // qestrnSeq 31, trgetSe 100207 (고등학생용), startDtm은 숫자(ms)
    const answerTokens = answersNorm.length ? answersNorm.split(" ") : [];
    const answerMap = new Map<number, number | string>();
    let maxQuestionNo = 0;
    for (const token of answerTokens) {
      const [noStr, valStrRaw] = token.split("=");
      const no = Number(noStr);
      if (!Number.isInteger(no) || no <= 0) continue;
      const valStr = (valStrRaw ?? "").trim();
      const valNum = Number(valStr);
      const value = Number.isInteger(valNum) && valNum > 0 ? valNum : 3;
      answerMap.set(no, value);
      if (no > maxQuestionNo) maxQuestionNo = no;
    }
    const totalQ = Math.max(questionCount ?? 0, maxQuestionNo) || maxQuestionNo;
    const values: (number | string)[] = [];
    for (let i = 1; i <= totalQ; i++) {
      values.push(answerMap.has(i) ? answerMap.get(i)! : 3);
    }
    const answersFull = values.map((val, idx) => `${idx + 1}=${val}`).join(" ").trim();
    finalAnswersCountForSummary = values.length || answerTokens.filter((p) => p.includes("=")).length;

    const startDtmNum = Math.floor(startDtmMs);
    const payload = {
      apikey: apiKey,
      qestrnSeq: "31",
      trgetSe: "100207",
      name,
      gender,
      school: school || "",
      grade,
      startDtm: startDtmNum,
      answers: answersFull.trim(),
    };

    reportUrl = V1_REPORT_URL;
    fetchOpts = {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    };
    console.log("[career-net/report] interest_k: JSON, qestrnSeq=31, trgetSe=100207, answers:", answersFull.length);
  } else if (testId === "interest_h") {
    // H형: V2 API — qno34 고등 145문항, 1~145 모두 포함해야 서버 응답
    const INTEREST_H_TOTAL = 145;
    const answerMap = new Map<number, string>();
    const tokens = answersNorm.length ? answersNorm.split(" ") : [];
    const getVal = (key: string) => {
      const t = tokens.find((x) => x.startsWith(key + "="));
      return t ? (t.split("=")[1] ?? "").trim() : "";
    };
    for (const token of tokens) {
      const eqIdx = token.indexOf("=");
      if (eqIdx <= 0) continue;
      const noStr = token.slice(0, eqIdx).trim();
      const valStr = (token.slice(eqIdx + 1) ?? "").trim();
      if (noStr === "4-1-1" || noStr === "4-1-2") continue;
      const apiNo = INTEREST_H_DISPLAY_TO_API[noStr] ?? (noStr.match(/^\d+$/) ? Number(noStr) : null);
      if (apiNo != null && apiNo >= 1 && apiNo <= INTEREST_H_TOTAL) {
        answerMap.set(apiNo, valStr || "3");
      }
    }
    const v41 = [getVal("4-1-1"), getVal("4-1-2")].filter(Boolean).join(",") || "-";
    answerMap.set(134, v41);
    const qnoArray: { no: string; val: string }[] = [];
    for (let n = 1; n <= INTEREST_H_TOTAL; n++) {
      const def = n >= 132 && n <= 135 ? "-" : "3";
      qnoArray.push({ no: String(n), val: answerMap.get(n) ?? def });
    }
    finalAnswersCountForSummary = qnoArray.length;

    const payload = {
      apikey: apiKey,
      qno: 34,
      answers: qnoArray,
      name,
      gender,
      grade,
      school: school || "",
      email: user.email || "",
      startdtm: Math.floor(startDtmMs),
      trgetse: "100207",
    };
    reportUrl = V2_REPORT_URL;
    fetchOpts = {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    };
    console.log("[career-net/report] interest_h: V2 JSON, qno:34, startdtm:", Math.floor(startDtmMs), "answers:", qnoArray.length);
  } else {
    // 기존 검사들(value, maturity, aptitude, competency): JSON, answers 문자열
    const answerTokens = answersNorm.length ? answersNorm.split(" ") : [];
    const answerMap = new Map<number, number | string>();
    let maxQuestionNo = 0;

    for (const token of answerTokens) {
      const [noStr, valStrRaw] = token.split("=");
      const no = Number(noStr);
      if (!Number.isInteger(no) || no <= 0) continue;
      const valStr = (valStrRaw ?? "").trim();
      const valNum = Number(valStr);
      if (testId === "value" && no === 49) {
        const commaMatch = valStr.match(/^\d+(,\d+){2}$/);
        answerMap.set(no, commaMatch ? valStr : "8,1,4");
      } else if (testId === "maturity" && no === 13 && /^\d+,\d+$/.test(valStr)) {
        answerMap.set(no, valStr);
      } else {
        const value = Number.isInteger(valNum) && valNum > 0 ? valNum : 3;
        answerMap.set(no, value);
      }
      if (no > maxQuestionNo) maxQuestionNo = no;
    }

    const totalQuestions = Math.max(questionCount ?? 0, maxQuestionNo) || maxQuestionNo;
    const expandedParts: string[] = [];
    for (let i = 1; i <= totalQuestions; i++) {
      const v = answerMap.has(i) ? answerMap.get(i) : 3;
      expandedParts.push(`${i}=${v}`);
    }
    const answersFull = expandedParts.length ? expandedParts.join(" ") : answersNorm;
    finalAnswersCountForSummary = expandedParts.length || answerTokens.filter((p) => p.includes("=")).length;
    const startDtmStr = String(Math.floor(startDtmMs)).padStart(13, "0").slice(0, 13);
    const startDtmNum = Number(startDtmStr);

    const payload = {
      apikey: apiKey,
      qestrnSeq: String(config.q),
      trgetSe: TRGET_SE_HIGH,
      name,
      gender,
      school,
      grade,
      startDtm: startDtmNum,
      answers: expandedParts.join(" ").trim() || answersNorm,
    };
    reportUrl = V1_REPORT_URL;
    fetchOpts = {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    };
    console.log("[career-net/report] POST", reportUrl, "qestrnSeq:", config.q, "testId:", testId);
  }

  const CAREER_FETCH_TIMEOUT_MS = 90000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CAREER_FETCH_TIMEOUT_MS);
  fetchOpts = { ...fetchOpts, signal: controller.signal };

  const careerStart = Date.now();
  try {
    const res = await fetch(reportUrl, fetchOpts);
    clearTimeout(timeoutId);
    const careerElapsed = Date.now() - careerStart;
    console.log("[career-net/report] 커리어넷 응답:", { status: res.status, elapsedMs: careerElapsed });
    const text = await res.text();

    if (!res.ok) {
      let errorReason: string | undefined;
      try {
        const errJson = JSON.parse(text) as { ERROR_REASON?: string; message?: string };
        errorReason = errJson.ERROR_REASON ?? errJson.message;
      } catch {
        /* 응답이 JSON이 아닐 수 있음 */
      }
      console.error("[career-net/report] 커리어넷 API 실패:", { status: res.status, body: text.slice(0, 500) });
      return NextResponse.json(
        {
          error: "커리어넷 결과 API 오류",
          ERROR_REASON: errorReason ?? `HTTP ${res.status}`,
          statusCode: res.status,
          detail: text,
          message: errorReason ?? `커리어넷 서버가 ${res.status} 상태를 반환했습니다.`,
        },
        { status: 500 }
      );
    }

    const trimmed = text.trim();
    if (!trimmed.startsWith("{")) {
      return NextResponse.json(
        {
          error: "커리어넷이 JSON이 아닌 응답을 반환했습니다.",
          ERROR_REASON: text.slice(0, 300),
          detail: text.slice(0, 500),
          message: text.slice(0, 300),
        },
        { status: 500 }
      );
    }

    const json = JSON.parse(text) as {
      SUCC_YN?: string;
      success?: string;
      ERROR_REASON?: string;
      message?: string;
      RESULT?: { inspctSeq?: number; inspctseq?: string; url?: string; inspct?: { inspctseq?: string; reporturl?: string } };
      result?: { inspctSeq?: number; inspctseq?: string; url?: string; inspct?: { inspctseq?: string; reporturl?: string } };
    };

    const isFail = json.SUCC_YN === "N" || json.SUCC_YN === "n" || json.success === "N" || json.success === "n";
    if (isFail) {
      const reason = String(json.ERROR_REASON ?? json.message ?? "커리어넷에서 실패 사유를 반환하지 않았습니다.").trim();
      console.error("[career-net/report] SUCC_YN=N, ERROR_REASON:", reason, "| detail:", trimmed.slice(0, 300));
      const err = new Error(`커리어넷 결과 처리 실패: ${reason}`);
      (err as Error & { ERROR_REASON?: string }).ERROR_REASON = reason;
      throw err;
    }

    const result = json.RESULT ?? json.result;
    // v2: result.inspct.inspctseq, result.inspct.reporturl / v1: result.inspctSeq, result.url
    const inspct = result && typeof result === "object" ? (result as { inspct?: { inspctseq?: string; reporturl?: string } }).inspct : undefined;
    const inspctSeq =
      (result && typeof result === "object" ? (result as { inspctSeq?: number; inspctseq?: string }).inspctSeq : undefined) ??
      (result && typeof result === "object" ? (result as { inspctSeq?: number; inspctseq?: string }).inspctseq : undefined) ??
      (inspct?.inspctseq != null ? inspct.inspctseq : undefined);
    const reportUrlFromApi =
      (result && typeof result === "object" ? (result as { url?: string }).url : undefined) ??
      (inspct?.reporturl != null ? inspct.reporturl : undefined);

    const inspctSeqStr = inspctSeq != null ? String(inspctSeq) : null;

    const summaryExtras: Record<string, unknown> = {};

    // profiles에 사용자 없으면 생성 (career_test_results FK 충족)
    await supabase.rpc("ensure_profile", {
      p_id: user.id,
      p_name: user.email || user.user_metadata?.full_name || user.user_metadata?.name || "",
    });

    // Supabase career_test_results upsert용 payload
    const supabaseRow = {
      user_id: user.id,
      test_id: config.id,
      test_name: config.name,
      qestrn_seq: inspctSeqStr,
      raw_result: result ? (typeof result === "object" ? result : { result }) : null,
      summary: {
        inspctSeq,
        url: reportUrlFromApi,
        completed: true,
        answersLength: finalAnswersCountForSummary,
        ...summaryExtras,
      } as Record<string, unknown>,
      completed_at: new Date().toISOString(),
    };

    try {
      const { error: upsertError } = await supabase
        .from("career_test_results")
        // DB 제약 조건: UNIQUE(user_id, test_id)에 맞춰 충돌 처리
        .upsert(supabaseRow, { onConflict: "user_id,test_id" });

      if (upsertError) {
        console.error("[career-net/report] Supabase 저장 실패 (상세):", {
          table: "career_test_results",
          payload: supabaseRow,
          code: (upsertError as any).code,
          details: (upsertError as any).details,
          hint: (upsertError as any).hint,
          message: upsertError.message,
        });
        return NextResponse.json(
          {
            error: "결과 저장 실패",
            detail: upsertError.message,
            code: (upsertError as any).code,
            supabaseDetails: (upsertError as any).details,
            supabaseHint: (upsertError as any).hint,
            inspctSeq: inspctSeqStr,
          },
          { status: 500 }
        );
      }
    } catch (dbErr) {
      console.error("[career-net/report] Supabase upsert 예외 발생:", {
        table: "career_test_results",
        payload: supabaseRow,
        error: dbErr,
      });
      return NextResponse.json(
        {
          error: "결과 저장 중 예외가 발생했습니다.",
          detail: dbErr instanceof Error ? dbErr.message : String(dbErr),
          inspctSeq: inspctSeqStr,
        },
        { status: 500 }
      );
    }

    // v1/v2 공통: Supabase 저장 성공 로그 (inspctSeq 포함)
    console.log("[career-net/report] Supabase 저장 성공:", {
      userId: user.id,
      testId: config.id,
      inspctSeq: inspctSeqStr,
    });

    const response: { ok: true; inspctSeq: string | null; url?: string; ERROR_REASON?: string } = {
      ok: true,
      inspctSeq: inspctSeqStr,
      url: reportUrlFromApi,
    };
    if (json.ERROR_REASON != null && String(json.ERROR_REASON).trim() !== "") {
      response.ERROR_REASON = String(json.ERROR_REASON);
    }
    return NextResponse.json(response);
  } catch (e) {
    const isAbort = e instanceof Error && e.name === "AbortError";
    const errWithReason = e as Error & { ERROR_REASON?: string };
    const errorReason = errWithReason?.ERROR_REASON;
    console.error("[career-net/report] error:", e);
    const message = isAbort
      ? "커리어넷 서버가 90초 내에 응답하지 않았습니다. 서비스 URL 등록·이용 한도를 확인하거나 10~20분 후 다시 시도해 주세요."
      : errorReason ?? (e instanceof Error ? e.message : String(e));
    const payload: { error: string; detail?: string; message: string; ERROR_REASON?: string } = {
      error: message,
      message,
    };
    if (e instanceof Error) payload.detail = e.message;
    if (errorReason != null && String(errorReason).trim() !== "") payload.ERROR_REASON = String(errorReason).trim();
    return NextResponse.json(payload, { status: 500 });
  }
}
