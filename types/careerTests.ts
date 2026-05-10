/**
 * 커리어넷 진로심리검사 - 고등학생(대상코드 100207) 전용
 * 중학생 코드 없음, 모든 검사 고등학생용 고정
 */

export const CAREER_NET_TARGET_HIGH = "100207";

export type CareerTestId =
  | "interest_h"      // 직업흥미검사(H) - v2
  | "interest_k"      // 직업흥미검사(K) - v1
  | "aptitude"        // 직업적성검사 - v1
  | "value"           // 직업가치관검사 - v1
  | "maturity"        // 진로성숙도검사 - v1
  | "competency";     // 진로개발역량검사 - v1

export type ApiVersion = "v1" | "v2";

export interface CareerTestConfig {
  id: CareerTestId;
  name: string;
  apiVersion: ApiVersion;
  /** v1: q 파라미터, v2: qno 파라미터 (고등학생용 고정) */
  q: number;
  qno?: number;
  description?: string;
}

/**
 * 6종 진로심리검사 - 고등학생 전용 (openAPI이용매뉴얼_v4.0 기준)
 * 대상코드 trgetSe=100207 (고등학생) — 100206(중학생)
 *
 * 검사별 q/qno 매핑:
 *   interest_h: v2, qno 33(중학 145문항)/34(고등 146문항) — 우리는 고등 34 사용
 *   interest_k: v1, q 31 | value: 25 | maturity: 36 | aptitude: 21 | competency: 27
 */
export const CAREER_TESTS: CareerTestConfig[] = [
  { id: "interest_h", name: "직업흥미검사(H)", apiVersion: "v2", q: 34, description: "직업 흥미 탐색" },
  { id: "interest_k", name: "직업흥미검사(K)", apiVersion: "v1", q: 31, description: "직업 흥미 유형 파악" },
  { id: "value", name: "직업가치관검사", apiVersion: "v1", q: 25, description: "일터에서의 가치관 파악" },
  { id: "maturity", name: "진로성숙도검사", apiVersion: "v1", q: 36, description: "진로 결정 성숙도" },
  { id: "aptitude", name: "직업적성검사", apiVersion: "v1", q: 21, description: "직업 적성 영역 탐색" },
  { id: "competency", name: "진로개발역량검사", apiVersion: "v1", q: 27, description: "진로 개발 역량 수준" },
];

export const CAREER_TEST_MAP: Record<CareerTestId, CareerTestConfig> = CAREER_TESTS.reduce(
  (acc, t) => ({ ...acc, [t.id]: t }),
  {} as Record<CareerTestId, CareerTestConfig>
);

/** 검사 결과 저장용 (AI 진로 피드백·종합 대시보드 활용) */
export interface CareerTestResultPayload {
  testId: CareerTestId;
  testName: string;
  /** API에서 반환한 원본 결과 식별자 등 */
  qestrnSeq?: string;
  /** 유형, 점수, 하위척도 등 구조화 데이터 */
  summary: Record<string, unknown>;
  raw?: Record<string, unknown>;
  completedAt: string; // ISO
}
