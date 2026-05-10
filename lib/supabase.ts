import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = SUPABASE_URL?.trim();
  const anonKey = SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    throw new Error(
      `Supabase 환경 변수가 없습니다. .env.local에 다음 변수를 설정해 주세요: ${missing.join(", ")}`
    );
  }

  return { url, anonKey };
}

let client: SupabaseClient | null = null;

/**
 * Supabase 브라우저 클라이언트 싱글톤.
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY가 없으면 에러를 던집니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = getSupabaseEnv();
    client = createClient(url, anonKey);
  }
  return client;
}

/**
 * Access token을 명시적으로 담은 클라이언트 (Storage 등 인증 필수 API용).
 * RLS/정책에서 auth.uid()를 사용할 때 JWT가 확실히 전달되도록 합니다.
 */
export function getSupabaseClientWithToken(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
