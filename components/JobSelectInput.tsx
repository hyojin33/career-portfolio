"use client";

import { useState, useEffect, useRef } from "react";
import { CAREER_JOB_LIST } from "@/data/careerJobList";

type JobSelectInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
};

export function JobSelectInput({ value, onChange, placeholder = "직업을 선택해 주세요.", id, label }: JobSelectInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ no: number; name: string } | null>(null);
  const [customJobName, setCustomJobName] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

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

  const handleJobClick = (job: { no: number; name: string }) => {
    setSelectedJob(job);
    if (job.no !== 61) setCustomJobName("");
  };

  const handleConfirm = () => {
    if (selectedJob?.no === 61) {
      const name = customJobName.trim();
      onChange(name || "기타");
    } else if (selectedJob) {
      onChange(selectedJob.name);
    }
    setOpen(false);
    setSelectedJob(null);
    setCustomJobName("");
  };

  const handleCancel = () => {
    setOpen(false);
    setSelectedJob(null);
    setCustomJobName("");
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
      <input
        id={id}
        type="text"
        className="career-test-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={false}
        style={{ flex: 1, minWidth: 0 }}
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
        직업 선택
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
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>{label || "직업 선택"}</h3>
              <button
                type="button"
                onClick={handleCancel}
                style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", padding: "0.25rem", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.5 }}>
              다음은 우리나라의 주요 직업입니다. 아래 표에서 나의 희망 직업을 찾아 선택해 주세요. 61번(기타)을 선택한 경우에는 직업명을 직접 작성해 주세요.
            </p>

            {selectedJob?.no === 61 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <input
                  type="text"
                  value={customJobName}
                  onChange={(e) => setCustomJobName(e.target.value)}
                  placeholder="기타 선택 시 직업명 입력"
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

            <div
              style={{
                overflowY: "auto",
                maxHeight: "320px",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                padding: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.25rem 0.5rem",
                }}
              >
                {CAREER_JOB_LIST.map((job) => {
                  const isSelected = selectedJob?.no === job.no;
                  return (
                    <button
                      key={job.no}
                      type="button"
                      onClick={() => handleJobClick(job)}
                      style={{
                        padding: "0.4rem 0.5rem",
                        fontSize: "0.8rem",
                        textAlign: "left",
                        border: `1px solid ${isSelected ? "var(--color-primary, #2563eb)" : "#e5e7eb"}`,
                        borderRadius: "0.25rem",
                        background: isSelected ? "rgba(37, 99, 235, 0.1)" : "#fff",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
                      }}
                    >
                      {job.no}. {job.name}
                    </button>
                  );
                })}
              </div>
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
                disabled={!selectedJob || (selectedJob?.no === 61 && !customJobName.trim())}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "var(--color-primary, #2563eb)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: !selectedJob || (selectedJob?.no === 61 && !customJobName.trim()) ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  opacity: !selectedJob || (selectedJob?.no === 61 && !customJobName.trim()) ? 0.6 : 1,
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
