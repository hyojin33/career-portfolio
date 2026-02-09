"use client";

import { SessionProvider } from "next-auth/react";

// 반드시 앞에 'export'가 붙어 있어야 합니다
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
