"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { isAbortOrCancelError } from "@/lib/isAbortError";

type Role = "student" | "teacher" | null;

type StudentFormState = {
  name: string;
  school_name: string;
  grade: string;
  class_number: string;
  student_number: string;
  major: string;
};

type TeacherFormState = {
  name: string;
  school_name: string;
  position: string;
  affiliation: string;
};

const initialStudentForm: StudentFormState = {
  name: "",
  school_name: "",
  grade: "",
  class_number: "",
  student_number: "",
  major: "",
};

const initialTeacherForm: TeacherFormState = {
  name: "",
  school_name: "",
  position: "",
  affiliation: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [studentForm, setStudentForm] = useState<StudentFormState>(initialStudentForm);
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>(initialTeacherForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function checkAndLoad() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        if (isAbortOrCancelError(authError)) return;
        router.replace("/");
        return;
      }
      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, school_name, grade, class_number, student_number, major, role, position, affiliation, is_approved")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        if (isAbortOrCancelError(profileError)) return;
        setError("프로필을 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      // admin은 승인 여부와 상관없이 메인 페이지로 이동
      if (profile?.role === "admin") {
        router.replace("/");
        return;
      }

      // 이미 승인된 사용자는 메인 페이지로 이동
      if (profile?.is_approved) {
        router.replace("/");
        return;
      }

      // 이미 등록 신청한 사용자는 waiting-approval 페이지로 이동
      if (profile?.school_name?.trim()) {
        router.replace("/waiting-approval");
        return;
      }

      // 기존 프로필 데이터가 있으면 로드
      if (profile) {
        const existingRole = (profile.role as Role) || null;
        setRole(existingRole);

        if (existingRole === "student") {
          setStudentForm({
            name: profile.name ?? "",
            school_name: profile.school_name ?? "",
            grade: profile.grade ?? "",
            class_number: profile.class_number ?? "",
            student_number: profile.student_number ?? "",
            major: profile.major ?? "",
          });
        } else if (existingRole === "teacher") {
          setTeacherForm({
            name: profile.name ?? "",
            school_name: profile.school_name ?? "",
            position: profile.position ?? "",
            affiliation: profile.affiliation ?? "",
          });
        }
      }
      setLoading(false);
    }

    checkAndLoad();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!role) {
      setError("역할을 선택해주세요.");
      return;
    }

    // 유효성 검사
    if (role === "student") {
      if (!studentForm.name.trim() || !studentForm.school_name.trim()) {
        setError("이름과 학교명을 입력해주세요.");
        return;
      }
    } else if (role === "teacher") {
      if (!teacherForm.name.trim() || !teacherForm.school_name.trim()) {
        setError("이름과 소속 학교를 입력해주세요.");
        return;
      }
    }

    setSaving(true);

    const supabase = getSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      if (isAbortOrCancelError(userError)) return;
      setError("로그인 세션이 없습니다.");
      setSaving(false);
      return;
    }
    if (!user) {
      setError("로그인 세션이 없습니다.");
      setSaving(false);
      return;
    }

    // 관리자 계정은 온보딩에서 역할/승인 상태를 바꾸지 않음 (덮어쓰기 방지)
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (currentProfile?.role === "admin") {
      router.replace("/");
      setSaving(false);
      return;
    }

    const updateData: Record<string, any> = {
      role,
      is_approved: false,
      updated_at: new Date().toISOString(),
    };

    if (role === "student") {
      updateData.name = studentForm.name.trim() || null;
      updateData.school_name = studentForm.school_name.trim() || null;
      updateData.grade = studentForm.grade.trim() || null;
      updateData.class_number = studentForm.class_number.trim() || null;
      updateData.student_number = studentForm.student_number.trim() || null;
      updateData.major = studentForm.major.trim() || null;
      // 교사 필드는 null로 초기화
      updateData.position = null;
      updateData.affiliation = null;
    } else if (role === "teacher") {
      updateData.name = teacherForm.name.trim() || null;
      updateData.school_name = teacherForm.school_name.trim() || null;
      updateData.position = teacherForm.position.trim() || null;
      updateData.affiliation = teacherForm.affiliation.trim() || null;
      // 학생 필드는 null로 초기화
      updateData.grade = null;
      updateData.class_number = null;
      updateData.student_number = null;
      updateData.major = null;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message || "저장에 실패했습니다.");
      setSaving(false);
      return;
    }

    const { error: logError } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action_type: "ONBOARDING_COMPLETE",
      page_url: "/onboarding",
      details: { 
        role,
        completed_at: new Date().toISOString() 
      },
    });

    if (logError) {
      console.warn("활동 기록 실패:", logError);
    }

    // 저장 완료 후 waiting-approval 페이지로 이동
    router.replace("/waiting-approval");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[var(--color-text-muted)] font-medium">
          확인 중...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-gradient-to-br from-[#7d9bb8] via-[#6b8299] to-[#5b7c99] text-white py-8 px-4 text-center shadow-md">
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          환영합니다
        </h1>
        <p className="text-white/90 text-sm">
          처음 한 번만 정보를 입력해 주세요.
        </p>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-border)] overflow-hidden"
        >
          <div className="p-6 space-y-5">
            {error && (
              <div
                role="alert"
                className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100"
              >
                {error}
              </div>
            )}

            {/* 역할 선택 */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-3">
                역할 선택
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`py-3 px-4 rounded-xl font-medium transition ${
                    role === "student"
                      ? "bg-[var(--color-primary)] text-white shadow-md"
                      : "bg-gray-100 text-[var(--color-text)] hover:bg-gray-200"
                  }`}
                >
                  학생으로 가입
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`py-3 px-4 rounded-xl font-medium transition ${
                    role === "teacher"
                      ? "bg-[var(--color-primary)] text-white shadow-md"
                      : "bg-gray-100 text-[var(--color-text)] hover:bg-gray-200"
                  }`}
                >
                  교사로 가입
                </button>
              </div>
            </div>

            {/* 학생 입력창 */}
            {role === "student" && (
              <>
                <div>
                  <label
                    htmlFor="student-name"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    value={studentForm.name}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="이름을 입력하세요"
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="student-school_name"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    학교명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="student-school_name"
                    type="text"
                    value={studentForm.school_name}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, school_name: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="학교명을 입력하세요"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="grade"
                      className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                    >
                      학년
                    </label>
                    <input
                      id="grade"
                      type="text"
                      value={studentForm.grade}
                      onChange={(e) =>
                        setStudentForm((prev) => ({ ...prev, grade: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                      placeholder="예: 1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="class_number"
                      className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                    >
                      반
                    </label>
                    <input
                      id="class_number"
                      type="text"
                      value={studentForm.class_number}
                      onChange={(e) =>
                        setStudentForm((prev) => ({
                          ...prev,
                          class_number: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                      placeholder="예: 3"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="student_number"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    번호
                  </label>
                  <input
                    id="student_number"
                    type="text"
                    value={studentForm.student_number}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        student_number: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="학번 또는 번호"
                  />
                </div>

                <div>
                  <label
                    htmlFor="major"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    전공
                  </label>
                  <input
                    id="major"
                    type="text"
                    value={studentForm.major}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, major: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="전공을 입력하세요"
                  />
                </div>
              </>
            )}

            {/* 교사 입력창 */}
            {role === "teacher" && (
              <>
                <div>
                  <label
                    htmlFor="teacher-name"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="teacher-name"
                    type="text"
                    value={teacherForm.name}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="이름을 입력하세요"
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="teacher-school_name"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    소속 학교 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="teacher-school_name"
                    type="text"
                    value={teacherForm.school_name}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({ ...prev, school_name: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="소속 학교를 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="position"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    직급
                  </label>
                  <input
                    id="position"
                    type="text"
                    value={teacherForm.position}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({ ...prev, position: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="예: 교사, 부장교사, 교감 등"
                  />
                </div>

                <div>
                  <label
                    htmlFor="affiliation"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    소속
                  </label>
                  <input
                    id="affiliation"
                    type="text"
                    value={teacherForm.affiliation}
                    onChange={(e) =>
                      setTeacherForm((prev) => ({ ...prev, affiliation: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    placeholder="예: 진로진학상담부, 학생생활지도부 등"
                  />
                </div>
              </>
            )}
          </div>

          <div className="px-6 pb-6">
            <button
              type="submit"
              disabled={saving || !role}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
