"use client";

import { useAuth } from "./AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link"; // Next.js 링크 컴포넌트 추가

export default function Navbar() {
  // AuthProvider에서 profile 정보를 함께 가져옵니다.
  const { user, profile, loading, signIn } = useAuth();

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // 1. Supabase 로그아웃 (현재 탭 세션 정리)
      await supabase.auth.signOut({ scope: 'local' });

      // 2. 페이지를 메인으로 이동시키며 브라우저 메모리 초기화
      window.location.assign('/'); 

    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
      window.location.assign('/');
    }
  };

  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-lg font-semibold text-slate-800">
          진로 학습플랫폼
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {loading && (
          <span className="text-sm text-slate-500">로딩 중...</span>
        )}
        
        {!loading && !user && (
          <button
            type="button"
            onClick={signIn}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            로그인
          </button>
        )}
        
        {!loading && user && (
          <div className="flex items-center gap-3">
            {/* [추가] 관리자 권한(admin)일 때만 보이는 승인 관리 버튼 */}
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                회원 승인 관리
              </Link>
            )}

            <div className="flex items-center gap-2">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full ring-1 ring-slate-200"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                  {(user.user_metadata?.full_name || user.email)?.[0] ?? "?"}
                </span>
              )}
              <span className="hidden text-sm text-slate-600 sm:inline">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
            
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
