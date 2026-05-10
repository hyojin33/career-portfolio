"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { isAbortOrCancelError } from "@/lib/isAbortError";
import type { User, Session } from "@supabase/supabase-js";

type Profile = {
  role: string | null;
  is_approved: boolean;
  school_name: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = getSupabaseClient();
  /** Strict Mode 등으로 인한 중복 실행 방지 (코드 교환은 한 번만) */
  const isProcessing = useRef(false);

  // 어떤 상황에서도 로딩이 끝나도록 최대 대기 후 강제 해제 (확인 중... 멈춤 방지)
  useEffect(() => {
    const fallback = setTimeout(() => setLoading(false), 10_000);
    return () => clearTimeout(fallback);
  }, []);

  // 프로필 정보를 가져오는 함수 (행이 없어도 에러가 나지 않도록 maybeSingle 사용)
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("school_name, is_approved, role")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("프로필 로드 실패:", error);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      if (isAbortOrCancelError(err)) return null;
      console.warn("프로필 로드 실패:", err);
      return null;
    }
  };

  // 프로필이 없으면 생성. 첫 사용자는 admin, 이후는 student (DB 함수 사용. 실패 시 직접 insert)
  const ensureProfile = async (user: User): Promise<Profile | null> => {
    try {
      let profileData = await fetchProfile(user.id);
      if (profileData) return profileData;

      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email ||
        "";

      const { error: rpcError } = await supabase.rpc("ensure_profile", {
        p_id: user.id,
        p_name: name || "",
      });

      if (rpcError) {
        // RPC 없음/실패 시 직접 생성 (role=student. 첫 사용자 admin은 006 마이그레이션 필요)
        console.warn("ensure_profile RPC 실패, 직접 생성 시도:", rpcError.message);
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          name: name || null,
        });
        if (insertError) {
          console.warn("프로필 직접 생성도 실패:", insertError);
          return null;
        }
      }
      return fetchProfile(user.id);
    } catch (err) {
      if (isAbortOrCancelError(err)) return null;
      throw err;
    }
  };

  useEffect(() => {
    const INITIAL_TIMEOUT_MS = 5000; // 5초 안에 응답 없으면 무제한 재시도 (타임아웃 시 null로 착각해 끊김 방지)

    const initialize = async () => {
      // 1. 이미 처리 중이면 중단 (Strict Mode 방어 — 코드 교환 중복 방지)
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        // 2. 세션 확인 (타임아웃 시에도 null로 처리하지 않고 getSession 완료까지 대기)
        let sessionResult: Session | null = null;
        try {
          const raced = await Promise.race([
            supabase.auth.getSession().then(({ data: { session: s }, error }) => {
              if (error) throw error;
              return s;
            }),
            new Promise<"TIMEOUT">((resolve) => setTimeout(() => resolve("TIMEOUT"), INITIAL_TIMEOUT_MS)),
          ]);
          if (raced === "TIMEOUT") {
            const { data: { session } } = await supabase.auth.getSession();
            sessionResult = session ?? null;
          } else {
            sessionResult = raced;
          }
        } catch (sessionError: unknown) {
          if (isAbortOrCancelError(sessionError)) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              sessionResult = session ?? null;
            } catch {
              sessionResult = null;
            }
          } else {
            const msg = String(sessionError instanceof Error ? sessionError.message : sessionError);
            if (/refresh.?token|invalid.?token/i.test(msg)) {
              await supabase.auth.signOut({ scope: "local" });
              setSession(null);
              setUser(null);
              setProfile(null);
              setLoading(false);
              return;
            }
            throw sessionError;
          }
        }

        // 3. 세션 없고 URL에 code 있으면 (리다이렉트가 /로 온 경우) 코드 교환 — 한 번만 실행되도록 위에서 락
        if (!sessionResult && typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const code = params.get("code");
          if (code) {
            try {
              const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              sessionResult = session ?? null;
              if (sessionResult) {
                window.history.replaceState({}, "", window.location.pathname);
              }
            } catch (e) {
              console.warn("Auth check failed (silent):", e);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                sessionResult = session ?? null;
              } catch {
                sessionResult = null;
              }
            } finally {
              setLoading(false);
              if (typeof window !== "undefined") {
                router.replace(window.location.pathname);
              }
            }
          }
        }

        const initialSession = sessionResult ?? null;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const profileData = await ensureProfile(initialSession.user);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (isAbortOrCancelError(error)) return;
        console.warn("인증 초기화 중 에러:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // 인증 상태 변경 감지 (AbortError는 무시해 오버레이가 뜨지 않게 함)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      void (async () => {
        try {
          if (newSession?.user) {
            const profileData = await ensureProfile(newSession.user);
            setProfile(profileData);

            if (typeof window === "undefined") return;
            if (window.location.pathname === "/auth/callback") {
              if (profileData?.role === "admin") {
                router.replace("/admin");
              } else if (!profileData?.school_name?.trim()) {
                router.replace("/onboarding");
              } else if (!profileData?.is_approved) {
                router.replace("/waiting-approval");
              } else {
                router.replace("/");
              }
            }
          } else {
            setProfile(null);
          }
        } catch (err) {
          if (isAbortOrCancelError(err)) return;
          console.warn("인증 상태 변경 처리 중 오류:", err);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signIn = async () => {
    // 0.0.0.0은 브라우저에서 접속 불가하므로, 로그인 후 리다이렉트는 localhost로 보냄
    const port = window.location.port || "3000";
    const baseUrl =
      window.location.hostname === "0.0.0.0"
        ? `http://localhost:${port}`
        : window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setProfile(null);
    window.location.assign('/'); 
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
