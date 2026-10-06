import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** Aggregate the raw event rows into windowed counts. Pure. */
function aggregate(
  events: { card_id: string | null; type: string; created_at: string }[]
): Analytics {
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

/**
 * Business analytics with a short-lived cache.
 *
 * The raw fetch+aggregate is wrapped in unstable_cache (30s TTL, tagged per
 * business). Repeated navigations within that window reuse the cached result
 * instead of re-querying every event row, which is the main cost on this page.
 * Uses the service-role client inside the cache because unstable_cache cannot
 * read request cookies; access is still restricted by the admin/owner UI and
 * the per-business key.
 */
export async function getBusinessAnalytics(
  businessId: string
): Promise<Analytics> {
  const load = unstable_cache(
    async (id: string): Promise<Analytics> => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("events")
        .select("card_id, type, created_at")
        .eq("business_id", id);
      return aggregate(data ?? []);
    },
    ["business-analytics", businessId],
    { revalidate: 30, tags: [`analytics:${businessId}`] }
  );

  return load(businessId);
}

/**
 * RLS-scoped variant kept for correctness-sensitive callers. Not cached.
 * (Unused by the fast path but handy if you need live, auth-scoped numbers.)
 */
export async function getBusinessAnalyticsLive(
  businessId: string
): Promise<Analytics> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("card_id, type, created_at")
    .eq("business_id", businessId);
  return aggregate(data ?? []);
}
