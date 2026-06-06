import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session for an incoming request (called from
 * proxy.ts). Returns the response carrying refreshed auth cookies plus the
 * resolved user, so the proxy can both keep the session alive and make
 * routing decisions (e.g. protecting the dashboard).
 *
 * IMPORTANT: cookies must be copied onto whatever response the proxy ultimately
 * returns, otherwise the refreshed session is lost. Use `copyAuthCookies`.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser — it ensures the
  // session is refreshed and avoids hard-to-debug logout bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

/**
 * Copies the refreshed auth cookies from the session response onto a different
 * response (e.g. a rewrite or redirect produced by the proxy).
 */
export function copyAuthCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}
