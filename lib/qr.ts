import QRCode from "qrcode";
import { headers } from "next/headers";

/**
 * Base URL without trailing slash.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_BASE_URL env (explicit override — use in production).
 *   2. The live request host (works even if the env var was not set at build
 *      time, e.g. the first Vercel deploy before the var was added).
 *   3. http://localhost:3000 as a last resort.
 *
 * Because NEXT_PUBLIC_* values are inlined at BUILD time, option 2 is what
 * saves you when the env var is wrong/missing on the deployed build.
 */
export async function baseUrl(): Promise<string> {
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
}

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
