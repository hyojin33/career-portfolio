"use client";

import { useAuth } from "@/components/AuthProvider";
import { AiFeedbackCard } from "@/components/AiFeedbackCard";
import { isAbortOrCancelError } from "@/lib/isAbortError";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { CAREER_TESTS } from "@/types/careerTests";

type StoredResult = {
  test_id: string;
  completed_at: string;
  summary: Record<string, unknown>;
  raw_result?: Record<string, unknown> | null;
};

// 커리어넷 원본 JSON 구조를 검사별로 파싱하기 위한 맵
// path: raw_result에서 점수 배열까지 도달하기 위한 경로
// nameKey: 각 항목에서 영역 이름 필드명
// scoreKey: 각 항목에서 점수 필드명
// title: 화면에 표시할 검사 명칭
const TEST_MAP: Record<string, { path: string[]; nameKey: string; scoreKey: string; title: string }> = {
  maturity: {
    path: ["result", "realms"],
    nameKey: "name",
    scoreKey: "t",
    title: "진로성숙도",
  },
  interest_h: {
    path: ["result", "wonscore"],
    nameKey: "type",
    scoreKey: "score",
    title: "직업흥미(H)",
  },
  interest_k: {
    path: ["result", "wonscore"],
    nameKey: "type",
    scoreKey: "score",
    title: "직업흥미(K)",
  },
  value: {
    path: ["result", "valueScores"],
    nameKey: "name",
    scoreKey: "score",
    title: "직업가치관",
  },
  aptitude: {
    path: ["result", "aptitudeScores"],
    nameKey: "area",
    scoreKey: "score",
    title: "직업적성검사",
  },
  competency: {
    path: ["result", "competencyScores"],
    nameKey: "name",
    scoreKey: "score",
    title: "진로개발역량",
  },
};

function getNestedArray(obj: unknown, path: string[]): any[] | null {
  if (!obj || typeof obj !== "object") return null;
  let cur: any = obj;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return null;
    // 대소문자 구분 없이 키를 찾습니다 (예: result 또는 RESULT)
    cur = cur[key] || cur[key.toUpperCase()] || cur[key.toLowerCase()];
  }
  return Array.isArray(cur) ? cur : null;
}

const CAREER_ATTACHMENTS_BUCKET = "career-attachments";

/** Storage에 저장된 파일 정보 (경로 = 삭제/다운로드 시 사용) */
type StoredFileItem = { name: string; path: string };

