"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ padding: "8px 20px", background: "#111", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
