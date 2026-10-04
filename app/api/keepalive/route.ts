import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Trivial query to keep the free Supabase project from pausing.
 * Called daily by Vercel Cron. Protected by CRON_SECRET:
 * Vercel sends "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    // Cheapest possible read: count a single row.
    await supabase.from("businesses").select("id").limit(1);
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
