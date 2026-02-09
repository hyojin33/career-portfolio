/** 토픽별 학습 내용 (제목 + 본문) - 기존 app.js TOPIC_CONTENT 마이그레이션 */
export const TOPIC_CONTENT: Record<
  string,
  { title: string; body: string }
> = {
  worknet: {
    title: "진로심리검사",
    body: "<p>진로심리검사는 자신의 흥미, 가치관, 성향을 파악하는 표준화된 검사입니다. 워크넷(worknet.go.kr) 등에서 제공하는 검사를 활용해 보세요.</p><p>검사 결과를 바탕으로 나에게 맞는 직업 유형을 살펴보고, 포트폴리오에 결과 요약과 느낀 점을 정리해 두면 좋습니다.</p>",
  },
  mbti: {
    title: "직업흥미검사",
    body: "<p>직업흥미검사는 자신이 어떤 일에 흥미를 느끼는지 알아보는 도구입니다. Holland 이론(현실형·탐구형·예술형·사회형·진취형·관습형) 기반 검사가 많이 사용됩니다.</p><p>검사 결과와 자신이 생각하는 흥미를 비교해 보며, 진로 목표 설정에 반영해 보세요.</p>",
  },
  strength: {
    title: "AI 진로검사 피드백",
    body: "<p>진로 검사 결과를 바탕으로 AI가 제안하는 직무나 학습 방향을 참고할 수 있습니다. 자신의 강점과 보완할 점을 정리해 두면 성찰 단계에서 활용하기 좋습니다.</p>",
  },
  work_value: {
    title: "일터에서 중요하게 생각하는 가치",
    body: "<p>돈, 안정성, 성장, 워라밸, 보람, 인간관계 등 일할 때 무엇을 중요하게 생각하는지 정리해 보세요. 가치관이 명확할수록 진로 선택이 수월해집니다.</p>",
  },
  value_list: {
    title: "돈, 보람, 워라밸 등 정리",
    body: "<p>자신만의 가치 순위를 정해 보세요. 예: 보람 &gt; 성장 &gt; 워라밸 &gt; 수입. 나중에 직무나 기업을 고를 때 이 목록을 기준으로 삼을 수 있습니다.</p>",
  },
  like_list: {
    title: "좋아하는 것 리스트",
    body: "<p>일상에서 좋아하는 활동, 과목, 환경을 나열해 보세요. 흥미와 연결되면 진로 방향을 잡는 데 도움이 됩니다.</p>",
  },
  good_at_list: {
    title: "잘하는 것 리스트",
    body: "<p>남들보다 잘하거나 스스로 잘한다고 느끼는 것을 적어 보세요. 적성과 강점을 파악하는 기초가 됩니다.</p>",
  },
  interest_aptitude: {
    title: "흥미와 적성 구분하여 정리",
    body: "<p>흥미(하고 싶은 것)와 적성(잘하는 것)을 표로 정리해 보세요. 두 가지가 겹치는 영역이 진로 후보가 될 수 있습니다.</p>",
  },
  vision: {
    title: "최종적으로 되고 싶은 모습",
    body: "<p>10년 후, 20년 후 자신이 어떤 모습이었으면 좋을지 구체적으로 적어 보세요. 직무, 역할, 생활 방식까지 포함하면 목표 설정에 도움이 됩니다.</p>",
  },
  vision_role: {
    title: "사회적 역할",
    body: "<p>직업을 통해 사회에 어떤 기여를 하고 싶은지 생각해 보세요. 예: 기술로 안전을 지키는 사람, 교육으로 성장을 돕는 사람 등.</p>",
  },
  roadmap: {
    title: "목표 달성을 위한 시기별 계획",
    body: "<p>단기(1년), 중기(3년), 장기(5년 이상)로 나누어 무엇을 할지 계획을 세워 보세요. 자격증, 실습, 경험 등을 단계별로 넣으면 좋습니다.</p>",
  },
  roadmap_viz: {
    title: "시각화한 지도",
    body: "<p>타임라인이나 로드맵 그림으로 계획을 그려 보세요. 한눈에 보이면 동기 부여와 점검에 도움이 됩니다.</p>",
  },
  job_analysis: {
    title: "가고자 하는 분야의 최신 트렌드",
    body: "<p>희망 직무나 산업의 최근 동향을 조사해 보세요. 기술 변화, 수요 증감, 필요한 역량을 정리하면 준비 방향이 잡힙니다.</p>",
  },
  job_skills: {
    title: "요구 역량 조사 내용",
    body: "<p>채용 공고나 직무 설명서를 참고해 해당 분야에서 요구하는 역량(기술, 자격, 경험)을 리스트로 만들어 보세요. 자신의 현재 수준과 비교해 보완 계획을 세울 수 있습니다.</p>",
  },
  academic_result: {
    title: "전공 수업 수행평가 결과물",
    body: "<p>전공 관련 수업에서 만든 결과물(보고서, 프로젝트, 발표 자료)을 정리해 두세요. 포트폴리오에 요약과 링크(또는 파일명)를 남기면 증거 자료가 됩니다.</p>",
  },
  school_record: {
    title: "생활기록부 요약 (특이사항)",
    body: "<p>생활기록부에 담길 만한 특기사항, 수상, 활동을 요약해 보세요. 진로와 연결된 부분을 강조하면 좋습니다.</p>",
  },
  club: {
    title: "동아리 활동",
    body: "<p>동아리에서 한 역할, 기간, 배운 점을 기록해 보세요. 협업 능력이나 관심 분야를 보여주는 자료가 됩니다.</p>",
  },
  volunteer: {
    title: "봉사활동",
    body: "<p>봉사 시간, 장소, 내용, 느낀 점을 정리해 두세요. 사회성과 가치관을 보여주는 증거가 됩니다.</p>",
  },
  reading: {
    title: "독서 기록 (느낀 점 위주)",
    body: "<p>진로·직업 관련 책을 읽었다면 제목, 저자, 핵심 메시지, 느낀 점을 간단히 기록해 보세요. 성찰과 연결하면 좋습니다.</p>",
  },
  license_process: {
    title: "전공 관련 자격증 취득 과정",
    body: "<p>어떤 자격증을 목표로 했고, 어떻게 준비했는지 과정을 적어 보세요. 시행착오와 극복 경험이 성장 스토리가 됩니다.</p>",
  },
  license_result: {
    title: "취득 결과",
    body: "<p>취득한 자격증, 취득일, 발급 기관을 정리해 두세요. 포트폴리오의 증거 자료로 활용할 수 있습니다.</p>",
  },
  growth_diary: {
    title: "활동 후 배운 점",
    body: "<p>각종 활동을 마친 뒤 무엇을 배웠는지, 무엇이 달라졌는지 짧게라도 기록해 보세요. 성찰의 기본이 됩니다.</p>",
  },
  growth_change: {
    title: "생각의 변화 기록",
    body: "<p>진로 탐색 과정에서 생각이 바뀐 부분이 있다면 그 이유와 함께 적어 보세요. 성장을 보여주는 좋은 소재입니다.</p>",
  },
  mentoring: {
    title: "선생님·선배·전문가 조언",
    body: "<p>멘토링이나 상담에서 들은 조언을 요약해 두세요. 누가, 어떤 맥락에서, 무엇을 말했는지 정리하면 나중에 참고하기 좋습니다.</p>",
  },
  mentoring_improve: {
    title: "조언을 통한 개선점",
    body: "<p>조언을 반영해 실제로 바꾼 행동이나 계획을 적어 보세요. 피드백 수용 능력과 성장을 보여줄 수 있습니다.</p>",
  },
};

