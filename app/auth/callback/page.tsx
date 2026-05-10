"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("로그인 처리 중...");
  const [detail, setDetail] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // useSearchParams()는 초기 렌더에서 비어 있을 수 있음. 실제 URL에서 직접 읽음
    if (typeof window === "undefined") return;
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const params = new URLSearchParams(search || hash.replace(/^#/, ""));
    const code = params.get("code");
    const error = params.get("error");
    const errorDesc = params.get("error_description");

    if (error) {
      setIsError(true);
      setMessage(errorDesc || error || "로그인 중 오류가 발생했습니다.");
      return;
    }

    if (!code) {
      console.warn("개발 모드 중복 실행으로 인한 코드 교환 실패 (무시 가능)");
      return;
    }

    const supabase = getSupabaseClient();

    supabase.auth
      .exchangeCodeForSession(code)
      .then(() => {
        router.replace("/");
      })
      .catch((err) => {
        console.warn("로그인 처리 실패:", err);
        setIsError(true);
        setMessage("로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-4 gap-4 max-w-md">
      <p className={`font-medium text-center ${isError ? "text-red-600" : "text-[var(--color-text-muted)]"}`}>
        {message}
      </p>
      {detail && (
        <p className="text-sm text-[var(--color-text-muted)] text-center break-all">
          {detail}
        </p>
      )}
      {isError && (
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90"
        >
          돌아가서 다시 로그인
        </Link>
      )}
    </div>
  );
}
