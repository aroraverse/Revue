"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { BusinessType } from "@/lib/types";

const TYPES: BusinessType[] = [
  "restaurant",
  "cafe",
  "salon",
  "clinic",
  "retail",
  "other",
];

function parseType(v: FormDataEntryValue | null): BusinessType {
  const s = String(v ?? "other");
  return (TYPES as string[]).includes(s) ? (s as BusinessType) : "other";
}

/** Create a business owned by the current user. RLS enforces ownership. */
export async function createBusiness(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("businesses").insert({
    name: String(formData.get("name") ?? "").trim(),
    type: parseType(formData.get("type")),
    summary: String(formData.get("summary") ?? "").trim() || null,
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    google_review_url: String(formData.get("google_review_url") ?? "").trim(),
    owner_user_id: user.id,
  });

  revalidatePath("/admin");
}

/** Update a business. RLS restricts to admin or owner. */
export async function updateBusiness(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("businesses")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      type: parseType(formData.get("type")),
      summary: String(formData.get("summary") ?? "").trim() || null,
      logo_url: String(formData.get("logo_url") ?? "").trim() || null,
      google_review_url: String(formData.get("google_review_url") ?? "").trim(),
    })
    .eq("id", id);

  revalidatePath("/admin");
  revalidatePath(`/admin/business/${id}`);
}

/**
 * Create the next card for a business. Tokens are sequential like A001, A002…
 * computed from the current max token for THIS business, and never reused.
 */
export async function createCard(formData: FormData) {
  const businessId = String(formData.get("business_id") ?? "");
  if (!businessId) return;

  const supabase = await createClient();

  // Find the highest existing numeric suffix for this business's tokens.
  const { data: cards } = await supabase
    .from("cards")
    .select("public_token")
    .eq("business_id", businessId);

  let maxNum = 0;
  for (const c of cards ?? []) {
    const m = /^[A-Za-z]*(\d+)$/.exec(c.public_token);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  const next = `A${String(maxNum + 1).padStart(3, "0")}`;

  await supabase.from("cards").insert({
    business_id: businessId,
    public_token: next,
    status: "active",
  });

  revalidatePath(`/admin/business/${businessId}`);
}

/** Toggle a card between active and disabled (never delete). */
export async function setCardStatus(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  const businessId = String(formData.get("business_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!cardId || (status !== "active" && status !== "disabled")) return;

  const supabase = await createClient();
  await supabase.from("cards").update({ status }).eq("id", cardId);

  revalidatePath(`/admin/business/${businessId}`);
}
