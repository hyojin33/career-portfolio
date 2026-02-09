"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  TOPIC_CONTENT,
  SUB_ITEMS,
  AREA_NAMES,
  getAreaAvg,
  loadStoredDetail,
  getAreaValuesFromStored,
} from "./data/topicContent";

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
          { topicId: "worknet", label: "진로심리검사" },
          { topicId: "mbti", label: "직업흥미검사" },
          { topicId: "strength", label: "AI 진로검사 피드백" },
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
  const { data: session } = useSession();
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setDetailValues(loadStoredDetail());
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          userName: session?.user?.name,
        }),
      });
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

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-4xl font-bold mb-8 text-[#5b7c99]">
          Career Portfolio AI
        </h1>
        <button
          onClick={() => signIn("google")}
          className="bg-white border border-gray-300 px-8 py-4 rounded-full shadow-md font-semibold hover:bg-gray-50 transition-all"
        >
          Google 로그인으로 시작하기
        </button>
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
            특성화고등학교 진로·취업 역량 기록 ({session.user?.name} 학생)
          </p>
          <button
            onClick={() => signOut()}
            className="text-xs underline mt-2 text-white/70"
          >
            로그아웃
          </button>
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
                                <button
                                  type="button"
                                  className="card-topic"
                                  onClick={() => setActiveTopicId(topicId)}
                                >
                                  {label}
                                </button>
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
            <button
              type="button"
              className="chat-panel-close"
              onClick={() => setIsChatOpen(false)}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
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
      )}

      <footer className="footer">
        <p>특성화고등학교 진로 학습플랫폼</p>
      </footer>
    </div>
  );
}
