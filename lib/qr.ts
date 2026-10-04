import QRCode from "qrcode";

/** Base URL without trailing slash. */
export function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

/** The QR link (static) encodes the QR source param. */
export function qrLink(token: string): string {
  return `${baseUrl()}/c/${token}?s=q`;
}

/** The NFC link written to a tag encodes the NFC source param. */
export function nfcLink(token: string): string {
  return `${baseUrl()}/c/${token}?s=n`;
}

/** Plain public link (no source) — shown for reference. */
export function publicLink(token: string): string {
  return `${baseUrl()}/c/${token}`;
}

/** Generate an SVG string QR (error correction H) for the QR link. */
export function qrSvg(token: string): Promise<string> {
  return QRCode.toString(qrLink(token), {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
  });
}

/** Generate a PNG data URL QR (error correction H) for the QR link. */
export function qrPngDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(qrLink(token), {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
  });
}
