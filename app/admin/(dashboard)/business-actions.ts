"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** Create a business owned by the current user. */
export async function createBusiness(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  const { error } = await supabase.from("businesses").insert({
    name: String(formData.get("name") ?? "").trim(),
    type: parseType(formData.get("type")),
    summary: String(formData.get("summary") ?? "").trim() || null,
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    google_review_url: String(formData.get("google_review_url") ?? "").trim(),
    owner_user_id: user.id,
  });
  if (error) throw new Error(`Could not create business: ${error.message}`);

  revalidatePath("/admin");
}

/** Update a business. */
export async function updateBusiness(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      type: parseType(formData.get("type")),
      summary: String(formData.get("summary") ?? "").trim() || null,
      logo_url: String(formData.get("logo_url") ?? "").trim() || null,
      google_review_url: String(formData.get("google_review_url") ?? "").trim(),
    })
    .eq("id", id);
  if (error) throw new Error(`Could not update business: ${error.message}`);

  revalidatePath("/admin");
  revalidatePath(`/admin/business/${id}`);
}

/**
 * Soft-delete a business: set deleted_at. Never hard-deletes, so cards and
 * history are preserved. Allowed for admins and the owning user (RLS update
 * policy already restricts this). Owners can delete their own business.
 */
export async function deleteBusiness(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not delete business: ${error.message}`);

  revalidatePath("/admin");
  redirect("/admin");
}

/**
 * Admin provisions a business owner login: creates a Supabase auth user with
 * the given email+password (email pre-confirmed), ensures their profile role
 * is 'owner', and assigns them as owner of the chosen business so they see
 * only that business after logging in.
 */
export async function createOwnerUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const businessId = String(formData.get("business_id") ?? "");

  if (!email || password.length < 6) {
    throw new Error("Email and a password of at least 6 characters are required.");
  }

  const admin = createAdminClient();

  // Create the auth user (email confirmed so they can log in immediately).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    throw new Error(`Could not create user: ${createErr?.message ?? "unknown"}`);
  }

  const userId = created.user.id;

  // Ensure a profile row exists with role 'owner' (the signup trigger may also
  // create one; upsert makes this idempotent).
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ user_id: userId, role: "owner" }, { onConflict: "user_id" });
  if (profErr) throw new Error(`Could not set profile: ${profErr.message}`);

  // Assign the business to this owner, if one was chosen.
  if (businessId) {
    const { error: assignErr } = await admin
      .from("businesses")
      .update({ owner_user_id: userId })
      .eq("id", businessId);
    if (assignErr) {
      throw new Error(`User created, but assigning business failed: ${assignErr.message}`);
    }
  }

  revalidatePath("/admin/users");
}
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  if (user.role !== "admin") {
    throw new Error(
      "Only an admin can mint or assign cards. Set your profile role to 'admin'."
    );
  }
  return user;
}

/**
 * Mint a batch of blank, UNASSIGNED cards into the pool. Tokens come from a
 * global DB sequence (A001, A002, …) so they are unique and never reused.
 * Uses the service role for the insert so it works regardless of RLS timing,
 * after confirming the caller is an admin.
 */
export async function mintCards(formData: FormData) {
  await requireAdmin();

  const count = Math.max(
    1,
    Math.min(500, parseInt(String(formData.get("count") ?? "1"), 10) || 1)
  );

  const admin = createAdminClient();

  // Pull `count` tokens from the DB sequence.
  const tokens: string[] = [];
  for (let i = 0; i < count; i++) {
    const { data, error } = await admin.rpc("next_card_token");
    if (error) throw new Error(`Could not mint tokens: ${error.message}`);
    tokens.push(data as unknown as string);
  }

  const rows = tokens.map((t) => ({
    public_token: t,
    business_id: null,
    status: "unassigned" as const,
  }));

  const { error } = await admin.from("cards").insert(rows);
  if (error) throw new Error(`Could not create cards: ${error.message}`);

  revalidatePath("/admin/cards");
}

/**
 * Assign an existing pool card to a business and activate it.
 * Admin-only. Reassigning is allowed (moves the card to another business).
 */
export async function assignCard(formData: FormData) {
  await requireAdmin();
  const cardId = String(formData.get("card_id") ?? "");
  const businessId = String(formData.get("business_id") ?? "");
  if (!cardId || !businessId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("cards")
    .update({ business_id: businessId, status: "active" })
    .eq("id", cardId);
  if (error) throw new Error(`Could not assign card: ${error.message}`);

  revalidatePath("/admin/cards");
  revalidatePath(`/admin/business/${businessId}`);
}

/** Unassign a card: detach from its business and return it to the pool. */
export async function unassignCard(formData: FormData) {
  await requireAdmin();
  const cardId = String(formData.get("card_id") ?? "");
  if (!cardId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("cards")
    .update({ business_id: null, status: "unassigned" })
    .eq("id", cardId);
  if (error) throw new Error(`Could not unassign card: ${error.message}`);

  revalidatePath("/admin/cards");
}

/** Toggle an assigned card between active and disabled (never delete). */
export async function setCardStatus(formData: FormData) {
  const cardId = String(formData.get("card_id") ?? "");
  const businessId = String(formData.get("business_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!cardId || (status !== "active" && status !== "disabled")) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ status })
    .eq("id", cardId);
  if (error) throw new Error(`Could not update card: ${error.message}`);

  revalidatePath("/admin/cards");
  if (businessId) revalidatePath(`/admin/business/${businessId}`);
}
