import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: Role;
}

/** Returns the signed-in user with their role, or null if not signed in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role as Role) ?? "owner",
  };
}
