import type { Metadata } from "next";
import { ListingView } from "@/components/ListingView";
import { buildListingMetadata } from "@/lib/listing-metadata";

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

export default async function ListingPage({
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