/** 시각화용 영역별 세부 항목명 */
export const SUB_ITEMS = [
  ["표준화 검사 결과", "나의 가치관", "흥미와 적성"],
  ["나의 꿈(비전)", "로드맵", "희망 직무/기업 분석"],
  ["교과 활동", "비교과 활동", "자격 및 이수증"],
  ["성장 일기", "멘토링 기록"],
];
export const AREA_NAMES = [
  "1. 자기 이해",
  "2. 진로 목표",
  "3. 학습·활동 기록",
  "4. 성찰·피드백",
];

const STORAGE_DETAIL = "career_portfolio_detail";

function loadDetailValues(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(STORAGE_DETAIL);
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj && typeof obj === "object") return obj;
    }
  } catch (_) {}
  return {};
}

function getAreaValues(areaIndex: number, stored: Record<string, number[]>): number[] {
  const key = String(areaIndex);
  if (stored[key] && Array.isArray(stored[key])) return stored[key];
  const len = SUB_ITEMS[areaIndex]?.length ?? 0;
  return Array.from({ length: len }, () => 0);
}

export function getAreaAvg(vals: number[]): number {
  if (vals.length === 0) return 0;
  const sum = vals.reduce((a, b) => a + (parseInt(String(b), 10) || 0), 0);
  return Math.round(sum / vals.length);
}

export function loadStoredDetail(): Record<string, number[]> {
  return loadDetailValues();
}

export function getAreaValuesFromStored(areaIndex: number, stored: Record<string, number[]>): number[] {
  return getAreaValues(areaIndex, stored);
}