// lib/safeFetch.ts
interface SafeFetchOptions extends RequestInit {
  accessToken?: string | null;
}

/**
 * fetch 래핑. AbortError/CanceledError 시 콘솔에 찍지 않고 null 반환.
 * 인증 토큰이 있으면 자동으로 Authorization 헤더 추가.
 */
export async function safeFetch(
  url: RequestInfo | URL,
  options: SafeFetchOptions = {}
): Promise<Response | null> {
  try {
    const headers = new Headers(options.headers);

    // accessToken이 있으면 자동으로 헤더 추가
    if (options.accessToken) {
      headers.set("Authorization", `Bearer ${options.accessToken}`);
    }
    // 실제 fetch 실행
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return response;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    // [핵심] AbortError는 에러가 아님. 그냥 null 반환하고 종료. 콘솔에 안 찍음.
    if (err?.name === "AbortError" || err?.name === "CanceledError") {
      return null;
    }
    if (err?.message && /aborted|signal is aborted|without reason/i.test(String(err.message))) {
      return null;
    }
    // 진짜 에러는 콘솔에 찍고 throw
    console.error(`[SafeFetch Error] ${url}:`, error);
    throw error;
  }
}
