import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Keeps the Supabase auth session fresh for admin pages. Uses getSession(),
 * which only performs a network refresh when the access token is actually
 * near/at expiry — on most navigations it just reads the local cookie, so it
 * does not add a round-trip to every click.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getSession();
  return response;
}

export const config = {
  /**
   * Run only on admin PAGES. Exclude the on-demand QR image route and the
   * keepalive/export endpoints so image/data requests don't pay the auth cost.
   */
  matcher: ["/admin/((?!qr/).*)"],
};
