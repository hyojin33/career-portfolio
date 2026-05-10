"use client";

import type { ReactNode } from "react";

/**
 * AI 피드백 텍스트를 파싱하여 **bold**, 단락, 리스트를 세련되게 렌더링합니다.
 */
function parseFeedbackText(text: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  const paragraphs = text.trim().split(/\n\n+/);

  paragraphs.forEach((para, idx) => {
    const trimmed = para.trim();
    if (!trimmed) return;

    const lines = trimmed.split("\n");
    const firstLine = lines[0] || "";

    if (
      /^[-•*]\s/.test(firstLine) ||
      (lines.length > 1 && lines.some((l) => /^[-•*]\s/.test(l)))
    ) {
      const items = trimmed
        .split(/\n/)
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);
      blocks.push(
        <ul
          key={idx}
          className="ai-feedback-list"
          style={{
            margin: "0.75rem 0 0",
            paddingLeft: "1.25rem",
            listStyle: "disc",
          }}
        >
          {items.map((item, i) => (
            <li key={i} className="ai-feedback-list-item">
              {parseBold(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      const isLead = idx === 0;
      blocks.push(
        <p
          key={idx}
          className={isLead ? "ai-feedback-lead" : "ai-feedback-para"}
          style={{
            margin: idx === 0 ? 0 : "0.875rem 0 0",
            lineHeight: 1.8,
          }}
        >
          {parseBold(trimmed)}
        </p>
      );
    }
  });

  return blocks;
}

/** **text** → <strong>text</strong> */
function parseBold(str: string): ReactNode {
  const parts: ReactNode[] = [];
  let key = 0;

  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{str.slice(lastIndex, match.index)}</span>
      );
    }
    parts.push(
      <strong key={key++} className="ai-feedback-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return str;
  if (lastIndex < str.length) {
    parts.push(<span key={key++}>{str.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}

type AiFeedbackCardProps = {
  feedback: string;
};

export function AiFeedbackCard({ feedback }: AiFeedbackCardProps) {
  const isError = feedback.startsWith("오류:");
  return (
    <div className="ai-feedback-card">
      <div className={`ai-feedback-card-accent ${isError ? "ai-feedback-card-accent-error" : ""}`} />
      <div className="ai-feedback-card-body">
        <div className={`ai-feedback-card-badge ${isError ? "ai-feedback-card-badge-error" : ""}`}>
          {isError ? "오류" : "AI 종합 의견"}
        </div>
        <div className="ai-feedback-card-content">
          {parseFeedbackText(feedback)}
        </div>
      </div>
    </div>
  );
}
