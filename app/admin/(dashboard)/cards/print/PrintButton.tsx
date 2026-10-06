"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-brand px-4 py-1.5 font-semibold text-white"
    >
      Print / Save PDF
    </button>
  );
}
