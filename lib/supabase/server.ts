import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client bound to the request cookies. Respects RLS using the
 * logged-in user's session. Use in server components, route handlers and
 * server actions where auth context matters.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component without a mutable cookie store.
            // Safe to ignore when middleware refreshes the session.
          }
        },
      },
    }
  );
}
