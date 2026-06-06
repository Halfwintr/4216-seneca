import type { Metadata } from "next";
import { ListingView } from "@/components/ListingView";
import { buildListingMetadata } from "@/lib/listing-metadata";

// Local-dev / path-based fallback for per-listing microsites. In production,
// proxy.ts rewrites <slug>.<BASE_DOMAIN> to /listing/<slug>; this route lets
// you preview a listing at /l/<slug> without configuring wildcard subdomains.

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  return buildListingMetadata(slug, Boolean(preview));
}

export default async function ListingPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  return <ListingView slug={slug} preview={Boolean(preview)} />;
}
