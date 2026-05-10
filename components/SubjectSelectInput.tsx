"use client";

import { useState, useEffect, useRef } from "react";
import { CAREER_SUBJECT_LIST } from "@/data/careerSubjectList";

const SUBJECT_OTHER_NO = 17; // 기타

type SubjectSelectInputProps = {
  valueFirst: string;
  valueSecond: string;
  onFirstChange: (value: string) => void;
  onSecondChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
  /** 기타 선택 시 직접 입력 필드 표시 (4-2 가장 싫어하는 과목 등) */
  allowCustomForOther?: boolean;
};

export function SubjectSelectInput({
  valueFirst,
  valueSecond,
  onFirstChange,
  onSecondChange,
  placeholder = "과목을 선택해 주세요.",
  id,
  label,
  allowCustomForOther = false,
}: SubjectSelectInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedFirst, setSelectedFirst] = useState<{ no: number; name: string } | null>(null);
  const [selectedSecond, setSelectedSecond] = useState<{ no: number; name: string } | null>(null);
  const [customFirst, setCustomFirst] = useState("");
  const [customSecond, setCustomSecond] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // 기존 값으로 선택 상태 초기화 (기타+직접입력 값 처리)
  useEffect(() => {
    if (open) {
      const isFirstOther = valueFirst && !CAREER_SUBJECT_LIST.find((s) => s.name === valueFirst);
      const isSecondOther = valueSecond && !CAREER_SUBJECT_LIST.find((s) => s.name === valueSecond);
      const first = valueFirst ? CAREER_SUBJECT_LIST.find((s) => s.name === valueFirst) ?? (isFirstOther ? { no: SUBJECT_OTHER_NO, name: "기타" } : null) : null;
      const second = valueSecond ? CAREER_SUBJECT_LIST.find((s) => s.name === valueSecond) ?? (isSecondOther ? { no: SUBJECT_OTHER_NO, name: "기타" } : null) : null;
      setSelectedFirst(first ?? null);
      setSelectedSecond(second ?? null);
      setCustomFirst(isFirstOther ? valueFirst : "");
      setCustomSecond(isSecondOther ? valueSecond : "");
    }
  }, [open, valueFirst, valueSecond]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleFirstClick = (subj: { no: number; name: string }) => {
    setSelectedFirst(subj);
    if (subj.no !== SUBJECT_OTHER_NO) setCustomFirst("");
    if (selectedSecond?.no === subj.no) setSelectedSecond(null);
    if (selectedSecond?.no === subj.no) setCustomSecond("");
  };

  const handleSecondClick = (subj: { no: number; name: string }) => {
    if (selectedFirst?.no === subj.no) return;
    setSelectedSecond(subj);
    if (subj.no !== SUBJECT_OTHER_NO) setCustomSecond("");
  };

  const needCustomFirst = allowCustomForOther && selectedFirst?.no === SUBJECT_OTHER_NO;
  const needCustomSecond = allowCustomForOther && selectedSecond?.no === SUBJECT_OTHER_NO;
  const customFirstOk = !needCustomFirst || customFirst.trim().length > 0;
  const customSecondOk = !needCustomSecond || customSecond.trim().length > 0;
  const canConfirm =
    selectedFirst != null &&
    selectedSecond != null &&
    selectedFirst.no !== selectedSecond.no &&
    customFirstOk &&
    customSecondOk;

  const handleConfirm = () => {
    const firstVal = selectedFirst
      ? selectedFirst.no === SUBJECT_OTHER_NO && allowCustomForOther
        ? customFirst.trim() || "기타"
        : selectedFirst.name
      : "";
    const secondVal = selectedSecond
      ? selectedSecond.no === SUBJECT_OTHER_NO && allowCustomForOther
        ? customSecond.trim() || "기타"
        : selectedSecond.name
      : "";
    onFirstChange(firstVal);
    onSecondChange(secondVal);
    setOpen(false);
    setSelectedFirst(null);
    setSelectedSecond(null);
    setCustomFirst("");
    setCustomSecond("");
  };

  const handleCancel = () => {
    setOpen(false);
    setSelectedFirst(null);
    setSelectedSecond(null);
  };

  const displayText =
    [valueFirst, valueSecond].filter(Boolean).length > 0
      ? [valueFirst, valueSecond].filter(Boolean).join(", ")
      : "";

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
      <input
        id={id}
        type="text"
        className="career-test-input"
        value={displayText}
        readOnly
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
        onClick={() => setOpen(true)}
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "var(--color-primary, #2563eb)",
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          cursor: "pointer",
          fontSize: "0.875rem",
          whiteSpace: "nowrap",
        }}
      >
        과목 선택
      </button>

      {open && (
        <div
          ref={modalRef}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          onMouseDown={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "0.5rem",
              padding: "1.25rem",
              maxWidth: "95vw",
              maxHeight: "90vh",
              width: "640px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{label || "과목 선택"}</h3>
              <button
                type="button"
                onClick={handleCancel}
                style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", padding: "0.25rem", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.5 }}>
              &lt;보기&gt;에 제시된 과목 목록을 참고하여 해당하는 교과목번호를 선택하세요.
              {allowCustomForOther && " 17번(기타) 선택 시 과목명을 직접 작성해 주세요."}
            </p>

            {/* 1순위 선택 */}
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>1순위 선택</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.25rem 0.5rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                }}
              >
                {CAREER_SUBJECT_LIST.map((subj) => {
                  const isSelected = selectedFirst?.no === subj.no;
                  const disabledBySecond = selectedSecond?.no === subj.no; // 2순위에서 선택된 과목은 1순위에서 선택 불가
                  return (
                    <button
                      key={subj.no}
                      type="button"
                      onClick={() => !disabledBySecond && handleFirstClick(subj)}
                      disabled={disabledBySecond}
                      style={{
                        padding: "0.4rem 0.5rem",
                        fontSize: "0.8rem",
                        textAlign: "left",
                        border: `1px solid ${isSelected ? "var(--color-primary, #2563eb)" : "#e5e7eb"}`,
                        borderRadius: "0.25rem",
                        background: isSelected ? "rgba(37, 99, 235, 0.1)" : disabledBySecond ? "#f3f4f6" : "#fff",
                        cursor: disabledBySecond ? "not-allowed" : "pointer",
                        opacity: disabledBySecond ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !disabledBySecond) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !disabledBySecond) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                      }}
                    >
                      {subj.no}. {subj.name}
                    </button>
                  );
                })}
              </div>
              {needCustomFirst && (
                <div style={{ marginTop: "0.5rem" }}>
                  <input
                    type="text"
                    value={customFirst}
                    onChange={(e) => setCustomFirst(e.target.value)}
                    placeholder="기타 선택 시 과목명 직접 입력"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* 2순위 선택 */}
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>2순위 선택</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.25rem 0.5rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                }}
              >
                {CAREER_SUBJECT_LIST.map((subj) => {
                  const isSelected = selectedSecond?.no === subj.no;
                  const disabledByFirst = selectedFirst?.no === subj.no; // 1순위에서 선택된 과목은 2순위에서 선택 불가
                  return (
                    <button
                      key={subj.no}
                      type="button"
                      onClick={() => !disabledByFirst && handleSecondClick(subj)}
                      disabled={disabledByFirst}
                      style={{
                        padding: "0.4rem 0.5rem",
                        fontSize: "0.8rem",
                        textAlign: "left",
                        border: `1px solid ${isSelected ? "var(--color-primary, #2563eb)" : "#e5e7eb"}`,
                        borderRadius: "0.25rem",
                        background: isSelected ? "rgba(37, 99, 235, 0.1)" : disabledByFirst ? "#f3f4f6" : "#fff",
                        cursor: disabledByFirst ? "not-allowed" : "pointer",
                        opacity: disabledByFirst ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !disabledByFirst) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !disabledByFirst) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                      }}
                    >
                      {subj.no}. {subj.name}
                    </button>
                  );
                })}
              </div>
              {needCustomSecond && (
                <div style={{ marginTop: "0.5rem" }}>
                  <input
                    type="text"
                    value={customSecond}
                    onChange={(e) => setCustomSecond(e.target.value)}
                    placeholder="기타 선택 시 과목명 직접 입력"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "var(--color-primary, #2563eb)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: canConfirm ? "pointer" : "not-allowed",
                  fontSize: "0.875rem",
                  opacity: canConfirm ? 1 : 0.6,
                }}
              >
                선택
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
