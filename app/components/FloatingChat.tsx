"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

type Message = { role: "user" | "assistant"; content: string };

export default function FloatingChat() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "안녕하세요. 무엇이든 질문해 주세요." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = status === "authenticated" && !!session;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!isLoggedIn) return;
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "오류가 발생했습니다. 다시 시도해 주세요.",
          },
        ]);
        return;
      }

      if (data.text) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "답변을 받지 못했습니다." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "연결에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => (isLoggedIn ? setOpen((o) => !o) : signIn("google"))}
        className="fixed bottom-6 right-6 z-50 flex h-12 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
        aria-label={open ? "챗봇 닫기" : isLoggedIn ? "챗봇 열기" : "로그인 후 챗봇 사용"}
      >
        <span className="text-lg" aria-hidden>💬</span>
        AI 챗봇
      </button>

      {/* 챗봇 패널 */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
          style={{ height: "420px" }}
          role="dialog"
          aria-label="챗봇"
        >
          {/* 헤더 */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">AI 챗봇</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="닫기"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
            {!isLoggedIn ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-600">
                <p>챗봇을 사용하려면 로그인이 필요합니다.</p>
                <button
                  type="button"
                  onClick={() => signIn("google")}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Google 로그인
                </button>
              </div>
            ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm ring-1 ring-slate-100">
                      🤖
                    </span>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-slate-800 text-white"
                        : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm text-slate-600">
                      👤
                    </span>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm ring-1 ring-slate-100">
                    🤖
                  </span>
                  <div className="rounded-2xl bg-white px-4 py-2.5 text-sm shadow-sm ring-1 ring-slate-100">
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    </span>
                  </div>
                </div>
              )}
            </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="shrink-0 border-t border-slate-100 bg-white p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoggedIn ? "메시지를 입력하세요..." : "로그인 후 이용 가능합니다"}
                disabled={loading || !isLoggedIn}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                aria-label="메시지 입력"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim() || !isLoggedIn}
                className="shrink-0 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
