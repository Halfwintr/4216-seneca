import { createClient } from "@/lib/supabase/server";
import type {
  AssetRow,
  LeadRow,
  Listing,
  ListingRow,
  Moment,
  MomentRow,
  Scene,
  SceneRow,
  ShotType,
  TextAlign,
} from "@/lib/types";

const ASSET_BUCKET = "listing-assets";

// ─── Row → view-model mapping ─────────────────────────────────────────────────

function mapMoment(row: MomentRow): Moment {
  return {
    id: row.id,
    image: row.image_path ?? "",
    frameSequencePath: row.frame_sequence_path,
    isTitle: row.is_title,
    eyebrow: row.eyebrow ?? undefined,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    body: row.body ?? undefined,
    align: (row.align as TextAlign) ?? "left",
    scrollVh: row.scroll_vh ?? undefined,
    shotType: (row.shot_type as ShotType) ?? undefined,
    renderCandidate: row.render_candidate ?? undefined,
  };
}

function mapScene(row: SceneRow, moments: MomentRow[]): Scene {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    moments: moments
      .filter((m) => m.scene_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(mapMoment),
  };
}

export function mapListing(
  listing: ListingRow,
  scenes: SceneRow[],
  moments: MomentRow[],
): Listing {
  return {
    id: listing.id,
    ownerId: listing.owner_id,
    slug: listing.slug,
    status: listing.status,
    addressLine: listing.address_line ?? undefined,
    city: listing.city ?? undefined,
    state: listing.state ?? undefined,
    postalCode: listing.postal_code ?? undefined,
    listingType: listing.listing_type ?? undefined,
    occupancy: listing.occupancy ?? undefined,
    hero: listing.hero ?? {},
    facts: listing.facts ?? {},
    contact: listing.contact ?? {},
    branding: listing.branding ?? {},
    seo: listing.seo ?? {},
    openHouse: listing.open_house ?? null,
    questionnaire: listing.questionnaire ?? {},
    aiGenerated: listing.ai_generated ?? false,
    scenes: scenes
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => mapScene(s, moments)),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches a published listing with its scenes and moments by slug. Returns null
 * if no published listing matches. RLS guarantees only published rows are
 * visible to anonymous visitors.
 */
export async function getPublishedListingBySlug(
  slug: string,
): Promise<Listing | null> {
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle<ListingRow>();

  if (!listing) return null;

  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("listing_id", listing.id)
    .order("position", { ascending: true });

  const sceneRows = (scenes ?? []) as SceneRow[];
  const sceneIds = sceneRows.map((s) => s.id);

  let momentRows: MomentRow[] = [];
  if (sceneIds.length > 0) {
    const { data: moments } = await supabase
      .from("moments")
      .select("*")
      .in("scene_id", sceneIds)
      .order("position", { ascending: true });
    momentRows = (moments ?? []) as MomentRow[];
  }

  return mapListing(listing, sceneRows, momentRows);
}

/**
 * Fetches a listing by slug for owner preview — WITHOUT the published filter.
 * RLS still applies: a draft is only returned to its owner (owner_all), while
 * published listings remain readable by anyone. Used by the editor's Preview.
 */
export async function getListingBySlugForPreview(
  slug: string,
): Promise<Listing | null> {
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<ListingRow>();

  if (!listing) return null;

  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("listing_id", listing.id)
    .order("position", { ascending: true });

  const sceneRows = (scenes ?? []) as SceneRow[];
  const sceneIds = sceneRows.map((s) => s.id);

  let momentRows: MomentRow[] = [];
  if (sceneIds.length > 0) {
    const { data: moments } = await supabase
      .from("moments")
      .select("*")
      .in("scene_id", sceneIds)
      .order("position", { ascending: true });
    momentRows = (moments ?? []) as MomentRow[];
  }

  return mapListing(listing, sceneRows, momentRows);
}

/**
 * Fetches a listing (any status) owned by the current user, with scenes and
 * moments. Used by the dashboard editor. Returns null if not found or not owned
 * (RLS enforces ownership).
 */
export async function getOwnedListingById(id: string): Promise<Listing | null> {
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle<ListingRow>();

  if (!listing) return null;

  const { data: scenes } = await supabase
    .from("scenes")
    .select("*")
    .eq("listing_id", listing.id)
    .order("position", { ascending: true });

  const sceneRows = (scenes ?? []) as SceneRow[];
  const sceneIds = sceneRows.map((s) => s.id);

  let momentRows: MomentRow[] = [];
  if (sceneIds.length > 0) {
    const { data: moments } = await supabase
      .from("moments")
      .select("*")
      .in("scene_id", sceneIds)
      .order("position", { ascending: true });
    momentRows = (moments ?? []) as MomentRow[];
  }

  return mapListing(listing, sceneRows, momentRows);
}

export interface ListingSummary {
  id: string;
  slug: string;
  status: ListingRow["status"];
  title: string;
  heroImage: string | null;
  city: string | null;
  state: string | null;
  leadCount: number;
  updatedAt: string;
}

/**
 * Lists the current user's listings with hero image + lead counts for the
 * dashboard. RLS restricts results to listings the user owns.
 */
export async function getOwnerListingSummaries(): Promise<ListingSummary[]> {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .order("updated_at", { ascending: false });

  const rows = (listings ?? []) as ListingRow[];
  if (rows.length === 0) return [];

  const listingIds = rows.map((l) => l.id);

  // Hero image: first scene's first moment image (best-effort, single query).
  const { data: scenes } = await supabase
    .from("scenes")
    .select("id, listing_id, position")
    .in("listing_id", listingIds)
    .order("position", { ascending: true });

  const firstSceneByListing = new Map<string, string>();
  for (const s of (scenes ?? []) as Pick<
    SceneRow,
    "id" | "listing_id" | "position"
  >[]) {
    if (!firstSceneByListing.has(s.listing_id)) {
      firstSceneByListing.set(s.listing_id, s.id);
    }
  }

  const firstSceneIds = [...firstSceneByListing.values()];
  const heroByScene = new Map<string, string>();
  if (firstSceneIds.length > 0) {
    const { data: moments } = await supabase
      .from("moments")
      .select("scene_id, image_path, position")
      .in("scene_id", firstSceneIds)
      .order("position", { ascending: true });
    for (const m of (moments ?? []) as Pick<
      MomentRow,
      "scene_id" | "image_path" | "position"
    >[]) {
      if (m.scene_id && m.image_path && !heroByScene.has(m.scene_id)) {
        heroByScene.set(m.scene_id, m.image_path);
      }
    }
  }

  // Lead counts.
  const { data: leads } = await supabase
    .from("leads")
    .select("listing_id")
    .in("listing_id", listingIds);
  const leadCounts = new Map<string, number>();
  for (const l of (leads ?? []) as { listing_id: string }[]) {
    leadCounts.set(l.listing_id, (leadCounts.get(l.listing_id) ?? 0) + 1);
  }

  return rows.map((l) => {
    const firstSceneId = firstSceneByListing.get(l.id);
    return {
      id: l.id,
      slug: l.slug,
      status: l.status,
      title: l.hero?.title || l.address_line || l.slug,
      heroImage: firstSceneId ? heroByScene.get(firstSceneId) ?? null : null,
      city: l.city,
      state: l.state,
      leadCount: leadCounts.get(l.id) ?? 0,
      updatedAt: l.updated_at,
    };
  });
}

/** A listing's uploaded photo, with its classification + public URL. */
export interface ListingAsset {
  id: string;
  storagePath: string;
  publicUrl: string;
  shotType: ShotType | string | null;
  renderCandidate: boolean;
  isHero: boolean;
  roomType: string | null;
}

/**
 * Fetches the uploaded assets for a listing the current user owns, with their
 * public URLs. Used by the Studio editor to map a moment's image to its source
 * asset (for shot classification + 3D-render state). RLS restricts to the owner.
 */
export async function getOwnedListingAssets(
  listingId: string,
): Promise<ListingAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("listing_id", listingId)
    .order("group_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as AssetRow[];
  return rows.map((a) => ({
    id: a.id,
    storagePath: a.storage_path,
    publicUrl: supabase.storage.from(ASSET_BUCKET).getPublicUrl(a.storage_path)
      .data.publicUrl,
    shotType: a.shot_type,
    renderCandidate: Boolean(a.render_candidate),
    isHero: a.is_hero,
    roomType: a.room_type,
  }));
}

/**
 * Fetches leads for a listing the current user owns. RLS restricts access to
 * the listing owner.
 */
export async function getListingLeads(listingId: string): Promise<LeadRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadRow[];
}
