"use client";

import { useState } from "react";

/**
 * Card QR/NFC tools. QR images are fetched on demand from
 * /admin/qr/[token] (PNG or ?format=svg), so the parent page never has to
 * pre-generate QR codes for every card — this is the main lag fix.
 */
export default function CardTools({
  token,
  qrLink,
  nfcLink,
}: {
  token: string;
  qrLink: string;
  nfcLink: string;
}) {
  const [copied, setCopied] = useState<"nfc" | "qr" | null>(null);
  const [showQr, setShowQr] = useState(false);

  const pngUrl = `/admin/qr/${token}`;
  const svgUrl = `/admin/qr/${token}?format=svg`;

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
        <a
          href={`${svgUrl}&download=1`}
          download={`${token}.svg`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
        >
          SVG
        </a>
        <a
          href={pngUrl}
          download={`${token}.png`}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
        >
          PNG
        </a>
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
          src={pngUrl}
          alt={`QR code for card ${token}`}
          loading="lazy"
          className="h-40 w-40 rounded border border-slate-200 bg-white p-2"
        />
      )}

      <dl className="text-xs text-slate-500">
        <div className="flex flex-col gap-0.5">
          <dt className="font-medium">NFC URL</dt>
          <dd className="break-all">{nfcLink}</dd>
        </div>
      </dl>
    </div>
  );
}
