import { NextResponse, type NextRequest } from "next/server";
import { updateSession, copyAuthCookies } from "@/lib/supabase/middleware";

// Subdomains that are NOT treated as listing slugs.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin"]);

function getListingSlug(request: NextRequest): string | null {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  const base = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "").split(":")[0];
  if (!host || !base) return null;
  if (host === base) return null;
  if (!host.endsWith(`.${base}`)) return null;

  const subdomain = host.slice(0, -(base.length + 1));
  // Only single-label subdomains map to a listing (e.g. "123-main").
  if (!subdomain || subdomain.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

export async function proxy(request: NextRequest) {
  // Always refresh the Supabase session first so auth cookies stay fresh.
  const { response: sessionResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // ── Per-listing subdomain → /listing/<slug> ────────────────────────────────
  const slug = getListingSlug(request);
  if (slug) {
    // Only rewrite the microsite root; deeper paths fall through.
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/listing/${slug}`;
      return copyAuthCookies(sessionResponse, NextResponse.rewrite(url));
    }
    return sessionResponse;
  }

  // ── Protect the dashboard ──────────────────────────────────────────────────
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return copyAuthCookies(sessionResponse, NextResponse.redirect(url));
  }

  return sessionResponse;
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|scenes/|gaussians/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ksplat)$).*)",
  ],
};
