import { useState } from "react";
import Modal from "./Modal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const KINDS = [
  { value: "thought", label: "Random thought" },
  { value: "idea",    label: "Feature idea"   },
  { value: "bug",     label: "Something broke" },
];

export default function FeedbackButton() {
  const [open,    setOpen]    = useState(false);
  const [comment, setComment] = useState("");
  const [kind,    setKind]    = useState("thought");
  const [status,  setStatus]  = useState("idle"); // idle | sending | done | error
  const [count,   setCount]   = useState(null);

  async function handleSubmit() {
    if (!comment.trim()) return;
    setStatus("sending");
    try {
      const resp = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim(), kind }),
      });
      const data = await resp.json();
      setCount(data.total_thoughts);
      setStatus("done");
      setComment("");
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setStatus("idle");
    setComment("");
  }

  return (
    <>
      {/* Floating button — top-left of header area via absolute positioning */}
      <button
        onClick={() => setOpen(true)}
        title="Leave anonymous feedback"
        style={{
          position: "fixed",
          bottom: 40,
          right: 16,
          zIndex: 800,
          background: "#1f2937",
          color: "#fff",
          border: "none",
          borderRadius: 24,
          padding: "8px 14px",
          fontSize: 12,
          fontFamily: "var(--font-body)",
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "transform 0.1s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
         Feedback :)
      </button>

      <Modal open={open} onClose={handleClose} title="Leave a thought">
        {status === "done" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🤝</p>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Received.</p>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
              Your invaluable feedback and thoughts are now stored somewhere in a server I rent for very little money.
              {count && ` You're voice #${count} in this strange little experiment.`}
            </p>
            <button
              onClick={handleClose}
              style={{
                padding: "8px 20px", background: "#1f2937", color: "#fff",
                border: "none", borderRadius: 7, cursor: "pointer",
                fontSize: 13, fontFamily: "var(--font-body)",
              }}
            >
              Close this
            </button>
          </div>
        ) : (
          <>
            <div style={{
              background: "#f9fafb", borderRadius: 8,
              padding: "12px 14px", marginBottom: 3,
              fontSize: 13, color: "#374151", lineHeight: 1.6,
              border: "1px solid #e5e7eb",
            }}>
              <br/><br/>
              Tell me what you think, what you want to see or what broke.
            </div>

            {/* Kind selector */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {KINDS.map(k => (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  style={{
                    flex: 1, padding: "6px 4px", fontSize: 11,
                    fontFamily: "var(--font-body)",
                    background: kind === k.value ? "#1f2937" : "#f3f4f6",
                    color: kind === k.value ? "#fff" : "#6b7280",
                    border: `1px solid ${kind === k.value ? "#1f2937" : "#e5e7eb"}`,
                    borderRadius: 6, cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>

            {/* Comment input */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="I love the product and want to see...."
              rows={4}
              style={{
                width: "100%", padding: "10px 12px",
                border: "1px solid #e5e7eb", borderRadius: 7,
                fontSize: 13, fontFamily: "var(--font-body)",
                resize: "vertical", outline: "none",
                lineHeight: 1.5, color: "#111827",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
                {1000 - comment.length} characters remaining
              </p>
              <button
                onClick={handleSubmit}
                disabled={!comment.trim() || status === "sending"}
                style={{
                  padding: "8px 20px",
                  background: comment.trim() ? "#1f2937" : "#9ca3af",
                  color: "#fff", border: "none", borderRadius: 7,
                  fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 500,
                  cursor: comment.trim() ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                {status === "sending" ? "Sending…" : "Sent"}
              </button>
            </div>

            {status === "error" && (
              <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8, textAlign: "center" }}>
                Something went wrong. Ironic for a feedback form.
              </p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}