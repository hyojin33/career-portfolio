/**
 * AbortController/취소로 인한 에러인지 판별.
 * 이 에러는 요청 취소일 뿐이므로 사용자에게 경고(alert/toast)를 띄우지 않고 무시해야 함.
 */
export function isAbortOrCancelError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : (typeof err === "object" && err !== null && "name" in err ? (err as { name: string }).name : "");
  return (
    name === "AbortError" ||
    name === "CanceledError" ||
    (err instanceof DOMException && err.name === "AbortError") ||
    /aborted|signal is aborted|without reason|user aborted a request|canceled/i.test(msg)
  );
}
