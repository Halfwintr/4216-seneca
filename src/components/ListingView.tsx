import { notFound } from "next/navigation";
import {
  getPublishedListingBySlug,
  getListingBySlugForPreview,
} from "@/lib/listings";
import { ListingExperience } from "./ListingExperience";

/**
 * Server component that resolves a listing by slug and renders the cinematic
 * experience. In `preview` mode it fetches without the published filter so the
 * owner can view their draft (RLS still restricts drafts to the owner).
 */
export async function ListingView({
  slug,
  preview = false,
}: {
  slug: string;
  preview?: boolean;
}) {
  const listing = preview
    ? await getListingBySlugForPreview(slug)
    : await getPublishedListingBySlug(slug);
  if (!listing) notFound();

  return (
    <>
      {preview && listing.status !== "published" && (
        <div className="fixed inset-x-0 top-0 z-[70] bg-amber-warm/90 py-1.5 text-center font-sans text-[11px] uppercase tracking-[0.18em] text-stone-950">
          Draft preview — not publicly visible
        </div>
      )}
      <ListingExperience listing={listing} />
    </>
  );
}
