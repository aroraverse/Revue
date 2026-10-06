import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { qrLink } from "@/lib/qr";

export const dynamic = "force-dynamic";

/**
 * On-demand QR generation. Returns a PNG (default) or SVG (?format=svg) for a
 * token. Generating QRs here — only when actually requested/downloaded — keeps
 * them off the hot path of admin page renders, which fixes the perceived lag
 * when a business or the pool has many cards.
 *
 * Error correction level H (highest) for durable printed cards.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const format = request.nextUrl.searchParams.get("format");
  const link = await qrLink(token);

  if (format === "svg") {
    const svg = await QRCode.toString(link, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 1,
      width: 512,
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const buffer = await QRCode.toBuffer(link, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
