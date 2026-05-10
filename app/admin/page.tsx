"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { AREA_NAMES, SUB_ITEMS } from "@/types/topicContent";

type PendingUser = {
  id: string;
  name: string | null;
  school_name: string | null;
  role: string | null;
  grade: string | null;
  class_number: string | null;
  student_number: string | null;
  major: string | null;
  position: string | null;
  affiliation: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  name: string | null;
  school_name: string | null;
  role: string | null;
  grade: string | null;
  class_number: string | null;
  major: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string | null;
};

type LearningProgressRow = {
  user_id: string;
  area_index: number;
  sub_index: number;
  value: number;
};

type TabId = "summary" | "members" | "pending" | "learning";

function getRoleLabel(role: string | null) {
  switch (role) {
    case "student": return "학생";
    case "teacher": return "교사";
    case "admin": return "관리자";
    default: return "미지정";
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("ko-KR");
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allMembers, setAllMembers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    students: 0,
    teachers: 0,
    recentLogs: 0,
  });
  const [learningProgress, setLearningProgress] = useState<LearningProgressRow[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("all");
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingLoadError, setPendingLoadError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    const supabase = getSupabaseClient();
    setPendingLoadError(null);
    try {
      const [profilesRes, progressRes, logsRes] = await Promise.allSettled([
        supabase.from("profiles").select("id, name, school_name, role, grade, class_number, student_number, major, position, affiliation, is_approved, created_at, updated_at").order("created_at", { ascending: false }),
        supabase.from("learning_progress").select("user_id, area_index, sub_index, value"),
        supabase.from("activity_logs").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (profilesRes.status === "fulfilled") {
        const { data: list, error: profileErr } = profilesRes.value as { data: Profile[] | null; error: { message?: string } | null };
        if (profileErr) {
          setPendingLoadError(profileErr.message || "프로필 목록을 불러오지 못했습니다.");
          setPendingUsers([]);
        } else if (list && Array.isArray(list)) {
          setAllMembers(list);
          const approved = list.filter((p) => p.is_approved);
          const pending = list.filter((p) => !p.is_approved);
          setPendingUsers(pending as unknown as PendingUser[]);
          setStats((s) => ({
            ...s,
            total: approved.length,
            pending: pending.length,
            students: approved.filter((p) => p.role === "student").length,
            teachers: approved.filter((p) => p.role === "teacher").length,
          }));
        }
      } else {
        setPendingLoadError("승인 대기 목록을 불러오지 못했습니다.");
        setPendingUsers([]);
      }
      if (progressRes.status === "fulfilled" && progressRes.value.data) setLearningProgress(progressRes.value.data as LearningProgressRow[]);
      if (logsRes.status === "fulfilled" && logsRes.value.count != null) setStats((s) => ({ ...s, recentLogs: logsRes.value.count ?? 0 }));
    } catch (e) {
      console.warn("관리자 데이터 로드 중 오류:", e);
      setPendingLoadError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function checkAdminAccess() {
      try {
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if ((authError || !user) && typeof window !== "undefined") {
          await new Promise((r) => setTimeout(r, 1500));
          const sessionRes = await supabase.auth.getSession();
          user = sessionRes.data.session?.user ?? null;
          authError = sessionRes.error ?? null;
        }

        if (authError || !user) {
          router.replace("/");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || profile?.role !== "admin") {
          if (profile != null && profile.role !== "admin") {
            alert("관리자 권한이 없습니다.");
          }
          router.replace("/");
          return;
        }

        setCheckingAuth(false);
        loadAllData();
      } catch (err) {
        console.error("인증 체크 중 오류:", err);
        router.replace("/");
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAdminAccess();
  }, [router, loadAllData]);

  async function handleApprove(userId: string) {
    setApprovingIds((prev) => new Set(prev).add(userId));
    setError(null);
    setSuccess(null);

    const supabase = getSupabaseClient();
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_approved: true, updated_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const approvedUser = pendingUsers.find((u) => u.id === userId);
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action_type: "ADMIN_APPROVE_USER",
          page_url: "/admin",
          details: {
            approved_user_id: userId,
            approved_user_name: approvedUser?.name,
            approved_user_role: approvedUser?.role,
          },
        });
      }

      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setStats((s) => ({ ...s, pending: s.pending - 1, total: s.total + 1 }));
      setSuccess("승인되었습니다.");
      setTimeout(() => setSuccess(null), 3000);
      await loadAllData();
    } catch (err: unknown) {
      setError(`오류 발생: ${err instanceof Error ? err.message : "알 수 없는 에러"}`);
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  const filteredMembers = allMembers.filter((p) => {
    const matchRole = memberRoleFilter === "all" || p.role === memberRoleFilter;
    const matchSearch =
      !memberSearch.trim() ||
      [p.name, p.school_name, p.major].some(
        (v) => v && v.toLowerCase().includes(memberSearch.trim().toLowerCase())
      );
    return matchRole && matchSearch;
  });

  const approvedMembers = filteredMembers.filter((p) => p.is_approved);

  const areaAverages = [0, 1, 2, 3].map((areaIndex) => {
    const rows = learningProgress.filter((r) => r.area_index === areaIndex);
    if (rows.length === 0) return 0;
    const sum = rows.reduce((a, r) => a + r.value, 0);
    return Math.round(sum / rows.length);
  });

  const progressByUser: Record<string, number[]> = {};
  const userIds = [...new Set(learningProgress.map((r) => r.user_id))];
  userIds.forEach((uid) => {
    progressByUser[uid] = [0, 0, 0, 0];
    for (let areaIndex = 0; areaIndex < 4; areaIndex++) {
      const rows = learningProgress.filter((r) => r.user_id === uid && r.area_index === areaIndex);
      if (rows.length === 0) continue;
      const sum = rows.reduce((a, r) => a + r.value, 0);
      progressByUser[uid][areaIndex] = Math.round(sum / rows.length);
    }
  });

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600 font-medium">관리자 권한 확인 중...</div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "summary", label: "대시보드 요약" },
    { id: "members", label: "회원 관리" },
    { id: "pending", label: "승인 대기" },
    { id: "learning", label: "학습 결과 시각화" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* 사이드바 */}
      <aside className="w-56 bg-slate-800 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="font-bold text-lg">관리자</h1>
          <p className="text-slate-400 text-sm">대시보드</p>
        </div>
        <nav className="p-2 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                activeTab === tab.id ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <Link
            href="/"
            className="text-slate-400 hover:text-white text-sm"
          >
            ← 학습 플랫폼으로
          </Link>
        </div>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">
            {tabs.find((t) => t.id === activeTab)?.label ?? "관리자 대시보드"}
          </h2>
        </header>

        <div className="p-6">
          {error && (
            <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>
          )}
          {success && (
            <div className="p-4 mb-4 text-green-700 bg-green-100 rounded-lg">{success}</div>
          )}

          {activeTab === "summary" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium">총 회원 수</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
                  <p className="text-xs text-slate-400 mt-1">승인 완료</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium">승인 대기</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                  <p className="text-xs text-slate-400 mt-1">회원 관리에서 승인</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium">학생</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.students}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium">교사</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.teachers}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-2">최근 7일 활동 로그</h3>
                <p className="text-3xl font-bold text-slate-700">{stats.recentLogs}</p>
                <p className="text-sm text-slate-500 mt-1">건 (로그인·페이지뷰·승인 등)</p>
              </div>
              <div className="mt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  학습 플랫폼 바로가기
                </Link>
              </div>
            </>
          )}

          {activeTab === "members" && (
            <>
              <div className="flex flex-wrap gap-4 mb-4">
                <input
                  type="text"
                  placeholder="이름, 학교, 전공 검색..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="border border-slate-300 rounded-lg px-4 py-2 w-64"
                />
                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-4 py-2"
                >
                  <option value="all">전체 역할</option>
                  <option value="student">학생</option>
                  <option value="teacher">교사</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-medium text-slate-700">이름</th>
                        <th className="px-6 py-4 font-medium text-slate-700">역할</th>
                        <th className="px-6 py-4 font-medium text-slate-700">소속/학교</th>
                        <th className="px-6 py-4 font-medium text-slate-700">학년/반</th>
                        <th className="px-6 py-4 font-medium text-slate-700">승인</th>
                        <th className="px-6 py-4 font-medium text-slate-700">가입일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedMembers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-slate-500">
                            조건에 맞는 회원이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        approvedMembers.map((user) => (
                          <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-800">{user.name ?? "-"}</td>
                            <td className="px-6 py-4">{getRoleLabel(user.role)}</td>
                            <td className="px-6 py-4">{user.school_name ?? "-"}</td>
                            <td className="px-6 py-4">
                              {[user.grade, user.class_number].filter(Boolean).join("-") || "-"}
                            </td>
                            <td className="px-6 py-4">
                              {user.is_approved ? (
                                <span className="text-emerald-600 font-medium">승인됨</span>
                              ) : (
                                <span className="text-amber-600">대기</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-500">{formatDate(user.created_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "pending" && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">
                <strong>profiles</strong> 테이블에서 <strong>is_approved = false</strong>인 사용자만 불러옵니다. 아래 목록에서 승인해 주세요.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => loadAllData()}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium"
                >
                  목록 새로고침
                </button>
                {pendingLoadError && (
                  <span className="text-amber-600 text-sm">{pendingLoadError}</span>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-medium text-slate-700">이름</th>
                      <th className="px-6 py-4 font-medium text-slate-700">역할</th>
                      <th className="px-6 py-4 font-medium text-slate-700">소속(학교)</th>
                      <th className="px-6 py-4 font-medium text-slate-700">학년/반</th>
                      <th className="px-6 py-4 font-medium text-slate-700">전공·직급</th>
                      <th className="px-6 py-4 font-medium text-slate-700">가입일</th>
                      <th className="px-6 py-4 font-medium text-slate-700">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-500">
                          {pendingLoadError ? "목록을 불러오지 못했습니다. 새로고침 해 주세요." : "대기 중인 사용자가 없습니다."}
                        </td>
                      </tr>
                    ) : (
                      pendingUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100">
                          <td className="px-6 py-4 font-medium">{user.name ?? "-"}</td>
                          <td className="px-6 py-4">{getRoleLabel(user.role)}</td>
                          <td className="px-6 py-4">{user.school_name ?? "-"}</td>
                          <td className="px-6 py-4">
                            {user.role === "student"
                              ? [user.grade, user.class_number].filter(Boolean).join("-") || "-"
                              : "-"}
                          </td>
                          <td className="px-6 py-4">
                            {user.role === "student" ? (user.major ?? "-") : (user.position ?? user.affiliation ?? "-")}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{formatDate(user.created_at)}</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleApprove(user.id)}
                              disabled={approvingIds.has(user.id)}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                              {approvingIds.has(user.id) ? "처리 중..." : "승인하기"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "learning" && (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <p className="text-slate-600">
                  학습 플랫폼에서 저장된 진행률을 집계합니다. 학습 플랫폼에서 &quot;진행률 서버 저장&quot;을 하면 여기서 확인할 수 있습니다.
                </p>
                <Link
                  href="/"
                  className="text-indigo-600 hover:underline font-medium"
                >
                  학습 플랫폼으로 이동 →
                </Link>
              </div>

              {learningProgress.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 shadow-sm">
                  <p className="font-medium">아직 저장된 학습 진행률이 없습니다.</p>
                  <p className="text-sm mt-2">
                    학습 플랫폼에서 진행률을 입력하고 &quot;서버에 저장&quot;하면 영역별·회원별 집계가 표시됩니다.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-4">영역별 평균 진행률 (%)</h3>
                    <div className="space-y-4">
                      {AREA_NAMES.map((name, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700">{name}</span>
                            <span className="text-slate-600">{areaAverages[idx]}%</span>
                          </div>
                          <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, areaAverages[idx])}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-4">회원별 영역 진행률</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 font-medium text-slate-700">회원</th>
                            {AREA_NAMES.map((label, i) => (
                              <th key={i} className="text-left py-2 font-medium text-slate-700">{label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(progressByUser).map(([userId, areas]) => {
                            const profile = allMembers.find((p) => p.id === userId);
                            return (
                              <tr key={userId} className="border-b border-slate-100">
                                <td className="py-3 font-medium text-slate-800">
                                  {profile?.name ?? profile?.school_name ?? userId.slice(0, 8)}
                                </td>
                                {[0, 1, 2, 3].map((i) => (
                                  <td key={i} className="py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-emerald-500 rounded-full"
                                          style={{ width: `${Math.min(100, areas[i] ?? 0)}%` }}
                                        />
                                      </div>
                                      <span className="text-slate-600 w-8">{areas[i] ?? 0}%</span>
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
