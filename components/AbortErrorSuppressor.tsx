"use client";

import { useEffect } from "react";

function isAbortError(err: unknown): boolean {
  if (!err) return false;
  const msg = String(typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : err);
  const name = typeof err === "object" && err !== null && "name" in err ? String((err as { name: string }).name) : "";
  return (
    name === "AbortError" ||
    name === "CanceledError" ||
    (err instanceof DOMException && err.name === "AbortError") ||
    /aborted|signal is aborted|without reason|user aborted a request|canceled/i.test(msg)
  );
}

/**
 * AbortController/취소로 인한 "signal is aborted without reason" 에러를
 * 전역에서 잡아 오버레이/콘솔에 노출되지 않게 합니다.
 */
export function AbortErrorSuppressor() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e?.reason ?? e;
      if (isAbortError(reason) || (typeof reason === "object" && reason !== null && (reason as { name?: string }).name === "AbortError")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onError = (e: ErrorEvent) => {
      const err = e?.error ?? e;
      const msg = e?.message ?? "";
      if (err && isAbortError(err)) {
        e.preventDefault();
        e.stopPropagation();
      } else if (/aborted|signal is aborted|without reason/i.test(msg)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("unhandledrejection", onRejection, true);
    window.addEventListener("error", onError, true);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection, true);
      window.removeEventListener("error", onError, true);
    };
  }, []);
  return null;
}
