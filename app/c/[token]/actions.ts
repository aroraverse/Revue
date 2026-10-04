"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { EventType } from "@/lib/types";

/** Log an event. Used for GOOGLE_CLICK from the client; QR/NFC/UNKNOWN are
 * logged server-side on page load. Never throws to the caller. */
export async function logEvent(params: {
  cardId: string;
  businessId: string;
  type: EventType;
  userAgent?: string | null;
  referrer?: string | null;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("events").insert({
      card_id: params.cardId,
      business_id: params.businessId,
      type: params.type,
      user_agent: params.userAgent ?? null,
      referrer: params.referrer ?? null,
    });
  } catch {
    // Analytics logging must never break the customer flow.
  }
}

/** Save one feedback row for a completed submission (all star levels). */
export async function saveFeedback(params: {
  cardId: string;
  businessId: string;
  stars: number;
  tags: string[];
  note: string | null;
  draftComment: string | null;
}): Promise<{ ok: boolean }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("feedback").insert({
      card_id: params.cardId,
      business_id: params.businessId,
      stars: params.stars,
      tags: params.tags,
      note: params.note,
      draft_comment: params.draftComment,
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
