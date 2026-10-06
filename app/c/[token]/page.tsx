import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Business, Card, EventType } from "@/lib/types";
import { tagsForType } from "@/lib/tags";
import ReviewFlow from "./ReviewFlow";
import FriendlyMessage from "./FriendlyMessage";

export const dynamic = "force-dynamic";

type LookupResult =
  | { kind: "ok"; card: Card; business: Business }
  | { kind: "disabled" }
  | { kind: "unknown" }
  | { kind: "db_error" };

async function lookupCard(token: string): Promise<LookupResult> {
  try {
    const supabase = createAdminClient();
    const { data: card, error } = await supabase
      .from("cards")
      .select("*")
      .eq("public_token", token)
      .maybeSingle();

    if (error) return { kind: "db_error" };
    if (!card) return { kind: "unknown" };
    // Pre-minted pool card not yet assigned to a business.
    if (card.status === "unassigned" || !card.business_id) {
      return { kind: "disabled" };
    }
    if (card.status !== "active") return { kind: "disabled" };

    const { data: business, error: bErr } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", card.business_id)
      .maybeSingle();

    if (bErr) return { kind: "db_error" };
    if (!business) return { kind: "unknown" };

    return { kind: "ok", card: card as Card, business: business as Business };
  } catch {
    return { kind: "db_error" };
  }
}

function sourceToEventType(s: string | undefined): EventType {
  if (s === "q") return "QR";
  if (s === "n") return "NFC";
  return "UNKNOWN";
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { token } = await params;
  const { s } = await searchParams;

  const result = await lookupCard(token);

  if (result.kind === "db_error") {
    return (
      <FriendlyMessage
        emoji="😕"
        title="Something went wrong"
        body="We couldn't load this page right now. Please try again in a moment."
        showRetry
      />
    );
  }

  if (result.kind === "unknown") {
    return (
      <FriendlyMessage
        emoji="🔍"
        title="Card not found"
        body="This card isn't recognized. If you think this is a mistake, please let the business know."
      />
    );
  }

  if (result.kind === "disabled") {
    return (
      <FriendlyMessage
        emoji="💤"
        title="This card is inactive"
        body="This review card is currently turned off. Please check with the business."
      />
    );
  }

  // Log the scan/tap event server-side. Never blocks rendering.
  const hdrs = await headers();
  const eventType = sourceToEventType(s);
  try {
    const supabase = createAdminClient();
    await supabase.from("events").insert({
      card_id: result.card.id,
      business_id: result.business.id,
      type: eventType,
      user_agent: hdrs.get("user-agent"),
      referrer: hdrs.get("referer"),
    });
  } catch {
    // ignore logging failures
  }

  return (
    <ReviewFlow
      cardId={result.card.id}
      businessId={result.business.id}
      businessName={result.business.name}
      businessType={result.business.type}
      logoUrl={result.business.logo_url}
      googleReviewUrl={result.business.google_review_url}
      tags={tagsForType(result.business.type)}
    />
  );
}