export default function CareerDashboardPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<StoredResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  /** 검사별 Storage에 저장된 파일 목록 (test_id -> StoredFileItem[]) */
  const [storedFiles, setStoredFiles] = useState<Record<string, StoredFileItem[]>>({});
  const [loadingStoredFiles, setLoadingStoredFiles] = useState(false);
  /** 업로드 중인 검사 id (로딩 표시용) */
  const [uploadingTestId, setUploadingTestId] = useState<string | null>(null);
  /** 업로드/저장 에러 메시지 */
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>("");
  const [loadingAiFeedback, setLoadingAiFeedback] = useState(false);
  const [activeSection, setActiveSection] = useState<"현황" | "ai피드백">("현황");
  /** 저장된 AI 피드백 기록 */
  const [aiFeedbackRecords, setAiFeedbackRecords] = useState<{ id: string; feedback: string; created_at: string; test_names?: string | null }[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  useEffect(() => {
    if (searchParams.get("tab") === "ai") setActiveSection("ai피드백");
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase
          .from("career_test_results")
          .select("test_id, completed_at, summary, raw_result")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false });
        if (!cancelled) {
          setResults((data as StoredResult[]) ?? []);
        }
      } finally {
        if (!cancelled) setLoadingResults(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /** Storage에 저장된 검사별 파일 목록 로드 (취소 시 setState 생략) */
  const loadStoredFiles = useCallback(async (signal?: { aborted: boolean }) => {
    if (!user) return;
    setLoadingStoredFiles(true);
    const supabase = getSupabaseClient();
    const next: Record<string, StoredFileItem[]> = {};
    try {
      for (const test of CAREER_TESTS) {
        if (signal?.aborted) return;
        const folderPath = `${user.id}/${test.id}`;
        const { data: files } = await supabase.storage
          .from(CAREER_ATTACHMENTS_BUCKET)
          .list(folderPath, { limit: 100 });
        const items: StoredFileItem[] = (files ?? [])
          .filter((f) => f.name)
          .map((f) => ({
            name: f.name,
            path: `${folderPath}/${f.name}`,
          }));
        next[test.id] = items;
      }
      if (!signal?.aborted) setStoredFiles(next);
    } catch (err) {
      if (!isAbortOrCancelError(err)) console.warn("저장된 파일 목록 로드 실패:", err);
    } finally {
      if (!signal?.aborted) setLoadingStoredFiles(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || activeSection !== "ai피드백") return;
    const signal = { aborted: false };
    loadStoredFiles(signal);
    return () => {
      signal.aborted = true;
    };
  }, [user, activeSection, loadStoredFiles]);

  /** 저장된 AI 피드백 기록 로드 */
  const loadAiFeedbackRecords = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingRecords(true);
    try {
      const res = await fetch("/api/ai-feedback-records", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) setAiFeedbackRecords(data.records ?? []);
    } catch (err) {
      if (isAbortOrCancelError(err)) return;
      console.warn("AI 피드백 기록 로드 실패:", err);
    } finally {
      setLoadingRecords(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || activeSection !== "ai피드백") return;
    loadAiFeedbackRecords();
  }, [session?.access_token, activeSection, loadAiFeedbackRecords]);

  const handleUploadFiles = async (testId: string, fileList: FileList | null) => {
    if (!user || !fileList?.length) return;
    setUploadError(null);
    setUploadingTestId(testId);
    const supabase = getSupabaseClient();
    try {
      for (const file of Array.from(fileList)) {
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
        const safeName = `${crypto.randomUUID()}${ext}`;
        const path = `${user.id}/${testId}/${safeName}`;
        const { error } = await supabase.storage
          .from(CAREER_ATTACHMENTS_BUCKET)
          .upload(path, file, { upsert: false });
        if (error) {
          setUploadError(`저장 실패: ${error.message} (파일: ${file.name})`);
          return;
        }
      }
      await loadStoredFiles();
    } catch (err) {
      if (isAbortOrCancelError(err)) return;
      setUploadError(err instanceof Error ? err.message : "파일 저장 중 오류가 발생했습니다.");
    } finally {
      setUploadingTestId(null);
    }
  };

  const handleDeleteStoredFile = async (testId: string, path: string) => {
    if (!user) return;
    const supabase = getSupabaseClient();
    try {
      await supabase.storage.from(CAREER_ATTACHMENTS_BUCKET).remove([path]);
      await loadStoredFiles();
    } catch (err) {
      if (!isAbortOrCancelError(err)) setUploadError(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-4">
        <div className="text-[var(--color-text-muted)] font-medium">로딩 중...</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const completedIds = new Set(results.map((r) => r.test_id));
  const allCount = CAREER_TESTS.length;
  const doneCount = results.length;

  return (
    <div className="platform-layout">
      <header className="header">
        <div className="header-inner">
          <h1>진로 학습플랫폼</h1>
          <p className="subtitle">진로 검사 현황</p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <Link href="/career-tests" className="text-xs text-white/90 hover:text-white underline">
              진로심리검사 목록
            </Link>
            <Link href="/" className="text-xs text-white/90 hover:text-white underline">
              메인으로
            </Link>
          </div>
        </div>
      </header>

      <div className="nav-content-panel" style={{ paddingTop: "2rem" }}>
        {/* 상단 메뉴: 진로 검사 현황 | 진로 검사 현황 */}
        <nav className="flex gap-4 mb-6 border-b border-white/20 pb-2">
          <button
            type="button"
            onClick={() => setActiveSection("현황")}
            className={`text-sm font-medium underline-offset-4 ${activeSection === "현황" ? "text-white underline" : "text-white/70 hover:text-white"}`}
          >
            진로 검사 현황
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("ai피드백")}
            className={`text-sm font-medium underline-offset-4 ${activeSection === "ai피드백" ? "text-white underline" : "text-white/70 hover:text-white"}`}
          >
            진로 검사 현황
          </button>
        </nav>

        {activeSection === "현황" && (
        <section className="nav-panel-section active">
          <h2 className="section-title">진로 검사 현황</h2>
          <p className="section-desc">
            6종 진로심리검사 완료 현황과 저장된 결과 요약입니다.
          </p>

          <div className="viz-section" style={{ marginBottom: "1.5rem" }}>
            <div className="chart-block">
              <h3 style={{ marginBottom: "0.5rem" }}>검사 완료 현황</h3>
            </div>
            <p className="viz-desc">
              {doneCount} / {allCount} 완료
            </p>
            <div className="viz-areas">
              {CAREER_TESTS.map((test) => {
                const done = completedIds.has(test.id);
                return (
                  <div
                    key={test.id}
                    className="viz-area-row"
                    style={{ cursor: "default", opacity: done ? 1 : 0.7 }}
                  >
                    <span className="viz-area-name">{test.name}</span>
                    <span className="viz-area-avg">{done ? "완료" : "미완료"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {results.length > 0 && (
            <div className="viz-section">
              <div className="chart-block">
                <h3 style={{ marginBottom: "0.5rem" }}>저장된 결과 요약</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {results.map((r) => {
                const testMeta = CAREER_TESTS.find((t) => t.id === r.test_id);
                const url = typeof r.summary?.url === "string" ? (r.summary.url as string) : null;
                const inspctSeq =
                  typeof r.summary?.inspctSeq === "number" || typeof r.summary?.inspctSeq === "string"
                    ? String(r.summary.inspctSeq)
                    : null;
                const answersLength =
                  typeof r.summary?.answersLength === "number" || typeof r.summary?.answersLength === "string"
                    ? String(r.summary.answersLength)
                    : null;

                const raw = r.raw_result as any | undefined | null;
                const testConfig = TEST_MAP[r.test_id];
                const rawArray =
                  raw && testConfig ? getNestedArray(raw, testConfig.path) : null;

                // 점수가 높은 순으로 정렬한 뒤 상위 항목을 노출
                const parsedArray = rawArray
                  ? [...rawArray].sort(
                      (a: any, b: any) =>
                        Number(b?.[testConfig.scoreKey] ?? 0) -
                        Number(a?.[testConfig.scoreKey] ?? 0)
                    )
                  : null;

                return (
                  <article key={r.test_id} className="card" style={{ padding: "1rem" }}>
                    <div className="flex items-center justify-between gap-2">
                        <div>
                          <strong>{testMeta?.name ?? r.test_id}</strong>
                        <span className="text-[var(--color-text-muted)] text-sm ml-2">
                          {new Date(r.completed_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      {url && (
                        <Link
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--color-primary)] underline whitespace-nowrap"
                        >
                          커리어넷 원본 결과 보기
                        </Link>
                      )}
                    </div>

                    <ul className="text-xs mt-2 text-[var(--color-text-muted)] space-y-1">
                      {inspctSeq && (
                        <li>
                          <span className="font-semibold text-[var(--color-text)]">검사 번호:</span>{" "}
                          {inspctSeq}
                        </li>
                      )}
                      {answersLength && (
                        <li>
                          <span className="font-semibold text-[var(--color-text)]">응답 문항 수:</span>{" "}
                          {answersLength}개
                        </li>
                      )}
                    </ul>

                    {/* TEST_MAP 설정을 사용해 검사별로 결과 배열 파싱 후 카드에 요약 표시 */}
                    {parsedArray && parsedArray.length > 0 && testConfig && (
                      <div className="mt-3 border-t border-white/10 pt-2 text-xs space-y-1">
                        <p className="font-semibold text-[var(--color-text)]">
                          {testConfig.title} 주요 결과
                        </p>
                        <ul className="space-y-0.5">
                          {parsedArray.slice(0, 4).map((item: any, idx: number) => {
                            const name = item?.[testConfig.nameKey];
                            const score = item?.[testConfig.scoreKey];
                            if (
                              (name == null || String(name).trim() === "") &&
                              (score == null || String(score).trim?.() === "")
                            ) {
                              return null;
                            }
                            return (
                              <li key={idx}>
                                <span className="font-semibold text-[var(--color-text)]">
                                  {String(name ?? `항목 ${idx + 1}`)}
                                </span>
                                {score != null && (
                                  <span className="text-[var(--color-text-muted)]">
                                    {" "}
                                    - {String(score)}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
              </div>
            </div>
          )}

          <div className="career-tests-dashboard-wrap">
            <p className="section-desc" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              {doneCount < allCount
                ? "6종 검사를 모두 완료하면 AI 진로 설계 어드바이저가 직업계고 전공 연계 피드백을 제공합니다."
                : "모든 검사를 완료했습니다. 진로 검사 현황 메뉴에서 첨부 파일을 올려 종합 피드백을 받을 수 있습니다."}
            </p>
            <Link href="/career-tests" className="viz-save-btn career-dashboard-btn">
              진로심리검사 하러 가기
            </Link>
          </div>
        </section>
        )}

        {activeSection === "ai피드백" && (
        <section className="nav-panel-section active">
          <h2 className="section-title">진로 검사 현황</h2>
          <p className="section-desc">
            진로 검사별로 결과 파일·메모 등을 첨부하면 AI가 종합적으로 분석해 진로 피드백을 제공합니다.
          </p>

          <div className="viz-section" style={{ marginBottom: "1.5rem" }}>
            <div className="chart-block">
              <h3 style={{ marginBottom: "0.5rem" }}>검사별 파일 첨부</h3>
            </div>
            <p className="viz-desc text-sm text-[var(--color-text-muted)] mb-3">
              각 검사에 대해 PDF, 이미지, 텍스트 등 자유롭게 첨부하세요. AI가 첨부 내용을 종합해 피드백합니다.
            </p>
            {uploadError && (
              <div className="mb-3 p-3 rounded bg-red-500/20 text-red-300 text-sm">
                {uploadError}
                <button type="button" className="ml-2 underline" onClick={() => setUploadError(null)}>
                  닫기
                </button>
              </div>
            )}
            {loadingStoredFiles && (
              <p className="text-sm text-[var(--color-text-muted)] mb-2">저장된 파일 목록 불러오는 중…</p>
            )}
            <div className="space-y-3">
              {CAREER_TESTS.map((test) => {
                const files = storedFiles[test.id] ?? [];
                const isUploading = uploadingTestId === test.id;
                return (
                  <div
                    key={test.id}
                    className="card p-3 flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--color-text)] sm:w-40 shrink-0">
                        {test.name}
                      </span>
                      <label className="cursor-pointer text-sm text-[var(--color-text-muted)] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-[var(--color-primary)] file:text-white">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const chosen = e.target.files;
                            if (chosen?.length) handleUploadFiles(test.id, chosen);
                            e.target.value = "";
                          }}
                        />
                        <span className="inline-block py-1 px-2 rounded bg-[var(--color-primary)] text-white text-sm">
                          {isUploading ? "저장 중…" : "파일 추가"}
                        </span>
                      </label>
                    </div>
                    {files.length > 0 ? (
                      <ul className="text-sm space-y-1 mt-1">
                        {files.map((f) => {
                          const displayName = f.name;
                          return (
                            <li key={f.path} className="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0">
                              <span className="text-[var(--color-text-muted)] truncate" title={f.name}>
                                {displayName}
                              </span>
                              <button
                                type="button"
                                className="shrink-0 text-red-400 hover:text-red-300 text-xs"
                                onClick={() => handleDeleteStoredFile(test.id, f.path)}
                              >
                                삭제
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        선택된 파일 없음
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="viz-section">
            <div className="chart-block">
              <h3 style={{ marginBottom: "0.5rem" }}>AI 종합 진로 피드백</h3>
            </div>
            <p className="section-desc mb-3">
              첨부한 파일과 검사 결과를 바탕으로 AI가 진로 방향, 전공·직업 연계 피드백을 제공합니다.
            </p>
            <button
              type="button"
              className="viz-save-btn"
              disabled={loadingAiFeedback || !session?.access_token}
              onClick={async () => {
                if (!session?.access_token) return;
                setLoadingAiFeedback(true);
                setAiFeedback("");
                try {
                  const res = await fetch("/api/career-net/ai-feedback", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setAiFeedback(`오류: ${data.error ?? res.statusText}`);
                    return;
                  }
                  setAiFeedback(data.feedback ?? "(피드백을 생성할 수 없습니다.)");
                } catch (err) {
                  if (isAbortOrCancelError(err)) return;
                  setAiFeedback(err instanceof Error ? err.message : "피드백 요청 중 오류가 발생했습니다.");
                } finally {
                  setLoadingAiFeedback(false);
                }
              }}
            >
              {loadingAiFeedback ? "분석 중…" : "AI 피드백 요청"}
            </button>
            {aiFeedback && (
              <>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    type="button"
                    className="viz-save-btn"
                    disabled={savingRecord || aiFeedback.startsWith("오류:")}
                    onClick={async () => {
                      if (!session?.access_token || aiFeedback.startsWith("오류:")) return;
                      setSavingRecord(true);
                      try {
                        const res = await fetch("/api/ai-feedback-records", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({
                          feedback: aiFeedback,
                          test_names: results.length
                            ? results
                                .map((r) => CAREER_TESTS.find((t) => t.id === r.test_id)?.name ?? r.test_id)
                                .filter(Boolean)
                                .join(", ")
                            : undefined,
                        }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          alert(data.error ?? "저장에 실패했습니다.");
                          return;
                        }
                        await loadAiFeedbackRecords();
                      } finally {
                        setSavingRecord(false);
                      }
                    }}
                  >
                    {savingRecord ? "저장 중…" : "기록 저장"}
                  </button>
                </div>
                <AiFeedbackCard feedback={aiFeedback} />
              </>
            )}

            <div className="viz-section mt-6">
              <h3 style={{ marginBottom: "0.5rem", fontSize: "1rem", fontWeight: 600 }}>
                저장된 피드백 기록
              </h3>
              {loadingRecords ? (
                <p className="text-sm text-[var(--color-text-muted)]">불러오는 중…</p>
              ) : aiFeedbackRecords.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">저장된 기록이 없습니다.</p>
              ) : (
                <ul className="space-y-2 mt-2">
                  {aiFeedbackRecords.map((r) => (
                    <li
                      key={r.id}
                      className="card p-3 flex flex-col sm:flex-row sm:items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--color-text-muted)] mb-1">
                          {new Date(r.created_at).toLocaleString("ko-KR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            hour12: false,
                          })}
                          {r.test_names ? (
                            <span style={{ marginLeft: "0.5rem", color: "var(--color-primary)" }}>
                              · {r.test_names}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-sm text-[var(--color-text)] line-clamp-2">
                          {r.feedback.replace(/\*\*/g, "").length > 120
                            ? `${r.feedback.replace(/\*\*/g, "").slice(0, 120)}…`
                            : r.feedback.replace(/\*\*/g, "")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          className="text-sm py-1 px-2 rounded bg-[var(--color-primary)] text-white hover:opacity-90"
                          onClick={() => setAiFeedback(r.feedback)}
                        >
                          보기
                        </button>
                        <button
                          type="button"
                          className="text-sm py-1 px-2 rounded bg-transparent text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            if (!confirm("이 기록을 삭제할까요?")) return;
                            if (!session?.access_token) return;
                            try {
                              const res = await fetch(`/api/ai-feedback-records?id=${r.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${session.access_token}` },
                              });
                              if (res.ok) await loadAiFeedbackRecords();
                              else {
                                const data = await res.json();
                                alert(data.error ?? "삭제에 실패했습니다.");
                              }
                            } catch (err) {
                              if (isAbortOrCancelError(err)) return;
                              alert("삭제 중 오류가 발생했습니다.");
                            }
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
        )}
      </div>

      <footer className="footer">
        <p>특성화고등학교 진로 학습플랫폼</p>
      </footer>
    </div>
  );
}
