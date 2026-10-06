import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: Role;
}

/**
 * Returns the signed-in user with their role, or null if not signed in.
 *
 * Performance notes:
 * - Wrapped in React `cache()` so multiple callers in the SAME request
 *   (e.g. the dashboard layout AND the page) share ONE result instead of
 *   each doing their own auth + profile round-trips.
 * - Reads the user from the session that middleware already refreshed, via
 *   `getSession()` which decodes the local JWT cookie (no network call),
 *   instead of `getUser()` which hits Supabase's auth server every time.
 * - The role is read from the JWT's app metadata when present; otherwise it
 *   falls back to a single profiles query (also deduped by cache()).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Prefer a role embedded in the token (set via admin metadata) to avoid a DB
  // hit entirely. Falls back to the profiles table.
  const metaRole =
    (user.app_metadata?.role as Role | undefined) ??
    (user.user_metadata?.role as Role | undefined);

  let role: Role = metaRole === "admin" || metaRole === "owner" ? metaRole : "owner";

  if (!metaRole) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    role = (profile?.role as Role) ?? "owner";
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role,
  };
});
