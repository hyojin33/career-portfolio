"use client";

import { useAuth } from "@/components/AuthProvider";
import { safeFetch } from "@/lib/safeFetch";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CAREER_TEST_MAP, type CareerTestId } from "@/types/careerTests";
import { getSupabaseClient } from "@/lib/supabase";
import { JobSelectInput } from "@/components/JobSelectInput";
import { SubjectSelectInput } from "@/components/SubjectSelectInput";
import {
  APTITUDE_SCALE_MIN,
  APTITUDE_SCALE_MAX,
  APTITUDE_SCALE_LABEL_LOW,
  APTITUDE_SCALE_LABEL_HIGH,
  getAptitudeDescriptionsForQuestion,
  getAptitudeLeftRight,
  APTITUDE_QUESTION_PROBLEM_BOX,
} from "@/data/aptitudeScaleDescriptions";

type QuestionItem = { no: string; question: string; answerOptions?: { no: string; content: string }[] };

/** 6-1~6-9 과목 성적 구간 (137~145번, 고등 145문항 API) */
const SECTION_6_OPTIONS = [
  { no: "1", content: "하위권" },
  { no: "2", content: "중하위권" },
  { no: "3", content: "중위권" },
  { no: "4", content: "중상위권" },
  { no: "5", content: "상위권" },
  { no: "6", content: "배우지 않는 과목임" },
] as const;
/** 직업가치관 49번: 12가지 가치 중 3개 순위 선택 */
const VALUE_49_ITEMS: { id: number; name: string; desc: string }[] = [
  { id: 1, name: "안정성", desc: "내가 하고 싶은 일을 계속해서 안정적으로 하는 것입니다." },
  { id: 2, name: "보수", desc: "일을 통해 돈과 같은 경제적 보상을 얻는 것입니다." },
  { id: 3, name: "일과 삶의 균형", desc: "일과 개인생활의 균형을 이루는 것입니다." },
  { id: 4, name: "즐거움", desc: "일에서 흥미와 보람을 느끼고 즐거움을 얻는 것입니다." },
  { id: 5, name: "소속감", desc: "사람들과 함께 일하면서 구성원이 되는 것입니다." },
  { id: 6, name: "자기계발", desc: "일을 통해서 자신의 능력을 발전시키고 성장해 나가는 것입니다." },
  { id: 7, name: "도전성", desc: "실패를 두려워하지 않고 새로운 일에 도전하는 것입니다." },
  { id: 8, name: "영향력", desc: "다른 사람에게 영향을 미치고 사람들을 이끄는 것입니다." },
  { id: 9, name: "사회적 기여", desc: "다른 사람들의 행복과 복지에 기여하는 것입니다." },
  { id: 10, name: "성취", desc: "목표의식이 뚜렷하고, 자신의 능력을 발휘하여 목표한 바를 달성하는 것입니다." },
  { id: 11, name: "사회적 인정", desc: "다른 사람들에게 인정받고 존경받는 것입니다." },
  { id: 12, name: "자율성", desc: "일의 내용과 환경을 스스로 결정하고 선택하는 것입니다." },
];

/** 진로성숙도 36번 '아니요' → 37~41 건너뛰고 42번으로 */
const MATURITY_SKIP_36_NOS = new Set(["37", "38", "39", "40", "41"]);
/** 36번 '아니요' 옵션 값 (API마다 0 또는 2 등) */
const MATURITY_36_NO_VALUES = new Set(["0", "2"]);

/** 직업흥미검사(H) 2-3 전공 분야 선택지 (2-2에서 ① 선택 시에만 표시) */
const INTEREST_H_2_3_OPTIONS = [
  { no: "1", content: "인문" },
  { no: "2", content: "사회" },
  { no: "3", content: "교육" },
  { no: "4", content: "공학" },
  { no: "5", content: "자연" },
  { no: "6", content: "의약" },
  { no: "7", content: "예체능" },
];

/** 직업흥미검사(H) 6-1~6-9 과목 (API 137~145번) */
const SECTION_6_SUBJECTS: { key: string; name: string; apiNo: number }[] = [
  { key: "6-1", name: "국어", apiNo: 137 },
  { key: "6-2", name: "수학", apiNo: 138 },
  { key: "6-3", name: "영어", apiNo: 139 },
  { key: "6-4", name: "사회", apiNo: 140 },
  { key: "6-5", name: "과학", apiNo: 141 },
  { key: "6-6", name: "체육", apiNo: 142 },
  { key: "6-7", name: "미술", apiNo: 143 },
  { key: "6-8", name: "음악", apiNo: 144 },
  { key: "6-9", name: "기술가정", apiNo: 145 },
];

/** v1(RESULT), v2(다른 키/중첩) 등 다양한 응답에서 문항 배열 추출 */
function getQuestionsArrayFromResponse(json: Record<string, unknown>): unknown[] {
  const direct = json.RESULT ?? json.result ?? json.questions ?? json.data ?? json.items ?? json.list ?? json.results;
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    const nested = (direct as Record<string, unknown>).questions ?? (direct as Record<string, unknown>).RESULT ?? (direct as Record<string, unknown>).result ?? (direct as Record<string, unknown>).items ?? (direct as Record<string, unknown>).list;
    if (Array.isArray(nested)) return nested;
  }
  if (Array.isArray(json)) return json;
  return [];
}

/** 문항 객체를 공통 형식으로 정규화 (v1 answer01~10, v2 다른 필드명 지원) */
function normalizeQuestionItem(q: Record<string, unknown>, idx: number): QuestionItem {
  const no = String(q.qitemNo ?? q.qesitmNo ?? q.no ?? q.questionNo ?? q.seq ?? idx + 1);
  const question = String(
    q.question ?? q.questionContent ?? q.qestn ?? q.qestnCn ?? q.questionText ?? q.text ?? q.item ?? ""
  );
  const opts: { no: string; content: string }[] = [];

  const choices = q.choices ?? q.answerList ?? q.options;
  if (Array.isArray(choices)) {
    choices.forEach((c: unknown, i: number) => {
      const item = typeof c === "object" && c !== null ? (c as Record<string, unknown>) : {};
      const content = String(item.content ?? item.text ?? item.answer ?? item.label ?? c ?? "");
      const score = item.score ?? item.value ?? item.no ?? i + 1;
      if (content) opts.push({ no: String(score), content });
    });
  }
  if (opts.length === 0) {
    for (let i = 1; i <= 10; i++) {
      const key = `answer${i <= 9 ? "0" + i : i}`;
      const scoreKey = `answerScore${i <= 9 ? "0" + i : i}`;
      const content = q[key];
      if (content != null && String(content).trim() !== "") {
        const score = q[scoreKey];
        opts.push({ no: score != null ? String(score) : String(i), content: String(content) });
      }
    }
  }
  return { no, question, answerOptions: opts.length ? opts : undefined };
}

