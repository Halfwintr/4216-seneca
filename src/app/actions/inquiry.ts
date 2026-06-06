"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface InquiryState {
  ok: boolean;
  error?: string;
}

/**
 * Public lead capture. Runs server-side only and writes via the service role
 * after explicitly verifying the target listing is published. Routing inserts
 * through this trusted action (rather than relying on an anonymous RLS insert
 * policy) keeps the leads table off the public write API and leaves room for
 * validation / rate limiting later.
 */
export async function submitInquiry(
  _prevState: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const listingId = String(formData.get("listingId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!listingId) {
    return { ok: false, error: "Missing listing reference." };
  }
  if (!contact) {
    return { ok: false, error: "Please include a way to reach you." };
  }

  const admin = createAdminClient();

  // Only accept inquiries for published listings.
  const { data: listing } = await admin
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .maybeSingle<{ id: string; status: string }>();

  if (!listing || listing.status !== "published") {
    return { ok: false, error: "This listing isn't accepting inquiries." };
  }

  const { error } = await admin.from("leads").insert({
    listing_id: listingId,
    name: name || null,
    contact,
    message: message || null,
    source: "web",
  });

  if (error) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}
