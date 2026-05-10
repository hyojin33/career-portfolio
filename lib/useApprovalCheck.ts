import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { isAbortOrCancelError } from "@/lib/isAbortError";

/**
 * 승인 상태 체크 훅
 * is_approved가 false인 사용자는 /waiting-approval로 리다이렉트
 * admin 역할을 가진 사용자는 승인 여부와 상관없이 접근 가능
 */
export function useApprovalCheck() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function checkApproval() {
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
        .select("is_approved, role, school_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        if (isAbortOrCancelError(profileError)) return;
        console.error("프로필 조회 실패:", profileError);
        setChecking(false);
        return;
      }

      // admin은 승인 여부와 상관없이 접근 가능
      if (profile?.role === "admin") {
        setIsApproved(true);
        setChecking(false);
        return;
      }

      // 온보딩이 완료되지 않았으면 온보딩 페이지로 리다이렉트
      if (!profile?.school_name?.trim()) {
        router.replace("/onboarding");
        return;
      }

      // 승인되지 않은 경우 waiting-approval 페이지로 리다이렉트
      if (!profile?.is_approved) {
        router.replace("/waiting-approval");
        return;
      }

      setIsApproved(true);
      setChecking(false);
    }

    checkApproval();
  }, [router]);

  return { checking, isApproved };
}
