import { useEffect } from "react";
import { createPortal } from "react-dom";

function ModalInner({ onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    // Prevent body scroll while open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        zIndex: 9999,              /* above Leaflet (400), header (1000), sheet (1500) */
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="modal-inner"
        style={{
          background: "#fff", borderRadius: 12,
          padding: "20px 20px 24px",
          width: "min(680px, 100%)",
          maxHeight: "88dvh", overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontFamily: "var(--font-body)", fontWeight: 600 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "#f3f4f6", border: "none", borderRadius: 6,
              padding: "4px 10px", cursor: "pointer",
              fontSize: 12, color: "#6b7280", fontFamily: "var(--font-body)",
            }}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  // Portal renders at document.body — escapes any stacking context
  return createPortal(
    <ModalInner onClose={onClose} title={title}>{children}</ModalInner>,
    document.body
  );
}