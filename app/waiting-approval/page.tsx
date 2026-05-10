"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function WaitingApprovalPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function checkStatus() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_approved, school_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("프로필 조회 실패:", profileError);
        return;
      }

      // admin은 승인 여부와 상관없이 메인 페이지로 이동
      if (profile?.role === "admin") {
        router.replace("/");
        return;
      }

      // 승인된 경우 메인 페이지로 이동
      if (profile?.is_approved) {
        router.replace("/");
        return;
      }

      // 프로필 없음 또는 아직 등록 신청을 하지 않은 경우 온보딩으로
      if (!profile?.school_name?.trim()) {
        router.replace("/onboarding");
        return;
      }
    }

    checkStatus();

    // 5초마다 승인 상태 확인
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="bg-[var(--color-card)] rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-6">⏳</div>
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4">
          등록 신청이 완료되었습니다
        </h2>
        <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed">
          관리자 승인 후 이용 가능합니다.
          <br />
          승인 상태는 자동으로 확인됩니다.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">💡 안내</p>
          <p>승인이 완료되면 자동으로 메인 페이지로 이동합니다.</p>
        </div>
      </div>
    </div>
  );
}
