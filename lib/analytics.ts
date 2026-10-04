import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";

export interface Counts {
  QR: number;
  NFC: number;
  GOOGLE_CLICK: number;
  UNKNOWN: number;
}

export interface Analytics {
  total: Counts;
  last7: Counts;
  last30: Counts;
  perCard: Record<string, Counts>; // keyed by card_id
}

function emptyCounts(): Counts {
  return { QR: 0, NFC: 0, GOOGLE_CLICK: 0, UNKNOWN: 0 };
}

function add(target: Counts, type: EventType) {
  target[type] += 1;
}

/**
 * Pull all events for a business and aggregate in memory. Event volume per
 * business on the free tier is small, so this avoids extra round-trips.
 */
export async function getBusinessAnalytics(
  businessId: string
): Promise<Analytics> {
  const supabase = await createClient();
  // RLS ensures the caller may only read events for businesses they can see.
  const { data } = await supabase
    .from("events")
    .select("card_id, type, created_at")
    .eq("business_id", businessId);

  const events = data ?? [];
  const now = Date.now();
  const d7 = now - 7 * 24 * 60 * 60 * 1000;
  const d30 = now - 30 * 24 * 60 * 60 * 1000;

  const analytics: Analytics = {
    total: emptyCounts(),
    last7: emptyCounts(),
    last30: emptyCounts(),
    perCard: {},
  };

  for (const e of events) {
    const type = e.type as EventType;
    const ts = new Date(e.created_at).getTime();

    add(analytics.total, type);
    if (ts >= d30) add(analytics.last30, type);
    if (ts >= d7) add(analytics.last7, type);

    if (e.card_id) {
      if (!analytics.perCard[e.card_id]) {
        analytics.perCard[e.card_id] = emptyCounts();
      }
      add(analytics.perCard[e.card_id], type);
    }
  }

  return analytics;
}
