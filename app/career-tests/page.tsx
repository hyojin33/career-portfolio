"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { CAREER_TESTS } from "@/types/careerTests";

/** 메뉴 표시용: 괄호와 내용 제거 후 공백으로 구분 (예: 직업흥미검사(H) → 직업흥미검사 H) */
function getMenuLabel(name: string): string {
  return name.replace(/\s*\(([^)]*)\)\s*$/, " $1").trim() || name;
}

export default function CareerTestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-4">
        <div className="text-[var(--color-text-muted)] font-medium">로딩 중...</div>
      </main>
    );
  }

  return (
    <div className="platform-layout">
      <header className="header">
        <div className="header-inner">
          <h1>진로 학습플랫폼</h1>
          <p className="subtitle">특성화고등학교 진로·취업 역량 기록 – 진로심리검사</p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <Link
              href="/"
              className="text-xs font-medium text-white/90 hover:text-white underline"
            >
              메인으로
            </Link>
          </div>
        </div>
      </header>

      <div className="nav-content-panel" style={{ paddingTop: "2rem" }}>
        <section className="nav-panel-section active">
          <h2 className="section-title">진로심리검사 (고등학생용)</h2>
          <p className="section-desc">
            커리어넷 진로심리검사 API를 활용한 6종 검사입니다. 검사를 선택해 진행해 주세요.
          </p>
          <div className="card-list career-tests-grid">
            {CAREER_TESTS.map((test) => (
              <article key={test.id} className="card">
                <h3>{getMenuLabel(test.name)}</h3>
                {test.description && (
                  <p className="card-test-desc">{test.description}</p>
                )}
                <ul>
                  <li>
                    <Link
                      href={`/career-tests/${test.id}`}
                      className="card-topic"
                    >
                      검사 시작하기
                    </Link>
                  </li>
                </ul>
              </article>
            ))}
          </div>

          <div className="career-tests-dashboard-wrap">
            <Link
              href="/career-dashboard"
              className="viz-save-btn career-dashboard-btn"
            >
              진로 검사 현황
            </Link>
            <p className="section-desc" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              6종 검사 완료 후 결과를 종합해 AI 진로 설계 어드바이저와 함께 볼 수 있습니다.
            </p>
          </div>
        </section>
      </div>

      <footer className="footer">
        <p>특성화고등학교 진로 학습플랫폼</p>
      </footer>
    </div>
  );
}
