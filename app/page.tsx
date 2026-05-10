"use client";

import { useAuth } from "@/components/AuthProvider";
import { safeFetch } from "@/lib/safeFetch";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import {
  TOPIC_CONTENT,
  SUB_ITEMS,
  AREA_NAMES,
  getAreaAvg,
  loadStoredDetail,
  getAreaValuesFromStored,
  saveStoredDetail,
} from "@/types/topicContent";
import { CAREER_TESTS } from "@/types/careerTests";

const NAV_SECTIONS = [
  { id: "self-exploration", label: "1. 자기 이해" },
  { id: "career-goal", label: "2. 진로 목표" },
  { id: "evidence", label: "3. 학습·활동 기록" },
  { id: "reflections", label: "4. 성찰·피드백" },
];

/** 섹션별 카드: data-section id, 제목, 설명, 토픽 목록 { topicId, label } */
const SECTION_CARDS = {
  "self-exploration": {
    desc: "'나는 누구인가'에 대한 답을 찾는 과정입니다.",
    cards: [
      {
        title: "진로 검사",
        topics: [
          { topicId: "career_tests", label: "진로 검사 실시" },
          { topicId: "career_dashboard", label: "진로 검사 현황" },
          { topicId: "career_ai_feedback", label: "AI 진로 피드백" },
        ],
      },
      {
        title: "나의 가치관",
        topics: [
          { topicId: "work_value", label: "일터에서 중요하게 생각하는 가치" },
          { topicId: "value_list", label: "돈, 보람, 워라밸 등 정리" },
        ],
      },
      {
        title: "흥미와 적성",
        topics: [
          { topicId: "like_list", label: "좋아하는 것 리스트" },
          { topicId: "good_at_list", label: "잘하는 것 리스트" },
          { topicId: "interest_aptitude", label: "구분하여 정리한 내용" },
        ],
      },
    ],
  },
  "career-goal": {
    desc: "단기·중기·장기 목표를 구체화합니다.",
    cards: [
      {
        title: "나의 꿈(비전)",
        topics: [
          { topicId: "vision", label: "최종적으로 되고 싶은 모습" },
          { topicId: "vision_role", label: "사회적 역할" },
        ],
      },
      {
        title: "로드맵",
        topics: [
          { topicId: "roadmap", label: "목표 달성을 위한 시기별 계획" },
          { topicId: "roadmap_viz", label: "시각화한 지도" },
        ],
      },
      {
        title: "희망 직무/기업 분석",
        topics: [
          { topicId: "job_analysis", label: "가고자 하는 분야의 최신 트렌드" },
          { topicId: "job_skills", label: "요구 역량 조사 내용" },
        ],
      },
    ],
  },
  evidence: {
    desc: "꿈을 향해 노력한 과정을 증거로 남깁니다.",
    cards: [
      {
        title: "교과 활동",
        topics: [
          { topicId: "academic_result", label: "전공 수업 수행평가 결과물" },
          { topicId: "school_record", label: "생활기록부 요약 (특이사항)" },
        ],
      },
      {
        title: "비교과 활동",
        topics: [
          { topicId: "club", label: "동아리 활동" },
          { topicId: "volunteer", label: "봉사활동" },
          { topicId: "reading", label: "독서 기록 (느낀 점 위주)" },
        ],
      },
      {
        title: "자격 및 이수증",
        topics: [
          { topicId: "license_process", label: "전공 관련 자격증 취득 과정" },
          { topicId: "license_result", label: "취득 결과" },
        ],
      },
    ],
  },
  reflections: {
    desc: "진로 포트폴리오에서 가장 중요한 부분입니다.",
    cards: [
      {
        title: "성장 일기",
        topics: [
          { topicId: "growth_diary", label: "활동 후 배운 점" },
          { topicId: "growth_change", label: "생각의 변화 기록" },
        ],
      },
      {
        title: "멘토링 기록",
        topics: [
          { topicId: "mentoring", label: "선생님·선배·전문가 조언" },
          { topicId: "mentoring_improve", label: "조언을 통한 개선점" },
        ],
      },
    ],
  },
};

const SECTION_TITLES: Record<string, string> = {
  "self-exploration": "1. 자기 이해 (Self-Exploration)",
  "career-goal": "2. 진로 목표 설정 (Career Goal)",
  evidence: "3. 학습 및 활동 기록 (Evidence)",
  reflections: "4. 성찰 및 피드백 (Reflections)",
};

type ChatMessage = { role: "user"; content: string } | { role: "assistant"; content: string };

