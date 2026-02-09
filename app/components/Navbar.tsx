"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-slate-800">진로 학습플랫폼</span>
      </div>
      <div className="flex items-center gap-3">
        {status === "loading" && (
          <span className="text-sm text-slate-500">로딩 중...</span>
        )}
        {status === "unauthenticated" && (
          <button
            type="button"
            onClick={() => signIn("google")}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            로그인
          </button>
        )}
        {status === "authenticated" && session?.user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-8 w-8 rounded-full ring-1 ring-slate-200"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                  {session.user.name?.[0] ?? "?"}
                </span>
              )}
              <span className="hidden text-sm text-slate-600 sm:inline">
                {session.user.name ?? session.user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
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
