import QRCode from "qrcode";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * Base URL without trailing slash. Memoized per-request with cache() so list
 * pages that build links for many cards don't re-read headers each time.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_BASE_URL env (explicit override — use in production).
 *   2. The live request host (works even if the env var was not set at build
 *      time, e.g. the first Vercel deploy before the var was added).
 *   3. http://localhost:3000 as a last resort.
 */
export const baseUrl = cache(async (): Promise<string> => {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env && !env.includes("localhost")) {
    return env.replace(/\/$/, "");
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  } catch {
    // headers() unavailable (e.g. outside a request) — fall through.
  }

  return (env || "http://localhost:3000").replace(/\/$/, "");
});

/** The QR link (static) encodes the QR source param. */
export async function qrLink(token: string): Promise<string> {
  return `${await baseUrl()}/c/${token}?s=q`;
}

/** The NFC link written to a tag encodes the NFC source param. */
export async function nfcLink(token: string): Promise<string> {
  return `${await baseUrl()}/c/${token}?s=n`;
}

/** Plain public link (no source) — shown for reference. */
export async function publicLink(token: string): Promise<string> {
  return `${await baseUrl()}/c/${token}`;
}

/**
 * Build qr/nfc/public links for a token given an already-resolved base URL.
 * Use this in list pages: resolve baseUrl() ONCE, then map over cards, instead
 * of calling the async helpers per card.
 */
export function linksFor(base: string, token: string) {
  return {
    qr: `${base}/c/${token}?s=q`,
    nfc: `${base}/c/${token}?s=n`,
    pub: `${base}/c/${token}`,
  };
}

/** Generate an SVG string QR (error correction H) for the QR link. */
export async function qrSvg(token: string): Promise<string> {
  return QRCode.toString(await qrLink(token), {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
  });
}

/** Generate a PNG data URL QR (error correction H) for the QR link. */
export async function qrPngDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(await qrLink(token), {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
  });
}