export default function Home() {
  const { user, session, loading, signIn, profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // 1. Supabase 로그아웃을 먼저 시도 (실패해도 무시하고 진행하도록 세팅)
      await supabase.auth.signOut().catch(() => {});
      
      // 2. 브라우저에 남아있는 모든 로컬 세션 데이터를 강제로 삭제
      localStorage.clear();
      sessionStorage.clear();

      // 3. 페이지 이동 전 아주 잠깐(0.1초) 대기하여 통신이 마무리될 시간을 줌
      setTimeout(() => {
        window.location.assign('/'); 
      }, 100);

    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
      // 에러가 나더라도 사용자는 메인으로 보내서 로그아웃된 것처럼 보이게 함
      window.location.assign('/');
    }
  };
  const [activeSection, setActiveSection] = useState("self-exploration");
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [vizDetailArea, setVizDetailArea] = useState<number | null>(null);
  const [detailValues, setDetailValues] = useState<Record<string, number[]>>({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: "assistant", content: "안녕하세요. 진로·취업 관련 질문을 편하게 해보세요." },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatRecords, setChatRecords] = useState<{ id: string; messages: { role: string; content: string }[]; created_at: string }[]>([]);
  const [loadingChatRecords, setLoadingChatRecords] = useState(false);
  const [savingChatRecord, setSavingChatRecord] = useState(false);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [authLoadFallback, setAuthLoadFallback] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressSaveMessage, setProgressSaveMessage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 외부 브라우저 등에서 세션 확인이 끝나지 않을 때, 일정 시간 후 로그인 화면 표시
  useEffect(() => {
    if (!loading || user) return;
    const t = setTimeout(() => setAuthLoadFallback(true), 3000);
    return () => clearTimeout(t);
  }, [loading, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setDetailValues(loadStoredDetail());
  }, []);

  // 로그인된 사용자: 서버에 저장된 진행률이 있으면 불러와서 병합
  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseClient();
    supabase
      .from("learning_progress")
      .select("area_index, sub_index, value")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data?.length) return;
        const next: Record<string, number[]> = loadStoredDetail();
        data.forEach((row: { area_index: number; sub_index: number; value: number }) => {
          const key = String(row.area_index);
          if (!next[key]) next[key] = [];
          next[key][row.sub_index] = row.value;
        });
        setDetailValues(next);
        saveStoredDetail(next);
      });
  }, [user?.id]);

  // 로그인 후 온보딩 및 승인 체크 (AuthProvider 프로필 로드와 겹치지 않도록 짧게 지연)
  const ONBOARDING_CHECK_TIMEOUT_MS = 8_000;
  const ONBOARDING_CHECK_DELAY_MS = 300;
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let delayId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function checkOnboarding() {
      if (!user || loading) {
        setCheckingOnboarding(false);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (!cancelled) setCheckingOnboarding(false);
      }, ONBOARDING_CHECK_TIMEOUT_MS);

      try {
        const supabase = getSupabaseClient();
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("school_name, is_approved, role")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (error) {
          console.warn("프로필 조회 실패:", error);
          setCheckingOnboarding(false);
          return;
        }

        if (profile?.role === "admin") {
          setCheckingOnboarding(false);
          return;
        }

        if (!profile?.school_name?.trim()) {
          setCheckingOnboarding(false);
          router.replace("/onboarding");
          return;
        }

        if (!profile?.is_approved) {
          setCheckingOnboarding(false);
          router.replace("/waiting-approval");
          return;
        }

        setCheckingOnboarding(false);
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) {
          const { isAbortOrCancelError } = await import("@/lib/isAbortError");
          if (!isAbortOrCancelError(err)) console.warn("온보딩 확인 중 오류:", err);
          setCheckingOnboarding(false);
        }
      }
    }

    if (!user || loading) {
      setCheckingOnboarding(false);
      return;
    }
    delayId = setTimeout(() => {
      delayId = null;
      checkOnboarding();
    }, ONBOARDING_CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (delayId) clearTimeout(delayId);
    };
  }, [user, loading, router]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);
    try {
      const res = await safeFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          userName: user?.user_metadata?.full_name || user?.email,
        }),
      });
      if (!res) {
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "네트워크 오류가 발생했습니다. 서버가 실행 중인지 확인해 주세요." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVizDetail = (areaIndex: number) => {
    setVizDetailArea((prev) => (prev === areaIndex ? null : areaIndex));
  };

  const setDetailValue = (areaIndex: number, subIndex: number, value: number) => {
    const v = Math.min(100, Math.max(0, Number(value) || 0));
    setDetailValues((prev) => {
      const key = String(areaIndex);
      const arr = [...(getAreaValuesFromStored(areaIndex, prev) as number[])];
      arr[subIndex] = v;
      const next = { ...prev, [key]: arr };
      saveStoredDetail(next);
      return next;
    });
  };

  const saveProgressToServer = async () => {
    if (!user?.id || savingProgress) return;
    setSavingProgress(true);
    setProgressSaveMessage(null);
    const supabase = getSupabaseClient();
    const rows: { user_id: string; area_index: number; sub_index: number; value: number }[] = [];
    for (let areaIndex = 0; areaIndex < 4; areaIndex++) {
      const vals = getAreaValuesFromStored(areaIndex, detailValues);
      const subLen = SUB_ITEMS[areaIndex]?.length ?? 0;
      for (let subIndex = 0; subIndex < subLen; subIndex++) {
        rows.push({
          user_id: user.id,
          area_index: areaIndex,
          sub_index: subIndex,
          value: vals[subIndex] ?? 0,
        });
      }
    }
    const { error } = await supabase.from("learning_progress").upsert(rows, {
      onConflict: "user_id,area_index,sub_index",
    });
    setSavingProgress(false);
    if (error) setProgressSaveMessage("저장 실패: " + error.message);
    else {
      setProgressSaveMessage("서버에 저장되었습니다. 관리자 대시보드에서 확인할 수 있습니다.");
      setTimeout(() => setProgressSaveMessage(null), 4000);
    }
  };

  const loadChatRecords = useCallback(async (signal?: AbortSignal) => {
    if (!session?.access_token) return;
    setLoadingChatRecords(true);
    try {
      const res = await safeFetch("/api/ai-chat-records", {
        accessToken: session.access_token,
        signal: signal ?? undefined,
      });
      if (!res || signal?.aborted) return;
      const data = await res.json();
      if (res.ok && !signal?.aborted) setChatRecords(data.records ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      console.warn("채팅 기록 로드 실패:", err);
    } finally {
      if (!signal?.aborted) setLoadingChatRecords(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!isChatOpen || !user || !session?.access_token) return;
    const controller = new AbortController();
    loadChatRecords(controller.signal);
    return () => controller.abort();
  }, [isChatOpen, user, session?.access_token, loadChatRecords]);

  // 로그인 화면: user 없으면 반드시 표시 (이미 로그인된 경우만 메인으로)
  const showLoginScreen = !user && (!loading || authLoadFallback);
  const showChecking = (loading && !authLoadFallback) || (!!user && checkingOnboarding);

  // user가 없으면 무조건 로그인 화면 (세션 복원 전이거나 로그아웃 상태)
  if (!user) {
    if (showChecking && !authLoadFallback) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <div className="text-[var(--color-text-muted)] font-medium">
            확인 중...
          </div>
        </main>
      );
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-4xl font-bold mb-8 text-[#5b7c99]">
          Career Portfolio AI
        </h1>
        <button
          onClick={signIn}
          className="bg-white border border-gray-300 px-8 py-4 rounded-full shadow-md font-semibold hover:bg-gray-50 transition-all"
        >
          Google 로그인으로 시작하기
        </button>
      </main>
    );
  }

  if (showChecking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-[var(--color-text-muted)] font-medium">
          확인 중...
        </div>
      </main>
    );
  }

  const topicData = activeTopicId ? TOPIC_CONTENT[activeTopicId] : null;

  return (
    <div className="platform-layout">
      <header className="header">
        <div className="header-inner">
          <h1>진로 학습플랫폼</h1>
          <p className="subtitle">
            특성화고등학교 진로·취업 역량 기록 (
            {user.user_metadata?.full_name || user.email}
            {profile?.role === "admin" ? " 관리자" : " 학생"})
          </p>
          <div className="flex items-center justify-center gap-3 mt-2">
            {profile?.role === "admin" && (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="text-xs font-medium text-white/90 hover:text-white underline bg-transparent border-none cursor-pointer p-0"
              >
                관리자 페이지
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs underline text-white/70 hover:text-white/90"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <ul>
          {NAV_SECTIONS.map((nav) => (
            <li key={nav.id}>
              <button
                type="button"
                onClick={() => setActiveSection(nav.id)}
                className={`nav-btn ${activeSection === nav.id ? "active" : ""}`}
              >
                {nav.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* 토픽 선택 시 표시되는 학습 내용 */}
      {activeTopicId && topicData && (
        <div className="topic-content">
          <div className="topic-content-inner">
            <button
              type="button"
              className="topic-back"
              onClick={() => setActiveTopicId(null)}
              aria-label="목록으로 돌아가기"
            >
              ← 목록
            </button>
            <h2 className="topic-title">{topicData.title}</h2>
            <div
              className="topic-body"
              dangerouslySetInnerHTML={{ __html: topicData.body }}
            />
          </div>
        </div>
      )}

      {/* 메인 콘텐츠: 토픽 상세가 열려 있지 않을 때만 표시 */}
      {!activeTopicId && (
        <>
          <div className="nav-content-panel">
            {(Object.keys(SECTION_CARDS) as Array<keyof typeof SECTION_CARDS>).map(
              (sectionId) => {
                const config = SECTION_CARDS[sectionId];
                const sectionTitle = SECTION_TITLES[sectionId];
                return (
                  <section
                    key={sectionId}
                    id={sectionId}
                    className={`section section-${["self-exploration", "career-goal", "evidence", "reflections"].indexOf(sectionId) + 1} nav-panel-section ${
                      activeSection === sectionId ? "active" : ""
                    }`}
                  >
                    <h2 className="section-title">{sectionTitle}</h2>
                    <p className="section-desc">{config.desc}</p>
                    <div className="card-list">
                      {config.cards.map((card) => (
                        <article key={card.title} className="card">
                          <h3>{card.title}</h3>
                          <ul>
                            {card.topics.map(({ topicId, label }) => (
                              <li key={topicId}>
                                {topicId === "career_tests" ? (
                                  <button
                                    type="button"
                                    className="card-topic"
                                    onClick={() => router.push("/career-tests")}
                                  >
                                    {label}
                                  </button>
                                ) : topicId === "career_dashboard" ? (
                                  <button
                                    type="button"
                                    className="card-topic"
                                    onClick={() => router.push("/career-dashboard")}
                                  >
                                    {label}
                                  </button>
                                ) : topicId === "career_ai_feedback" ? (
                                  <button
                                    type="button"
                                    className="card-topic"
                                    onClick={() => router.push("/career-dashboard?tab=ai")}
                                  >
                                    {label}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="card-topic"
                                    onClick={() => setActiveTopicId(topicId)}
                                  >
                                    {label}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              }
            )}
          </div>

          {/* 학습 결과 시각화 */}
          <section className="viz-section" id="visualization">
            <div className="viz-inner">
              <h2 className="viz-title">진로 포트폴리오 학습 결과</h2>
              <p className="viz-desc">
                영역을 클릭하면 해당 세부 항목의 진행률을 볼 수 있습니다.
              </p>
              <div className="chart-block">
                <h3>영역별 진행률 (%)</h3>
                <div className="viz-areas" id="vizAreas">
                  {AREA_NAMES.map((name, idx) => {
                    const vals = getAreaValuesFromStored(idx, detailValues);
                    const avg = getAreaAvg(vals);
                    const isActive = vizDetailArea === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`viz-area-row ${isActive ? "active" : ""}`}
                        onClick={() => toggleVizDetail(idx)}
                        aria-expanded={isActive}
                      >
                        <span className="viz-area-name">{name}</span>
                        <span className="viz-area-avg">{avg}%</span>
                        <span className="viz-area-arrow" aria-hidden="true">
                          ▼
                        </span>
                      </button>
                    );
                  })}
                </div>
                {vizDetailArea !== null && (
                  <div
                    className="viz-detail"
                    aria-hidden="false"
                  >
                    <h4 className="viz-detail-title">
                      {AREA_NAMES[vizDetailArea]} – 세부 항목 진행률
                    </h4>
                    <div className="viz-detail-bars">
                      {(SUB_ITEMS[vizDetailArea] ?? []).map((label, i) => {
                        const vals = getAreaValuesFromStored(
                          vizDetailArea,
                          detailValues
                        );
                        const val = vals[i] != null ? Number(vals[i]) : 0;
                        return (
                          <div
                            key={i}
                            className="viz-detail-item"
                          >
                            <span className="viz-detail-label">{label}</span>
                            <div className="bar-track">
                              <div
                                className="bar-fill"
                                style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                              >
                                <span className="bar-value">{val}%</span>
                              </div>
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={val}
                              onChange={(e) => setDetailValue(vizDetailArea, i, e.target.valueAsNumber)}
                              className="viz-detail-input"
                              aria-label={`${label} 진행률`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="viz-save-row">
                <button
                  type="button"
                  onClick={saveProgressToServer}
                  disabled={savingProgress}
                  className="viz-save-btn"
                >
                  {savingProgress ? "저장 중…" : "서버에 진행률 저장"}
                </button>
                {progressSaveMessage && (
                  <span className="viz-save-msg">{progressSaveMessage}</span>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setIsChatOpen(!isChatOpen)}
        aria-label="AI 챗봇 열기"
      >
        AI 챗봇
      </button>

      {isChatOpen && (
        <div className="chat-panel" aria-hidden="false">
          <div className="chat-panel-header">
            <span className="chat-panel-title">AI 챗봇</span>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                className="chat-panel-history-btn"
                onClick={() => setChatHistoryOpen((prev) => !prev)}
                aria-label={chatHistoryOpen ? "채팅으로" : "채팅 기록"}
              >
                {chatHistoryOpen ? "← 채팅" : "기록"}
              </button>
              <button
                type="button"
                className="chat-panel-close"
                onClick={() => setIsChatOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
          </div>
          {chatHistoryOpen ? (
            <div className="chat-panel-messages chat-panel-records">
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                저장된 채팅 기록
              </h4>
              {loadingChatRecords ? (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>불러오는 중…</p>
              ) : chatRecords.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>저장된 기록이 없습니다.</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {chatRecords.map((r) => {
                    const arr = Array.isArray(r.messages) ? r.messages : [];
                    const preview = arr.find((m) => m.role === "user")?.content?.slice(0, 40) || "대화 내용";
                    return (
                      <li
                        key={r.id}
                        className="card"
                        style={{ padding: "0.6rem 0.75rem", margin: 0 }}
                      >
                        <p className="text-xs" style={{ color: "var(--color-text-muted)", margin: "0 0 0.25rem 0" }}>
                          {new Date(r.created_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short", hour12: false })}
                        </p>
                        <p className="text-sm" style={{ margin: "0 0 0.5rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {preview}…
                        </p>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            type="button"
                            className="chat-record-btn chat-record-view"
                            onClick={() => {
                              setMessages(
                                arr.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
                              );
                              setChatHistoryOpen(false);
                            }}
                          >
                            보기
                          </button>
                          <button
                            type="button"
                            className="chat-record-btn chat-record-delete"
                            onClick={async () => {
                              if (!confirm("이 채팅 기록을 삭제할까요?")) return;
                              if (!session?.access_token) return;
                              const res = await safeFetch(`/api/ai-chat-records?id=${r.id}`, {
                                method: "DELETE",
                                accessToken: session.access_token,
                              });
                              if (!res) return;
                              if (res.ok) await loadChatRecords();
                              else {
                                const data = await res.json();
                                alert(data.error ?? "삭제에 실패했습니다.");
                              }
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="chat-panel-messages" id="chatPanelMessages">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`chat-msg chat-msg-${msg.role === "user" ? "user" : "bot"}`}
                  >
                    <span className="chat-msg-avatar">
                      {msg.role === "user" ? "👤" : "🤖"}
                    </span>
                    <div className="chat-msg-bubble">{msg.content}</div>
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-msg chat-msg-bot">
                    <span className="chat-msg-avatar">🤖</span>
                    <div className="chat-msg-bubble">분석 중...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-panel-input-wrap">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%" }}>
                  {messages.length > 1 && session?.access_token && (
                    <button
                      type="button"
                      className="chat-save-record-btn"
                      disabled={savingChatRecord}
                      onClick={async () => {
                        if (!session?.access_token || savingChatRecord) return;
                        setSavingChatRecord(true);
                        try {
                          const res = await safeFetch("/api/ai-chat-records", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              messages: messages.map((m) => ({ role: m.role, content: m.content })),
                            }),
                            accessToken: session.access_token,
                          });
                          if (!res) return;
                          const data = await res.json();
                          if (!res.ok) {
                            alert(data.error ?? "저장에 실패했습니다.");
                            return;
                          }
                          await loadChatRecords();
                          alert("저장되었습니다.");
                        } finally {
                          setSavingChatRecord(false);
                        }
                      }}
                    >
                      {savingChatRecord ? "저장 중…" : "채팅 기록 저장"}
                    </button>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      className="chat-panel-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="메시지 입력..."
                      maxLength={500}
                      aria-label="메시지 입력"
                    />
                    <button
                      type="button"
                      className="chat-panel-send"
                      onClick={handleSendMessage}
                    >
                      전송
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <footer className="footer">
        <p>특성화고등학교 진로 학습플랫폼</p>
      </footer>
    </div>
  );
}
