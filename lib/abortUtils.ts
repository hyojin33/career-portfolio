/**
 * AbortController/취소로 인한 에러인지 판별.
 * fetch 취소, 요청 중단 등으로 발생하는 AbortError·CanceledError는 무시 처리.
 */
export function isAbortOrCancelError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : (typeof err === "object" && err !== null && "name" in err ? (err as { name: string }).name : "");
  return (
    name === "AbortError" ||
    name === "CanceledError" ||
    (err instanceof DOMException && err.name === "AbortError") ||
    /aborted|signal is aborted|user aborted a request|canceled/i.test(msg)
  );
}
