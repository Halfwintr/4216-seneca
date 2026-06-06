import type { Metadata } from "next";
import {
  getPublishedListingBySlug,
  getListingBySlugForPreview,
} from "@/lib/listings";
import { listingFullAddress } from "@/lib/types";

/**
 * Builds per-listing SEO/OG metadata from the listing's `seo` and `hero`
 * fields. Used by both listing routes' `generateMetadata`.
 */
export async function buildListingMetadata(
  slug: string,
  preview = false,
): Promise<Metadata> {
  const listing = preview
    ? await getListingBySlugForPreview(slug)
    : await getPublishedListingBySlug(slug);
  if (!listing) {
    return { title: "Listing not found" };
  }

  const { seo, hero } = listing;
  const address = listingFullAddress(listing);
  const title = seo.ogTitle || hero.title || address || "Property Story";
  const description =
    seo.metaDescription || hero.subtitle || hero.introNarrative || address;
  const ogImage = seo.ogImage;

  return {
    title,
    description,
    openGraph: {
      title: seo.ogTitle || title,
      description: seo.ogDescription || description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}
