"use client";

import { AuthProvider } from "./AuthProvider";
import { AbortErrorSuppressor } from "./AbortErrorSuppressor";
import { AbortErrorBoundary } from "./AbortErrorBoundary";

// AbortErrorSuppressor: 전역 unhandledrejection/error에서 AbortError 억제
// AbortErrorBoundary: React 트리 안에서 발생한 AbortError는 오버레이 없이 무시
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AbortErrorSuppressor />
      <AbortErrorBoundary>
        <AuthProvider>
          {children}
        </AuthProvider>
      </AbortErrorBoundary>
    </>
  );
}
