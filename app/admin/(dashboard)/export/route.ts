import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Business, Card } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Escape a value for CSV (RFC 4180): wrap in quotes, double inner quotes. */
function csv(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Downloads a CSV backup of the caller's businesses and cards.
 * RLS scopes rows to admin (all) or owner (own). Requires a session.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = await createClient();
  const [{ data: bData }, { data: cData }] = await Promise.all([
    supabase.from("businesses").select("*"),
    supabase.from("cards").select("*"),
  ]);

  const businesses = (bData ?? []) as Business[];
  const cards = (cData ?? []) as Card[];
  const bName = new Map(businesses.map((b) => [b.id, b.name]));

  const lines: string[] = [];
  lines.push("record_type,id,business_id,business_name,name_or_token,type_or_status,google_review_url,created_at");

  for (const b of businesses) {
    lines.push(
      [
        csv("business"),
        csv(b.id),
        csv(b.id),
        csv(b.name),
        csv(b.name),
        csv(b.type),
        csv(b.google_review_url),
        csv(b.created_at),
      ].join(",")
    );
  }

  for (const c of cards) {
    lines.push(
      [
        csv("card"),
        csv(c.id),
        csv(c.business_id),
        csv(bName.get(c.business_id) ?? ""),
        csv(c.public_token),
        csv(c.status),
        csv(""),
        csv(c.created_at),
      ].join(",")
    );
  }

  const body = lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reviewtap-backup-${stamp}.csv"`,
    },
  });
}
