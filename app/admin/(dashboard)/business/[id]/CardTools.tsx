"use client";

import { useState } from "react";

export default function CardTools({
  token,
  qrLink,
  nfcLink,
  svg,
  png,
}: {
  token: string;
  qrLink: string;
  nfcLink: string;
  svg: string;
  png: string;
}) {
  const [copied, setCopied] = useState<"nfc" | "qr" | null>(null);
  const [showQr, setShowQr] = useState(false);

  function download(filename: string, href: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadSvg() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    download(`${token}.svg`, url);
    URL.revokeObjectURL(url);
  }

  async function copy(text: string, which: "nfc" | "qr") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowQr((v) => !v)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
        >
          {showQr ? "Hide QR" : "Show QR"}
        </button>
        <button
          onClick={downloadSvg}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
        >
          Download SVG
        </button>
        <button
          onClick={() => download(`${token}.png`, png)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
        >
          Download PNG
        </button>
        <button
          onClick={() => copy(qrLink, "qr")}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
        >
          {copied === "qr" ? "Copied!" : "Copy QR URL"}
        </button>
        <button
          onClick={() => copy(nfcLink, "nfc")}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
        >
          {copied === "nfc" ? "Copied!" : "Copy NFC URL"}
        </button>
      </div>

      {showQr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={png}
          alt={`QR code for card ${token}`}
          className="h-40 w-40 rounded border border-slate-200 bg-white p-2"
        />
      )}

      <dl className="text-xs text-slate-500">
        <div className="flex gap-1">
          <dt className="font-medium">NFC URL:</dt>
          <dd className="break-all">{nfcLink}</dd>
        </div>
      </dl>
    </div>
  );
}