export default function CareerTestRunPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const testId = params?.testId as CareerTestId | undefined;

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<{ statusCode?: number; error?: string; detail?: string } | null>(null);
  const startDtmRef = useRef<number | null>(null);

  const config = testId ? CAREER_TEST_MAP[testId] : null;

  // 로그인 안 된 경우 리다이렉트는 useEffect에서만 수행 (렌더 중 setState 방지)
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!testId || !config) return;
    let cancelled = false;

    (async () => {
      setLoadingQuestions(true);
      setLoadError(null);
      try {
        const res = await safeFetch(`/api/career-net/questions?testId=${encodeURIComponent(testId)}`);
        if (!res) return;
        const contentType = res.headers.get("content-type") || "";
        const text = await res.text();

        if (!res.ok) {
          let errBody: { error?: string; detail?: string; statusCode?: number } = {};
          try {
            errBody = JSON.parse(text);
          } catch {
            errBody = { error: "서버 오류", detail: text.slice(0, 500) };
          }
          if (!cancelled) {
            setQuestions([]);
            setLoadError({
              statusCode: errBody.statusCode ?? res.status,
              error: errBody.error ?? res.statusText,
              detail: errBody.detail,
            });
          }
          return;
        }

        if (contentType.includes("application/json") || text.trim().startsWith("{")) {
          const json = JSON.parse(text) as Record<string, unknown>;
          const rawList = getQuestionsArrayFromResponse(json);
          const list = (Array.isArray(rawList) ? rawList : []) as Record<string, unknown>[];
          let normalized: QuestionItem[] = list.map((q, idx) => normalizeQuestionItem(q, idx));
          // 직업흥미검사(H) v2 형식(121~146): q=34일 때만. q=18(V1)은 1,2,3... 형식이므로 스킵
          const hasInterestH121Format = config.id === "interest_h" && normalized.some((q) => q.no === "121");
          if (config.id === "interest_h" && hasInterestH121Format) {
            const displayNoMap: Record<string, string> = {
              "121": "1-1", "122": "1-2", "123": "1-3", "124": "1-4", "125": "1-5", "126": "1-6", "127": "1-7", "128": "1-8",
              "129": "2-1", "130": "2-2", "131": "2-3",
              "132": "3-1", "133": "3-2",
              "134": "4-1", "135": "4-2",
              // 136: "5" 매핑 안 함 — 1~120에 이미 5번 있어 key 중복 방지. 렌더에서 q.no==="136"으로 5번 학교만족도 처리
              "137": "6-1", "138": "6-2", "139": "6-3", "140": "6-4", "141": "6-5", "142": "6-6", "143": "6-7", "144": "6-8", "145": "6-9",
            };
            const idx121 = normalized.findIndex((q) => q.no === "121");
            if (idx121 >= 0) {
              normalized[idx121] = {
                ...normalized[idx121],
                no: "1-1",
                question: "일상생활과 직업에서 필요로 하는 흥미들이 다양함을 알게 되었다.",
              };
            } else {
              const opt120 = normalized.find((q) => q.no === "120")?.answerOptions;
              normalized.push({
                no: "1-1",
                question: "일상생활과 직업에서 필요로 하는 흥미들이 다양함을 알게 되었다.",
                answerOptions: opt120 ?? [
                  { no: "1", content: "매우 싫어한다" },
                  { no: "2", content: "싫어한다" },
                  { no: "3", content: "보통이다" },
                  { no: "4", content: "좋아한다" },
                  { no: "5", content: "매우 좋아한다" },
                ],
              });
            }
            normalized = normalized.map((q) =>
              displayNoMap[q.no] ? { ...q, no: displayNoMap[q.no] } : q
            );
            // 2-2: ① 장래희망 전공분야를 결정하였다 / ② 아직 결정하지 않음
            // 2-3: 2-2에서 ① 선택 시에만 표시, 전공 분야 선택 (인문/사회/교육/공학/자연/의약/예체능)
            const idx2_2 = normalized.findIndex((x) => x.no === "2-2");
            if (idx2_2 >= 0) {
              normalized[idx2_2] = {
                ...normalized[idx2_2],
                question: "장래 진로를 결정하는 데 있어서 자신은 현재 어느 상태에 속한다고 생각합니까?",
                answerOptions: [
                  { no: "1", content: "장래희망 전공분야를 결정하였다" },
                  { no: "2", content: "아직 결정하지 않았다" },
                ],
              };
            }
            const idx2_3 = normalized.findIndex((x) => x.no === "2-3");
            if (idx2_3 >= 0) {
              normalized[idx2_3] = {
                ...normalized[idx2_3],
                question: "2-3 앞의 2-2번 문항에서 ①(장래희망 전공분야를 결정하였다)으로 응답한 경우, 희망하는 전공 분야는 무엇입니까?",
                answerOptions: [...INTEREST_H_2_3_OPTIONS],
              };
            }
            // 6-1~6-8 없으면 추가 (139~146)
            for (const subj of SECTION_6_SUBJECTS) {
              if (!normalized.some((q) => q.no === subj.key)) {
                normalized.push({
                  no: subj.key,
                  question: subj.name,
                  answerOptions: [...SECTION_6_OPTIONS],
                });
              } else {
                const idx = normalized.findIndex((q) => q.no === subj.key);
                if (idx >= 0) {
                  normalized[idx] = { ...normalized[idx], answerOptions: [...SECTION_6_OPTIONS] };
                }
              }
            }
          }
          if (!cancelled) {
            if (startDtmRef.current === null) startDtmRef.current = Date.now();
            setQuestions(normalized);
            if (normalized.length === 0) {
              setLoadError({
                statusCode: 200,
                error: "문항이 0건입니다.",
                detail: "RESULT가 비어 있거나 파싱된 문항이 없습니다. 응답 구조를 확인하세요.",
              });
            }
          }
          return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/xml");
        const err = doc.querySelector("parsererror");
        if (err) {
          if (!cancelled) {
            setQuestions([]);
            setLoadError({
              statusCode: 200,
              error: "XML 파싱 실패",
              detail: text.slice(0, 500),
            });
          }
          return;
        }

        const rows = doc.querySelectorAll("question, item, row");
        const list: QuestionItem[] = [];
        rows.forEach((el) => {
          const no = el.getAttribute("no") ?? el.querySelector("no, questionNo")?.textContent ?? "";
          const q = el.querySelector("question, questionContent, q")?.textContent ?? el.textContent ?? "";
          const opts: { no: string; content: string }[] = [];
          el.querySelectorAll("answer, option, choice").forEach((o) => {
            opts.push({
              no: o.getAttribute("no") ?? o.getAttribute("value") ?? "",
              content: o.textContent?.trim() ?? "",
            });
          });
          if (no || q) list.push({ no, question: q, answerOptions: opts.length ? opts : undefined });
        });
        if (list.length === 0) {
          const trs = doc.querySelectorAll("tr");
          trs.forEach((tr, i) => {
            const cells = tr.querySelectorAll("td");
            const q = cells[0]?.textContent?.trim();
            if (q) list.push({ no: String(i + 1), question: q });
          });
        }
        if (!cancelled) {
          if (list.length > 0 && startDtmRef.current === null) startDtmRef.current = Date.now();
          setQuestions(list);
          if (list.length === 0) {
            setLoadError({
              statusCode: 200,
              error: "XML에서 문항을 찾지 못함",
              detail: "question/item/row 요소가 없거나 비어 있습니다.",
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setQuestions([]);
          setLoadError({
            error: "문항 로드 중 예외 발생",
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    })();

    return () => { cancelled = true; };
  }, [testId, config]);

  // 저장 중 100초 초과 시 강제 해제 (멈춤 방지 - 직업흥미(K) 등 커리어넷 응답 지연 대비)
  useEffect(() => {
    if (!saving) return;
    const t = setTimeout(() => {
      setSaving(false);
      setSubmitError("저장이 너무 오래 걸립니다. 커리어넷 서버가 응답하지 않는 경우입니다. 10~20분 후 다시 시도하거나, 커리어넷 오픈API 관리 페이지에서 서비스 URL·이용 한도를 확인해 주세요.");
    }, 100000);
    return () => clearTimeout(t);
  }, [saving]);

  const handleSaveResult = async () => {
    if (!user || !config || saving) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setSubmitError("로그인 세션이 없습니다. 다시 로그인해 주세요.");
        setSaving(false);
        return;
      }

      const startDtm = startDtmRef.current ?? Date.now();

      const scoredQuestions = questions;

      // 제출 시: 점수 문항 중 하나라도 응답되지 않은 경우, 저장을 막고 안내
      // 2-3은 2-2에서 결정함(1) 선택 시에만 필수
      // 4-1, 4-2는 각각 1순위·2순위 두 값 필요
      const unansweredForSubmit = scoredQuestions.filter((q) => {
        if (q.no === "2-3" && answers["2-2"] === "2") return false; // 해당 없음
        if (config.id === "maturity" && MATURITY_36_NO_VALUES.has(answers["36"] ?? "") && MATURITY_SKIP_36_NOS.has(q.no))
          return false; // 36번 아니요 → 37~41 건너뜀
        if (q.no === "4-1") {
          const v1 = answers["4-1-1"], v2 = answers["4-1-2"];
          return !v1 || !v2 || String(v1).trim() === "" || String(v2).trim() === "";
        }
        if (q.no === "4-2") {
          const v1 = answers["4-2-1"], v2 = answers["4-2-2"];
          return !v1 || !v2 || String(v1).trim() === "" || String(v2).trim() === "";
        }
        if (q.no === "5" || q.no === "136") return !answers["5"] || String(answers["5"]).trim() === ""; // 5번 학교만족도
        if (q.no === "13" && config.id === "maturity") {
          const a = answers["13-1"], b = answers["13-2"];
          return !a || !b || String(a).trim() === "" || String(b).trim() === "";
        }
        if (q.no === "49" && config.id === "value") {
          const a = answers["49-1"], b = answers["49-2"], c = answers["49-3"];
          return !a || !b || !c || [a, b, c].some((x) => !String(x).trim());
        }
        const v = answers[q.no];
        return v == null || String(v).trim() === "";
      });
      if (unansweredForSubmit.length > 0) {
        const nums = unansweredForSubmit.slice(0, 10).map((q) => q.no).join(", ");
        setSubmitError(
          `아직 응답하지 않은 문항이 있습니다. (예: ${nums}${
            unansweredForSubmit.length > 10 ? " 등" : ""
          })`
        );
        setSaving(false);
        return;
      }

      // 1=5 2=4 3=1 형식(공백 구분). 가치관(q=25) 49번: 49=8,1,4 (쉼표 구분 3개, 매뉴얼 v4.0)
      let answersStr = scoredQuestions
            .map((q) => {
              const transmitNo = q.no;
              let val = answers[q.no];
              if (q.no === "2-3" && answers["2-2"] === "2") val = "-";
              if (config.id === "maturity" && MATURITY_36_NO_VALUES.has(answers["36"] ?? "") && MATURITY_SKIP_36_NOS.has(q.no))
                val = answers[q.no] ?? answers["36"] ?? "0"; // 37~41 자동 체크된 "아니요" 값
              if (q.no === "13" && config.id === "maturity") {
                const a = answers["13-1"], b = answers["13-2"];
                val = [a, b].filter(Boolean).join(",") || "";
              }
              if (q.no === "49" && config.id === "value") {
                const a = answers["49-1"], b = answers["49-2"], c = answers["49-3"];
                val = [a, b, c].filter(Boolean).join(",") || "";
              }
              // interest_h: 4-1은 4-1-1·4-1-2로 따로 보냄 / 4-2→136(콤마합침) / 136·5→137(만족도)
              if (config.id === "interest_h") {
                if (q.no === "4-2") {
                  const a = answers["4-2-1"], b = answers["4-2-2"];
                  val = [a, b].filter(Boolean).join(",") || "";
                }
                if (q.no === "136" || q.no === "5") val = answers["5"] ?? val;
              }
              const s = `${transmitNo}=${val ?? ""}`;
              return config.id === "interest_h" && q.no === "4-1" ? "" : s;
            })
            .filter(Boolean)
            .join(" ");
      // interest_h: 4-1-1·4-1-2 → 134(콤마합침), 4-2→135, 5→136, 6-1~6-8→137~144 (백엔드 매핑)
      if (config.id === "interest_h") {
        const v4_1_1 = answers["4-1-1"], v4_1_2 = answers["4-1-2"];
        if (v4_1_1 != null && !/4-1-1=/.test(answersStr))
          answersStr = (answersStr.trim() ? answersStr + " " : "") + `4-1-1=${v4_1_1}`;
        if (v4_1_2 != null && !/4-1-2=/.test(answersStr))
          answersStr = (answersStr.trim() ? answersStr + " " : "") + `4-1-2=${v4_1_2}`;
      }
      // 가치관 49번 예외: questions에 49가 없어도 49-1,49-2,49-3 선택 시 49=8,1,4 형식으로 반드시 전송
      if (config.id === "value" && !/49=/.test(answersStr)) {
        const a = answers["49-1"], b = answers["49-2"], c = answers["49-3"];
        if (a != null && b != null && c != null) {
          const val49 = [a, b, c].filter(Boolean).join(",");
          if (val49) answersStr = (answersStr.trim() ? answersStr + " " : "") + `49=${val49}`;
        }
      }

      if (config.id === "interest_h") {
        console.log("[interest_h] 제출할 answersStr:", answersStr);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 95000);

      const res = await safeFetch("/api/career-net/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: config.id,
          answers: answersStr,
          startDtm,
          questionCount: scoredQuestions.length,
          name: user.user_metadata?.full_name ?? user.email ?? undefined,
          gender: user.user_metadata?.gender === "100324" || user.user_metadata?.gender === "여" ? "100324" : user.user_metadata?.gender === "100323" || user.user_metadata?.gender === "남" ? "100323" : undefined,
          school: user.user_metadata?.school ?? undefined,
          grade: user.user_metadata?.grade ?? undefined,
        }),
        accessToken: token,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res) return;

      const text = await res.text();
      console.log("report API raw response:", text);
      let data: { error?: string; ERROR_REASON?: string; detail?: string; url?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: "서버 응답을 읽을 수 없습니다.", detail: text.slice(0, 200) };
      }

      if (!res.ok) {
        const msg = data.ERROR_REASON ?? data.error ?? "결과 제출에 실패했습니다.";
        const detail = data.detail ? ` (${data.detail})` : "";
        setSubmitError(msg + detail);
        setSaving(false);
        return;
      }
      if (data.ERROR_REASON != null && String(data.ERROR_REASON).trim() !== "") {
        setSubmitError(String(data.ERROR_REASON));
        setSaving(false);
        return;
      }

      // interest_k, interest_h: 200 OK면 응답 구조 검사 없이 성공 처리 — seq/url 조건에 걸려 멈춤 방지
      if (config.id === "interest_k" || config.id === "interest_h") {
        if (data.url && typeof data.url === "string") {
          window.open(data.url, "_blank", "noopener,noreferrer");
        }
        router.push("/career-dashboard");
        return;
      }

      // 커리어넷 원본 결과 URL이 있으면, 새 탭으로 열고
      // 우리 앱은 진로 대시보드로 이동하여 저장된 기록을 바로 확인할 수 있게 함
      if (data.url && typeof data.url === "string") {
        window.open(data.url, "_blank", "noopener,noreferrer");
        router.push("/career-dashboard");
        return;
      }

      // URL이 없으면 기존처럼 검사 목록으로 이동
      router.push("/career-tests");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSubmitError(`오류가 발생했습니다. ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-4">
        <div className="text-[var(--color-text-muted)] font-medium">로딩 중...</div>
      </main>
    );
  }

  if (!testId || !config) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-4">
        <p className="text-[var(--color-text-muted)]">잘못된 검사 경로입니다.</p>
        <Link href="/career-tests" className="mt-4 text-[var(--color-primary)] underline">
          진로심리검사 목록으로
        </Link>
      </main>
    );
  }

  /** 문항 번호 → 스크롤 대상 id (3-2→3-1, 4-2→4-1, 136→5번 블록 등) */
  const getScrollTargetId = (no: string): string => {
    if (no === "3-2") return "scroll-to-3-1";
    if (no === "4-2") return "scroll-to-4-1";
    if (no === "136") return "scroll-to-5"; // 5번 학교만족도 블록
    return `scroll-to-${no}`;
  };

  const scrollToQuestion = (no: string) => {
    const id = getScrollTargetId(no);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /** 문항별 응답 여부 (4-1/4-2/136 등 특수 케이스 반영) */
  const getIsAnswered = (q: QuestionItem): boolean => {
    if (config?.id === "maturity" && MATURITY_36_NO_VALUES.has(answers["36"] ?? "") && MATURITY_SKIP_36_NOS.has(q.no))
      return true; // 36번 아니요 → 37~41 해당없음(건너뜀)
    if (q.no === "4-1") {
      const v1 = answers["4-1-1"], v2 = answers["4-1-2"];
      return !!(v1 && v2 && String(v1).trim() && String(v2).trim());
    }
    if (q.no === "4-2") {
      const v1 = answers["4-2-1"], v2 = answers["4-2-2"];
      return !!(v1 && v2 && String(v1).trim() && String(v2).trim());
    }
    if (q.no === "5" || q.no === "136") return !!(answers["5"] && String(answers["5"]).trim());
    if (q.no === "13" && config?.id === "maturity") {
      const a = answers["13-1"], b = answers["13-2"];
      return !!(a && b && String(a).trim() && String(b).trim());
    }
    if (q.no === "49" && config?.id === "value") {
      const a = answers["49-1"], b = answers["49-2"], c = answers["49-3"];
      return !!(a && b && c && [a, b, c].every((x) => String(x).trim()));
    }
    if (q.no === "2-3" && answers["2-2"] === "2") return true; // 해당 없음
    const v = answers[q.no];
    return v != null && String(v).trim() !== "";
  };

  // 아직 응답하지 않은 문항(번호 순) - 전체 문항 기준
  const unansweredQuestions = questions.filter((q) => {
    if (config?.id === "maturity" && MATURITY_36_NO_VALUES.has(answers["36"] ?? "") && MATURITY_SKIP_36_NOS.has(q.no))
      return false; // 36번 아니요 → 37~41 건너뜀, 미응답에서 제외
    if (q.no === "4-1") {
      const v1 = answers["4-1-1"], v2 = answers["4-1-2"];
      return !v1 || !v2 || String(v1).trim() === "" || String(v2).trim() === "";
    }
    if (q.no === "4-2") {
      const v1 = answers["4-2-1"], v2 = answers["4-2-2"];
      return !v1 || !v2 || String(v1).trim() === "" || String(v2).trim() === "";
    }
    if (q.no === "5" || q.no === "136") return !answers["5"] || String(answers["5"]).trim() === ""; // 5번 학교만족도
    if (q.no === "13" && config?.id === "maturity") {
      const a = answers["13-1"], b = answers["13-2"];
      return !a || !b || [a, b].some((x) => !String(x).trim());
    }
    if (q.no === "49" && config?.id === "value") {
      const a = answers["49-1"], b = answers["49-2"], c = answers["49-3"];
      return !a || !b || !c || [a, b, c].some((x) => !String(x).trim());
    }
    if (config?.id === "interest_h" && Number(q.no) > 138 && !SECTION_6_SUBJECTS.some((s) => s.key === q.no))
      return false; // 139+ 중 6-x 외 문항 숨김
    const v = answers[q.no];
    return v == null || String(v).trim() === "";
  });

  return (
    <div className="platform-layout">
      <header className="header">
        <div className="header-inner">
          <h1>진로 학습플랫폼</h1>
          <p className="subtitle">{config.name} (고등학생용)</p>
          <Link href="/career-tests" className="text-xs text-white/90 hover:text-white underline mt-2 inline-block">
            ← 검사 목록
          </Link>
        </div>
      </header>

      <div
        className="nav-content-panel topic-content-inner"
        style={{ margin: "0 auto 2rem", maxWidth: "1100px" }}
      >
        {loadingQuestions ? (
          <p className="text-[var(--color-text-muted)]">문항을 불러오는 중...</p>
        ) : questions.length === 0 ? (
          <div>
            <div className="text-red-600 text-sm space-y-2 mb-4">
              <p className="font-semibold">문항 로드 실패</p>
              {loadError?.statusCode != null && (
                <p>상태 코드: {loadError.statusCode}</p>
              )}
              {loadError?.error && (
                <p>에러: {loadError.error}</p>
              )}
              {loadError?.detail && (
                <p className="break-words">상세: {loadError.detail}</p>
              )}
              {!loadError && (
                <p>API 키와 검사 번호를 확인해 주세요.</p>
              )}
            </div>
            <Link href="/career-tests" className="text-[var(--color-primary)] underline mt-2 inline-block">
              검사 목록으로
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 260px",
              gap: "1.5rem",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2 className="section-title">{config.name}</h2>
              <p className="section-desc">총 {questions.length}문항. 응답 후 하단에서 제출해 주세요.</p>

              <ol className="career-test-questions">
                {questions.flatMap((q, qIndex) => {
                  const items: React.ReactNode[] = [];
                  if (q.no === "1-1" && config.id === "interest_h") {
                    items.push(
                      <li
                        key="intro-before-1-1"
                        className="career-test-intro"
                        style={{ listStyle: "none", marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "var(--color-bg)", borderRadius: "0.5rem", fontSize: "0.95rem", lineHeight: 1.6 }}
                      >
                        <span className="career-test-intro-num">①</span> 아래 질문은 여러분이 흥미검사를 치르는 동안에 가졌던 생각과 느낌을 알아보기 위한 것입니다. 여러분의 솔직한 응답을 부탁드립니다.
                      </li>
                    );
                  }
                  if (q.no === "2-1" && config.id === "interest_h") {
                    items.push(
                      <li
                        key="intro-before-2-1"
                        className="career-test-intro"
                        style={{ listStyle: "none", marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "var(--color-bg)", borderRadius: "0.5rem", fontSize: "0.95rem", lineHeight: 1.6 }}
                      >
                        <span className="career-test-intro-num">②</span> 장래 진로를 결정하는 데 있어서 자신은 현재 어느 상태에 속한다고 생각합니까?
                      </li>
                    );
                  }
                  if (q.no === "3-1" && config.id === "interest_h") {
                    items.push(
                      <li
                        key="intro-before-3-1"
                        className="career-test-intro"
                        style={{ listStyle: "none", marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "var(--color-bg)", borderRadius: "0.5rem", fontSize: "0.95rem", lineHeight: 1.6 }}
                      >
                        <span className="career-test-intro-num">③</span> 다음은 우리나라의 주요 직업입니다. 아래 표에서 나의 희망 직업을 찾아 선택해 주세요. 61번(기타)을 선택한 경우에는 직업명을 직접 작성해 주세요.
                      </li>
                    );
                  }
                  // 3-1과 3-2: 세로 배치 + 직업 선택 모달
                  if (q.no === "3-1" && config.id === "interest_h") {
                    const q3_2 = questions.find((x) => x.no === "3-2");
                    items.push(
                      <li key="3-1-3-2-combined" id="scroll-to-3-1" className="career-test-question-item">
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                          <div>
                            <span className="career-test-q-label">3-1. {q.question}</span>
                            <div style={{ marginTop: "0.5rem" }}>
                              <JobSelectInput
                                value={answers["3-1"] ?? ""}
                                onChange={(v) => setAnswers((prev) => ({ ...prev, "3-1": v }))}
                                placeholder="직업을 선택해 주세요."
                                id="q_3-1"
                                label="3-1 나의 희망 직업"
                              />
                            </div>
                          </div>
                          {q3_2 && (
                            <div>
                              <span className="career-test-q-label">3-2. {q3_2.question}</span>
                              <div style={{ marginTop: "0.5rem" }}>
                                <JobSelectInput
                                  value={answers["3-2"] ?? ""}
                                  onChange={(v) => setAnswers((prev) => ({ ...prev, "3-2": v }))}
                                  placeholder="직업을 선택해 주세요."
                                  id="q_3-2"
                                  label="3-2 부모님이 원하는 나의 직업"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                    return items;
                  }
                  if (q.no === "3-2" && config.id === "interest_h") return items; // 3-1에서 함께 렌더링됨
                  if (q.no === "4-1" && config.id === "interest_h") {
                    const q4_2 = questions.find((x) => x.no === "4-2");
                    items.push(
                      <li
                        key="intro-before-4-1"
                        className="career-test-intro"
                        style={{ listStyle: "none", marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "var(--color-bg)", borderRadius: "0.5rem", fontSize: "0.95rem", lineHeight: 1.6 }}
                      >
                        <span className="career-test-intro-num">④</span> 가장 좋아하는 과목 / 가장 싫어하는 과목 (각 1순위, 2순위 작성)
                      </li>
                    );
                    items.push(
                      <li key="4-1-4-2-block" id="scroll-to-4-1" className="career-test-question-item">
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                          <div>
                            <span className="career-test-q-label">4-1. 가장 좋아하는 과목 (1순위, 2순위 작성)</span>
                            <div style={{ marginTop: "0.5rem" }}>
                              <SubjectSelectInput
                                valueFirst={answers["4-1-1"] ?? ""}
                                valueSecond={answers["4-1-2"] ?? ""}
                                onFirstChange={(v) => setAnswers((prev) => ({ ...prev, "4-1-1": v }))}
                                onSecondChange={(v) => setAnswers((prev) => ({ ...prev, "4-1-2": v }))}
                                placeholder="1순위, 2순위 과목 선택"
                                id="q_4-1"
                                label="4-1 가장 좋아하는 과목(1순위, 2순위 작성)"
                              />
                            </div>
                          </div>
                          {q4_2 && (
                            <div>
                              <span className="career-test-q-label">4-2. 가장 싫어하는 과목 (1순위, 2순위 작성)</span>
                              <div style={{ marginTop: "0.5rem" }}>
                                <SubjectSelectInput
                                  valueFirst={answers["4-2-1"] ?? ""}
                                  valueSecond={answers["4-2-2"] ?? ""}
                                  onFirstChange={(v) => setAnswers((prev) => ({ ...prev, "4-2-1": v }))}
                                  onSecondChange={(v) => setAnswers((prev) => ({ ...prev, "4-2-2": v }))}
                                  placeholder="1순위, 2순위 과목 선택"
                                  id="q_4-2"
                                  label="4-2 가장 싫어하는 과목(1순위, 2순위 작성)"
                                  allowCustomForOther
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                    return items;
                  }
                  if (q.no === "4-2" && config.id === "interest_h") return items; // 4-1에서 함께 렌더링됨
                  if ((q.no === "5" || q.no === "136") && config.id === "interest_h") {
                    items.push(
                      <li
                        key={`intro-before-5-${qIndex}`}
                        className="career-test-intro"
                        style={{ listStyle: "none", marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "var(--color-bg)", borderRadius: "0.5rem", fontSize: "0.95rem", lineHeight: 1.6 }}
                      >
                        <span className="career-test-intro-num">⑤</span> 귀하는 현재 학교생활에 대해 어느 정도 만족하십니까?
                      </li>
                    );
                    items.push(
                      <li key={`5-block-${qIndex}`} id="scroll-to-5" className="career-test-question-item">
                        <span className="career-test-q-label">5. 귀하는 현재 학교생활에 대해 어느 정도 만족하십니까?</span>
                        {q.answerOptions?.length ? (
                          <div className="career-test-options">
                            {q.answerOptions.map((opt) => {
                              const inputId = `q_5_opt_${opt.no}`;
                              return (
                                <label key={`5-opt-${opt.no}`} className="career-test-option" htmlFor={inputId}>
                                  <input
                                    id={inputId}
                                    type="radio"
                                    name="q_5"
                                    value={opt.no}
                                    checked={answers["5"] === opt.no}
                                    onChange={() => setAnswers((prev) => ({ ...prev, "5": opt.no }))}
                                  />
                                  <span>{opt.content || opt.no}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <input
                            type="text"
                            className="career-test-input"
                            value={answers["5"] ?? ""}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, "5": e.target.value }))}
                            placeholder="응답 입력"
                          />
                        )}
                      </li>
                    );
                    return items;
                  }
                  if (q.no === "6-1" && config.id === "interest_h") {
                    const first6_1Index = questions.findIndex((x) => x.no === "6-1");
                    if (first6_1Index === qIndex) {
                      items.push(
                        <li
                          key="intro-before-6-1"
                          className="career-test-intro"
                          style={{ listStyle: "none", marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "var(--color-bg)", borderRadius: "0.5rem", fontSize: "0.95rem", lineHeight: 1.6 }}
                        >
                          <span className="career-test-intro-num">⑥</span> 자신의 학업성적이 과목별로 대략 어느 범위에 속한다고 생각하십니까?
                        </li>
                      );
                      for (const subj of SECTION_6_SUBJECTS) {
                        items.push(
                          <li key={`section6-${subj.key}`} id={`scroll-to-${subj.key}`} className="career-test-question-item">
                          <span className="career-test-q-label">
                            {subj.key}. {subj.name}
                          </span>
                          <div className="career-test-options">
                            {SECTION_6_OPTIONS.map((opt) => {
                              const inputId = `q_${subj.key}_opt_${opt.no}`;
                              return (
                                <label key={opt.no} className="career-test-option" htmlFor={inputId}>
                                  <input
                                    id={inputId}
                                    type="radio"
                                    name={`q_${subj.key}`}
                                    value={opt.no}
                                    checked={answers[subj.key] === opt.no}
                                    onChange={() => setAnswers((prev) => ({ ...prev, [subj.key]: opt.no }))}
                                  />
                                  <span>{opt.content}</span>
                                </label>
                              );
                            })}
                          </div>
                        </li>
                      );
                      }
                    }
                    return items;
                  }
                  if (
                    config.id === "interest_h" &&
                    (SECTION_6_SUBJECTS.some((s) => s.key === q.no) ? q.no !== "6-1" : Number(q.no) > 138)
                  ) {
                    return items; // 6-2~6-8은 6-1 블록에서 렌더링, 139+ 나머지 API 문항은 숨김
                  }
                  // 진로성숙도 36번 '아니요' → 37~41 건너뛰고 42번으로
                  if (
                    config.id === "maturity" &&
                    MATURITY_36_NO_VALUES.has(answers["36"] ?? "") &&
                    MATURITY_SKIP_36_NOS.has(q.no)
                  ) {
                    return items;
                  }
                  // 진로성숙도 13번: 직업군 1순위·2순위 선택 (API: 13=1,8 형식)
                  if (q.no === "13" && config.id === "maturity") {
                    const r1 = answers["13-1"];
                    const r2 = answers["13-2"];
                    const opts = q.answerOptions ?? [];
                    const toggleRank = (optNo: string, rank: 1 | 2) => {
                      const key = `13-${rank}` as "13-1" | "13-2";
                      if (answers[key] === optNo) {
                        setAnswers((p) => {
                          const next = { ...p };
                          delete next[key];
                          return next;
                        });
                      } else {
                        setAnswers((p) => ({ ...p, [key]: optNo }));
                      }
                    };
                    items.push(
                      <li key={`13-block-${qIndex}`} id="scroll-to-13" className="career-test-question-item">
                        <span className="career-test-q-label">
                          {q.no}. 다양한 직업군을 나타낸 것입니다. 관심이 있는 직업군 1순위와 2순위를 고르세요
                        </span>
                        <div className="career-test-options" style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                          {opts.map((opt) => {
                            const rank = r1 === opt.no ? 1 : r2 === opt.no ? 2 : null;
                            const isSelected = rank != null;
                            return (
                              <label
                                key={opt.no}
                                className="career-test-option"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  padding: "0.5rem 0.75rem",
                                  backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-card)",
                                  color: isSelected ? "white" : "var(--color-text)",
                                  borderRadius: "var(--radius)",
                                  border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`q_13_rank_${rank ?? "pick"}`}
                                  checked={isSelected}
                                  onChange={() => {
                                    if (rank) toggleRank(opt.no, rank);
                                    else if (!r1) setAnswers((p) => ({ ...p, "13-1": opt.no }));
                                    else if (!r2 && r1 !== opt.no) setAnswers((p) => ({ ...p, "13-2": opt.no }));
                                    else if (r1 && r2 && r1 !== opt.no) setAnswers((p) => ({ ...p, "13-2": opt.no }));
                                  }}
                                />
                                <span>{opt.content || opt.no}</span>
                                {rank != null && (
                                  <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>({rank}순위)</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                        {(r1 || r2) && (
                          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                            1순위: {opts.find((o) => o.no === r1)?.content ?? r1}
                            {r2 && " / 2순위: " + (opts.find((o) => o.no === r2)?.content ?? r2)}
                          </p>
                        )}
                      </li>
                    );
                    return items;
                  }
                  // 직업적성검사: 7점 척도 (커리어넷 원본 레이아웃)
                  if (config.id === "aptitude") {
                    if (q.no === "1") {
                      items.push(
                        <li
                          key="intro-aptitude-1"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>신체·운동능력</div>
                          기초체력을 바탕으로 효율적으로 몸을 움직이고 동작을 학습할 수 있는 능력 나의 신체·운동능력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "9") {
                      items.push(
                        <li
                          key="intro-aptitude-9"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>손재능</div>
                          손으로 정교한 작업을 할 수 있는 능력 나의 손재능은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "17") {
                      items.push(
                        <li
                          key="intro-aptitude-17"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>공간지각력</div>
                          머릿속으로 입체적인 물체의 위치나 모습을 상상하여 떠올릴 수 있는 능력 나의 공간지각력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "25") {
                      items.push(
                        <li
                          key="intro-aptitude-25"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>음악능력</div>
                          노래부르고, 악기를 연주하며, 감상할 수 있는 능력 나의 음악능력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "33") {
                      items.push(
                        <li
                          key="intro-aptitude-33"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>창의력</div>
                          새롭고 독특한 방식으로 문제를 해결하고, 아이디어를 내는 능력 나의 창의력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "41") {
                      items.push(
                        <li
                          key="intro-aptitude-41"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>언어능력</div>
                          말과 글로써 자신의 생각과 감정을 표현하며, 다른 사람의 말과 글을 잘 이해할 수 있는 능력 나의 언어능력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "49") {
                      items.push(
                        <li
                          key="intro-aptitude-49"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>수리·논리력</div>
                          논리적으로 사고하여 문제를 해결하는 능력 나의 수리·논리력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "57") {
                      items.push(
                        <li
                          key="intro-aptitude-57"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>자기성찰능력</div>
                          자신을 돌아보고, 생각과 감정을 조절하며, 자신에게 주어진 여러 자원을 관리하는 능력 나의 자기성찰능력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "65") {
                      items.push(
                        <li
                          key="intro-aptitude-65"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>대인관계능력</div>
                          조직 속에서 구성원들과 협조적이며 원만한 관계를 유지하는 능력 나의 대인관계능력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "73") {
                      items.push(
                        <li
                          key="intro-aptitude-73"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>자연친화력</div>
                          인간과 자연이 서로 연관되어 있음을 이해하며, 자연에 대하여 관심을 가지고 탐구ㆍ보호할 수 있는 능력 나의 자연친화력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    if (q.no === "81") {
                      items.push(
                        <li
                          key="intro-aptitude-81"
                          className="career-test-intro"
                          style={{
                            listStyle: "none",
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "var(--color-bg)",
                            borderRadius: "0.5rem",
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "var(--color-text)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>예술시각능력</div>
                          선, 색, 공간, 영상 등에 민감하게 반응하고 조화롭게 재구성할 수 있는 능력 나의 예술시각능력은 어느 정도일까요? 해당되는 번호를 선택하세요.
                        </li>
                      );
                    }
                    const pointDesc = getAptitudeDescriptionsForQuestion(q.no, q.question);
                    const leftRight = getAptitudeLeftRight(q.no, q.question);
                    const scalePoints = Array.from(
                      { length: APTITUDE_SCALE_MAX - APTITUDE_SCALE_MIN + 1 },
                      (_, i) => APTITUDE_SCALE_MIN + i
                    );
                    const selectedVal = answers[q.no];
                    const gridCols = "repeat(7, minmax(0, 1fr))";
                    items.push(
                      <li
                        key={`aptitude-${q.no}-${qIndex}`}
                        id={`scroll-to-${q.no}`}
                        className="career-test-question-item"
                        style={{
                          background: "var(--color-card)",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1.5rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "var(--color-primary)",
                              color: "white",
                              fontWeight: 600,
                              fontSize: "0.9rem",
                              flexShrink: 0,
                            }}
                          >
                            {q.no}
                          </span>
                          <span className="career-test-q-label" style={{ fontSize: "1rem", lineHeight: 1.5, marginTop: 2 }}>
                            {q.question}
                          </span>
                        </div>
                        {APTITUDE_QUESTION_PROBLEM_BOX[q.no] && (() => {
                          const box = APTITUDE_QUESTION_PROBLEM_BOX[q.no];
                          const problemItems = "problems" in box ? box.problems : [box];
                          return (
                            <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                              {problemItems.map((p: { title: string; lines: string[]; answer?: string }, idx: number) => (
                                <div
                                  key={idx}
                                  style={{
                                    flex: problemItems.length > 1 ? "1 1 200px" : "1 1 100%",
                                    padding: "1rem 1.25rem",
                                    background: "#f8fafc",
                                    borderRadius: "10px",
                                    border: "1px solid var(--color-border)",
                                    fontSize: "0.9rem",
                                    lineHeight: 1.6,
                                    color: "var(--color-text)",
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: "var(--color-primary)", marginBottom: "0.5rem" }}>
                                    {p.title}
                                  </div>
                                  {p.lines.map((line: string, i: number) => (
                                    <div key={i}>{line}</div>
                                  ))}
                                  {p.answer && (
                                    <div style={{ marginTop: "0.5rem", fontWeight: 500 }}>
                                      답: {p.answer}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div style={{ position: "relative", paddingBottom: "2rem" }}>
                          {leftRight ? (
                            /* 4-6번: 글자 → 화살표 → 숫자 모두 동일 열에 세로 정렬 */
                            <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0.25rem", marginBottom: "0.5rem", minHeight: "3.5rem", alignItems: "end" }}>
                              {scalePoints.map((n) => {
                                const isLeft = n === leftRight.leftPoint;
                                const isRight = n === leftRight.rightPoint;
                                const desc = isLeft ? leftRight.left : isRight ? leftRight.right : null;
                                return (
                                  <div key={`desc-${n}`} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-end", minWidth: 0, textAlign: "center" }}>
                                    {desc ? (
                                      <>
                                        <span style={{ display: "block", width: "100%", fontSize: "0.75rem", lineHeight: 1.35, color: "var(--color-text-muted)", marginBottom: "0.2rem", textAlign: "center", wordBreak: "keep-all" }}>
                                          {desc}
                                        </span>
                                        <div style={{ display: "flex", justifyContent: "center" }}>
                                          <span style={{ color: "var(--color-primary)", fontSize: "0.9rem" }}>▼</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ display: "flex", justifyContent: "center" }}>
                                        <span style={{ opacity: 0, fontSize: "0.9rem" }}>·</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* 1-3번: 점수별 설명 형식 - 7열 그리드로 화살표↔원 정렬 */
                            <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0.25rem", marginBottom: "0.5rem", minHeight: "3rem", alignItems: "end" }}>
                              {scalePoints.map((n) => {
                                const desc = pointDesc?.[n];
                                return (
                                  <div key={`desc-${n}`} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-end", minWidth: 0, textAlign: "center" }}>
                                    {desc ? (
                                      <>
                                        <span style={{ display: "block", width: "100%", fontSize: "0.75rem", lineHeight: 1.35, color: "var(--color-text-muted)", marginBottom: "0.2rem", textAlign: "center", wordBreak: "keep-all" }}>
                                          {desc}
                                        </span>
                                        <div style={{ display: "flex", justifyContent: "center" }}>
                                          <span style={{ color: "var(--color-primary)", fontSize: "0.9rem" }}>▼</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ display: "flex", justifyContent: "center" }}>
                                        <span style={{ color: "transparent", fontSize: "0.9rem" }}>·</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* 가로선 + 원형 버튼 - 동일 7열 그리드, 글자·화살표·숫자 수직 정렬 */}
                          <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "0.25rem", alignItems: "center", justifyItems: "center", marginBottom: "0.75rem", position: "relative" }}>
                            <div
                              style={{
                                position: "absolute",
                                left: "4%",
                                right: "4%",
                                top: "50%",
                                marginTop: -1,
                                height: 2,
                                background: "#d1d5db",
                                borderRadius: 1,
                                zIndex: 0,
                                pointerEvents: "none",
                              }}
                            />
                            {scalePoints.map((n) => {
                              const isSelected = selectedVal === String(n);
                              return (
                                <label
                                  key={n}
                                  style={{
                                    position: "relative",
                                    zIndex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 36,
                                    height: 36,
                                    margin: "0 auto",
                                    borderRadius: "50%",
                                    border: `2px solid ${isSelected ? "var(--color-primary)" : "#9ca3af"}`,
                                    background: isSelected ? "var(--color-primary)" : "#f3f4f6",
                                    color: isSelected ? "white" : "var(--color-text)",
                                    fontWeight: 600,
                                    fontSize: "0.95rem",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`q_${q.no}`}
                                    value={n}
                                    checked={isSelected}
                                    onChange={() => setAnswers((prev) => ({ ...prev, [q.no]: String(n) }))}
                                    style={{ display: "none" }}
                                  />
                                  {n}
                                </label>
                              );
                            })}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            <span>{APTITUDE_SCALE_LABEL_LOW}</span>
                            <span>{APTITUDE_SCALE_LABEL_HIGH}</span>
                          </div>
                        </div>
                      </li>
                    );
                    return items;
                  }
                  // 직업가치관 49번: 12가치 그리드에서 3개 순위 선택
                  if (q.no === "49" && config.id === "value") {
                    const r1 = answers["49-1"], r2 = answers["49-2"], r3 = answers["49-3"];
                    const selected = [r1, r2, r3].filter(Boolean).map(Number);
                    const toggleRank = (valId: number, rank: 1 | 2 | 3) => {
                      const key = `49-${rank}` as "49-1" | "49-2" | "49-3";
                      if (answers[key] === String(valId)) {
                        setAnswers((p) => {
                          const next = { ...p };
                          if (rank === 1) delete next["49-1"];
                          else if (rank === 2) delete next["49-2"];
                          else delete next["49-3"];
                          return next;
                        });
                      } else {
                        setAnswers((p) => ({ ...p, [key]: String(valId) }));
                      }
                    };
                    items.push(
                      <li key={`49-block-${qIndex}`} id="scroll-to-49" className="career-test-question-item">
                        <span className="career-test-q-label">{q.no}. {q.question}</span>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "0.75rem",
                            marginTop: "1rem",
                          }}
                        >
                          {VALUE_49_ITEMS.map((v) => {
                            const rank = r1 === String(v.id) ? 1 : r2 === String(v.id) ? 2 : r3 === String(v.id) ? 3 : null;
                            const isSelected = selected.includes(v.id);
                            return (
                              <div
                                key={v.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  if (rank) toggleRank(v.id, rank);
                                  else if (!r1) setAnswers((p) => ({ ...p, "49-1": String(v.id) }));
                                  else if (!r2) setAnswers((p) => ({ ...p, "49-2": String(v.id) }));
                                  else if (!r3) setAnswers((p) => ({ ...p, "49-3": String(v.id) }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter") return;
                                  if (rank) toggleRank(v.id, rank);
                                  else if (!r1) setAnswers((p) => ({ ...p, "49-1": String(v.id) }));
                                  else if (!r2) setAnswers((p) => ({ ...p, "49-2": String(v.id) }));
                                  else if (!r3) setAnswers((p) => ({ ...p, "49-3": String(v.id) }));
                                }}
                                style={{
                                  padding: "1rem",
                                  backgroundColor: isSelected ? "var(--color-primary)" : "var(--color-card)",
                                  color: isSelected ? "white" : "var(--color-text)",
                                  borderRadius: "var(--radius)",
                                  border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                                  cursor: "pointer",
                                  textAlign: "center",
                                  fontWeight: 600,
                                  boxShadow: "var(--shadow)",
                                }}
                              >
                                <span style={{ fontSize: "0.85rem" }}>{v.name}</span>
                                {rank != null && (
                                  <span style={{ display: "block", fontSize: "0.7rem", marginTop: "0.25rem", opacity: 0.9 }}>
                                    {rank}순위
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            marginTop: "1rem",
                            padding: "1rem",
                            border: "1px solid var(--color-primary)",
                            borderRadius: "var(--radius)",
                            backgroundColor: "rgba(91,124,153,0.06)",
                            fontSize: "0.85rem",
                            lineHeight: 1.8,
                          }}
                        >
                          {VALUE_49_ITEMS.map((v) => (
                            <div key={v.id} style={{ marginBottom: "0.5rem" }}>
                              <strong style={{ color: "var(--color-primary)" }}>{v.name}:</strong> {v.desc}
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                    return items;
                  }
                  const is2_3Hidden = q.no === "2-3" && answers["2-2"] === "2";
                  // 진로성숙도 36번: "아니요" 선택 시 37~41 자동 체크
                  const isMaturity36 = q.no === "36" && config.id === "maturity";
                  const handleMaturity36Change = (optNo: string) => {
                    setAnswers((prev) => {
                      const next = { ...prev, [q.no]: optNo };
                      if (MATURITY_36_NO_VALUES.has(optNo)) {
                        for (const n of ["37", "38", "39", "40", "41"]) next[n] = optNo;
                      } else {
                        for (const n of ["37", "38", "39", "40", "41"]) delete next[n];
                      }
                      return next;
                    });
                  };
                  items.push(
                    <li
                      key={`${q.no}-${qIndex}`}
                      id={`scroll-to-${q.no}`}
                      className="career-test-question-item"
                      style={is2_3Hidden ? { opacity: 0.7 } : undefined}
                    >
                      <span className="career-test-q-label">
                        {q.no}. {q.question}
                      </span>
                    {is2_3Hidden ? (
                      <p className="text-sm text-[var(--color-text-muted)]">해당 없음 (2-2에서 ① 장래희망 전공분야를 결정하였다 선택 시에만 응답)</p>
                    ) : q.answerOptions?.length ? (
                      <div className="career-test-options">
                        {q.answerOptions.map((opt) => {
                          const inputId = `q_${q.no}_opt_${opt.no}`;
                          const onChangeHandler = isMaturity36
                            ? () => handleMaturity36Change(opt.no)
                            : () => setAnswers((prev) => ({ ...prev, [q.no]: opt.no }));
                          return (
                            <label key={opt.no} className="career-test-option" htmlFor={inputId}>
                              <input
                                id={inputId}
                                type="radio"
                                name={`q_${q.no}`}
                                value={opt.no}
                                checked={answers[q.no] === opt.no}
                                onChange={onChangeHandler}
                              />
                              <span>{opt.content || opt.no}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="career-test-input"
                        value={answers[q.no] ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.no]: e.target.value }))}
                        placeholder="응답 입력"
                      />
                    )}
                  </li>
                  );
                  return items;
                })}
              </ol>

              {submitError && (
                <p className="text-red-600 text-sm mb-4 break-words whitespace-pre-wrap">{submitError}</p>
              )}
              <div className="career-tests-dashboard-wrap">
                <button
                  type="button"
                  className="viz-save-btn"
                  onClick={handleSaveResult}
                  disabled={saving}
                >
                  {saving ? "저장 중…" : "검사 완료하고 결과 저장"}
                </button>
                <p className="section-desc" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                  결과는 AI 진로 피드백 및 종합 대시보드에서 활용됩니다.
                </p>
              </div>
            </div>

            {/* 오른쪽: 문항/응답 현황 (선택지 스타일과 통일) */}
            <aside
              className="career-test-status-panel"
              style={{
                position: "sticky",
                top: "5rem",
                alignSelf: "flex-start",
              }}
            >
              <p className="text-xs mb-2 font-semibold text-[var(--color-text)]">문항 / 응답 현황</p>
              <div className="career-test-status-table">
                <div className="career-test-status-row career-test-status-header">
                  <span>문항</span>
                  <span>응답</span>
                </div>
                {questions
                  .filter((q) => q.no !== "137" && q.no !== "138")
                  .map((q) => {
                    const isAnswered = getIsAnswered(q);
                    const isNa = q.no === "2-3" && answers["2-2"] === "2";
                    return (
                      <div
                        key={q.no}
                        role="button"
                        tabIndex={0}
                        onClick={() => scrollToQuestion(q.no)}
                        onKeyDown={(e) => e.key === "Enter" && scrollToQuestion(q.no)}
                        className="career-test-status-row career-test-status-row-clickable"
                      >
                        <span className={!isAnswered && !isNa ? "text-red-600" : ""}>{q.no}</span>
                        <span
                          className={
                            isAnswered || isNa
                              ? "font-bold text-[var(--color-primary)]"
                              : "text-red-600"
                          }
                        >
                          {isNa ? "－" : isAnswered ? "O" : ""}
                        </span>
                      </div>
                    );
                  })}
              </div>
              {unansweredQuestions.length > 0 && (
                <p className="text-[0.7rem] text-red-600 mt-2">
                  미응답 문항이 있습니다. 모든 문항에 O가 되도록 응답 후 제출해 주세요.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>특성화고등학교 진로 학습플랫폼</p>
      </footer>
    </div>
  );
}
