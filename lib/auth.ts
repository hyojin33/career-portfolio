import { getSupabaseClient } from "./supabase";

/**
 * Google OAuth로 로그인
 */
export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  const port = typeof window !== "undefined" ? window.location.port || "3000" : "3000";
  const baseUrl =
    typeof window !== "undefined" && window.location.hostname === "0.0.0.0"
      ? `http://localhost:${port}`
      : (typeof window !== "undefined" ? window.location.origin : "");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${baseUrl || "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 현재 사용자 정보 가져오기
 */
export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * 현재 세션 가져오기
 */
export async function getSession() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}
