"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  analyzePhotoBatch as analyzePhotoBatchAI,
  groupAnalyzedPhotos,
  generateGuidedQuestionnaire,
  generateListingStory,
  type StorySceneInput,
} from "@/lib/ai/gemini";
import type {
  AssetRow,
  GuidedAnswer,
  ListingContact,
  ListingFacts,
  ListingQuestionnaire,
  ListingRow,
  ShotType,
} from "@/lib/types";
import { CHAPTER_ORDER, chapterLabel, chaptersFor } from "@/lib/chapters";

const BUCKET = "listing-assets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface BasicsInput {
  addressLine?: string;
  listingType?: string;
  occupancy?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  neighborhood?: string;
  agentName?: string;
  brokerage?: string;
  phone?: string;
  sms?: string;
  email?: string;
  listingUrl?: string;
  mls?: string;
}

export interface DetailsInput {
  beds?: string;
  baths?: string;
  sqft?: string;
  yearBuilt?: string;
  lotSize?: string;
  features?: string[];
}

function basicsToColumns(data: BasicsInput) {
  return {
    address_line: data.addressLine || null,
    listing_type: data.listingType || null,
    occupancy: data.occupancy || null,
    city: data.city || null,
    state: data.state || null,
    postal_code: data.postalCode || null,
    contact: {
      agentName: data.agentName || undefined,
      brokerage: data.brokerage || undefined,
      phone: data.phone || undefined,
      sms: data.sms || undefined,
      email: data.email || undefined,
      listingUrl: data.listingUrl || undefined,
      mls: data.mls || undefined,
    } satisfies ListingContact,
  };
}

// ─── Address lookup (OpenStreetMap / Nominatim — no API key required) ──────────

export interface AddressSuggestion {
  label: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  neighborhood: string;
}

const US_STATE_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY",
};

function toStateAbbr(name: string | undefined): string {
  if (!name) return "";
  return US_STATE_ABBR[name.toLowerCase()] ?? name;
}

interface NominatimResult {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    postcode?: string;
  };
}

/**
 * Looks up real addresses via OpenStreetMap's Nominatim geocoder. Free and
 * key-less; we run it server-side so we can send a descriptive User-Agent (per
 * their usage policy) and keep requests modest.
 */
export async function lookupAddress(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      format: "json",
      addressdetails: "1",
      limit: "6",
      countrycodes: "us",
      q,
    }).toString();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "LoveThatForYou/1.0 (real-estate listing address lookup)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) return [];
    const results = (await res.json()) as NominatimResult[];

    return results
      .map((r): AddressSuggestion => {
        const a = r.address ?? {};
        const addressLine = [a.house_number, a.road].filter(Boolean).join(" ");
        const city = a.city || a.town || a.village || a.hamlet || a.suburb || "";
        return {
          label: r.display_name ?? addressLine,
          addressLine,
          city,
          state: toStateAbbr(a.state),
          postalCode: a.postcode ?? "",
          neighborhood: a.neighbourhood || a.suburb || "",
        };
      })
      .filter((s) => s.addressLine || s.city);
  } catch {
    return [];
  }
}

// ─── Draft lifecycle ──────────────────────────────────────────────────────────

export async function createDraftListing(
  data: BasicsInput,
): Promise<{ id: string }> {
  const { supabase, user } = await requireUser();

  const base = slugify(data.addressLine || "new-listing") || "new-listing";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const cols = basicsToColumns(data);
  const { data: row, error } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      slug,
      status: "draft",
      ...cols,
      hero: { neighborhood: data.neighborhood || null },
    })
    .select("id")
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? "Could not create draft listing");
  }
  return { id: row.id };
}

export async function saveBasics(
  listingId: string,
  data: BasicsInput,
): Promise<void> {
  const { supabase } = await requireUser();
  const cols = basicsToColumns(data);

  // Merge neighborhood into existing hero jsonb.
  const { data: current } = await supabase
    .from("listings")
    .select("hero")
    .eq("id", listingId)
    .single<{ hero: Record<string, unknown> | null }>();

  await supabase
    .from("listings")
    .update({
      ...cols,
      hero: { ...(current?.hero ?? {}), neighborhood: data.neighborhood || null },
    })
    .eq("id", listingId);

  revalidatePath(`/dashboard/listings/${listingId}`);
}

export async function saveDetails(
  listingId: string,
  data: DetailsInput,
): Promise<void> {
  const { supabase } = await requireUser();
  const facts: ListingFacts = {
    beds: data.beds || undefined,
    baths: data.baths || undefined,
    sqft: data.sqft || undefined,
    yearBuilt: data.yearBuilt || undefined,
    lotSize: data.lotSize || undefined,
    features: (data.features ?? []).filter(Boolean),
  };
  await supabase.from("listings").update({ facts }).eq("id", listingId);
  revalidatePath(`/dashboard/listings/${listingId}`);
}

export async function saveQuestionnaire(
  listingId: string,
  data: ListingQuestionnaire,
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("listings").update({ questionnaire: data }).eq("id", listingId);
  revalidatePath(`/dashboard/listings/${listingId}`);
}

export async function saveGuidedAnswers(
  listingId: string,
  answers: GuidedAnswer[],
): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("listings")
    .update({ guided_answers: answers })
    .eq("id", listingId);
  revalidatePath(`/dashboard/listings/${listingId}`);
}

// ─── AI photo analysis ──────────────────────────────────────────────────────

export interface AnalyzedPhotoCard {
  assetId: string;
  url: string;
  roomType: string;
  caption: string;
  shotType: ShotType | string;
  renderCandidate: boolean;
  groupKey: string;
  groupLabel: string;
  groupOrder: number;
  sortOrder: number;
}

function publicUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
): string {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/** "wide" shots sort before "detail" shots within a group. */
function shotRank(shot: string | null | undefined): number {
  return shot === "wide" ? 0 : 1;
}

/**
 * Analyzes a single small batch of the listing's photos (the client loops over
 * batches so it can show progress and so we never encode too many images into
 * one request). Persists per-photo analysis; grouping happens in a final pass.
 *
 * Returns the authoritative `total` photo count so the caller knows when done.
 */
export async function analyzePhotoBatch(
  listingId: string,
  offset: number,
  limit: number,
): Promise<{ ok: boolean; error?: string; total: number }> {
  const { supabase } = await requireUser();

  const { data: assetRows } = await supabase
    .from("assets")
    .select("*")
    .eq("listing_id", listingId)
    .order("is_hero", { ascending: false })
    .order("created_at", { ascending: true });

  const assets = (assetRows ?? []) as AssetRow[];
  const total = assets.length;
  if (total === 0) {
    return { ok: false, error: "Upload at least one photo first.", total: 0 };
  }

  const slice = assets.slice(offset, offset + limit);
  if (slice.length === 0) return { ok: true, total };

  try {
    const items = await analyzePhotoBatchAI(
      slice.map((a, i) => ({ index: i, url: publicUrl(supabase, a.storage_path) })),
    );
    const byIndex = new Map(items.map((it) => [it.index, it]));

    for (let i = 0; i < slice.length; i += 1) {
      const it = byIndex.get(i);
      const asset = slice[i];
      if (!it) {
        await supabase
          .from("assets")
          .update({ room_type: "Photo", shot_type: "detail", analyzed: true })
          .eq("id", asset.id);
        continue;
      }
      await supabase
        .from("assets")
        .update({
          ai_description: it.description,
          room_type: it.roomType,
          shot_type: it.shotType,
          render_candidate: it.renderCandidate,
          analyzed: true,
        })
        .eq("id", asset.id);
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Photo analysis failed.",
      total,
    };
  }

  return { ok: true, total };
}

/**
 * After every photo is analyzed, runs a single text-only pass that sorts every
 * photo into one of the FIXED story chapters (Arrival, The Porch, The Great
 * Room, The Heart, Private Quarters, The Grounds, the neighborhood) and orders
 * it within that chapter. Persists the chapter + order and returns display cards.
 */
export async function finalizePhotoGroups(
  listingId: string,
): Promise<{ ok: boolean; error?: string; photos?: AnalyzedPhotoCard[] }> {
  const { supabase } = await requireUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("hero")
    .eq("id", listingId)
    .single<{ hero: { neighborhood?: string } | null }>();
  const neighborhood = listing?.hero?.neighborhood;

  const { data: assetRows } = await supabase
    .from("assets")
    .select("*")
    .eq("listing_id", listingId)
    .order("is_hero", { ascending: false })
    .order("created_at", { ascending: true });

  const assets = (assetRows ?? []) as AssetRow[];
  if (assets.length === 0) {
    return { ok: false, error: "No analyzed photos to group." };
  }

  // index ↔ asset for the grouping call.
  const indexed = assets.map((a, i) => ({
    index: i,
    asset: a,
    url: publicUrl(supabase, a.storage_path),
  }));

  const chapters = chaptersFor(neighborhood);
  let grouping;
  try {
    grouping = await groupAnalyzedPhotos(
      indexed.map(({ index, asset }) => ({
        index,
        roomType: asset.room_type ?? "Space",
        description: asset.ai_description ?? "",
      })),
      chapters,
      neighborhood ?? undefined,
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Grouping failed.",
    };
  }

  const assignByIndex = new Map(grouping.photos.map((p) => [p.index, p]));

  // Build chapter metadata for every chapter actually used (canonical + any the
  // model coined), then rank them to assign a deterministic group order.
  const usedKeys = new Set(grouping.photos.map((p) => p.chapterKey));
  const metaByKey = new Map<string, { label: string; order: number }>();
  for (const ch of grouping.chapters) {
    metaByKey.set(ch.key, { label: ch.label, order: ch.order });
  }
  for (const key of usedKeys) {
    const isCanonical = key in CHAPTER_ORDER;
    const existing = metaByKey.get(key);
    metaByKey.set(key, {
      label: isCanonical
        ? chapterLabel(key, neighborhood)
        : existing?.label || key.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      order:
        existing?.order ??
        (isCanonical ? CHAPTER_ORDER[key] : 900),
    });
  }

  const rankedKeys = [...usedKeys].sort((a, b) => {
    const oa = metaByKey.get(a)?.order ?? 999;
    const ob = metaByKey.get(b)?.order ?? 999;
    if (oa !== ob) return oa - ob;
    const ca = CHAPTER_ORDER[a] ?? 999;
    const cb = CHAPTER_ORDER[b] ?? 999;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });
  const groupOrderByKey = new Map(rankedKeys.map((k, i) => [k, i]));

  // Order all photos: by chapter order, then the model's within-chapter
  // sequence, falling back to wide-shots-first, then upload order.
  const ordered = [...indexed].sort((a, b) => {
    const ga = assignByIndex.get(a.index);
    const gb = assignByIndex.get(b.index);
    const go =
      (groupOrderByKey.get(ga?.chapterKey ?? "") ?? 999) -
      (groupOrderByKey.get(gb?.chapterKey ?? "") ?? 999);
    if (go !== 0) return go;
    const seq = (ga?.sequence ?? 999) - (gb?.sequence ?? 999);
    if (seq !== 0) return seq;
    const sr = shotRank(a.asset.shot_type) - shotRank(b.asset.shot_type);
    if (sr !== 0) return sr;
    return a.index - b.index;
  });

  const groupCursor = new Map<string, number>();
  const cards: AnalyzedPhotoCard[] = [];

  for (const { index, asset, url } of ordered) {
    const assign = assignByIndex.get(index);
    const groupKey = assign?.chapterKey ?? "grounds";
    const meta = metaByKey.get(groupKey);
    const groupLabel = meta?.label ?? chapterLabel(groupKey, neighborhood);
    const groupOrder = groupOrderByKey.get(groupKey) ?? 999;
    const sortOrder = groupCursor.get(groupKey) ?? 0;
    groupCursor.set(groupKey, sortOrder + 1);

    await supabase
      .from("assets")
      .update({
        group_key: groupKey,
        group_label: groupLabel,
        group_order: groupOrder,
        sort_order: sortOrder,
      })
      .eq("id", asset.id);

    cards.push({
      assetId: asset.id,
      url,
      roomType: asset.room_type ?? "Photo",
      caption: (asset.ai_description ?? "").split(/(?<=[.!?])\s/)[0]?.slice(0, 70) ?? "",
      shotType: asset.shot_type ?? "detail",
      renderCandidate: Boolean(asset.render_candidate),
      groupKey,
      groupLabel,
      groupOrder,
      sortOrder,
    });
  }

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true, photos: cards };
}

/**
 * Persists a manual correction to a single photo's classification — its room /
 * group, wide-vs-detail shot type, or 3D-render candidacy.
 */
export async function updatePhotoClassification(
  listingId: string,
  assetId: string,
  patch: {
    shotType?: string;
    renderCandidate?: boolean;
    groupKey?: string;
    groupLabel?: string;
    groupOrder?: number;
    sortOrder?: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();

  const update: Record<string, unknown> = {};
  if (patch.shotType !== undefined) update.shot_type = patch.shotType;
  if (patch.renderCandidate !== undefined) update.render_candidate = patch.renderCandidate;
  if (patch.groupKey !== undefined) update.group_key = patch.groupKey;
  if (patch.groupLabel !== undefined) update.group_label = patch.groupLabel;
  if (patch.groupOrder !== undefined) update.group_order = patch.groupOrder;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("assets")
    .update(update)
    .eq("id", assetId)
    .eq("listing_id", listingId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true };
}

/**
 * Uses the saved photo analysis to have Gemini pre-answer a short discovery
 * questionnaire. The owner then agrees with or edits each answer.
 */
export async function buildGuidedQuestionnaire(
  listingId: string,
): Promise<{ ok: boolean; error?: string; answers?: GuidedAnswer[] }> {
  const { supabase } = await requireUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single<ListingRow>();
  if (!listing) return { ok: false, error: "Listing not found." };

  const { data: assetRows } = await supabase
    .from("assets")
    .select("*")
    .eq("listing_id", listingId)
    .eq("analyzed", true);

  const assets = (assetRows ?? []) as AssetRow[];
  if (assets.length === 0) {
    return { ok: false, error: "Analyze the photos before this step." };
  }

  // Compact per-group summary for the prompt.
  const groupMap = new Map<
    string,
    { label: string; rooms: Set<string>; descriptions: string[] }
  >();
  for (const a of assets) {
    const key = a.group_key ?? "other";
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        label: a.group_label ?? "Other",
        rooms: new Set(),
        descriptions: [],
      });
    }
    const g = groupMap.get(key)!;
    if (a.room_type) g.rooms.add(a.room_type);
    if (a.ai_description) g.descriptions.push(a.ai_description);
  }

  const groups = [...groupMap.values()].map((g) => ({
    label: g.label,
    rooms: [...g.rooms],
    descriptions: g.descriptions,
  }));

  let answers;
  try {
    answers = await generateGuidedQuestionnaire({
      listingType: listing.listing_type ?? undefined,
      city: listing.city ?? undefined,
      state: listing.state ?? undefined,
      neighborhood: listing.hero?.neighborhood,
      facts: listing.facts ?? {},
      groups,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not build questionnaire.",
    };
  }

  await supabase
    .from("listings")
    .update({ guided_answers: answers })
    .eq("id", listingId);

  revalidatePath(`/dashboard/listings/${listingId}`);
  return { ok: true, answers };
}

// ─── Final story generation ───────────────────────────────────────────────────

export async function generateListingContent(
  listingId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single<ListingRow>();
  if (!listing) return { ok: false, error: "Listing not found." };

  const { data: assetRows } = await supabase
    .from("assets")
    .select("*")
    .eq("listing_id", listingId)
    .order("group_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const assets = (assetRows ?? []) as AssetRow[];
  if (assets.length === 0) {
    return { ok: false, error: "Upload at least one photo before generating." };
  }

  // Assign each asset a stable imageIndex; remember its URL for moment mapping.
  const urlByIndex = new Map<number, string>();
  const shotByIndex = new Map<number, { shotType: string | null; renderCandidate: boolean }>();
  const sceneInputsByKey = new Map<string, StorySceneInput>();
  const groupOrder = new Map<string, number>();

  assets.forEach((a, i) => {
    urlByIndex.set(i, publicUrl(supabase, a.storage_path));
    shotByIndex.set(i, {
      shotType: a.shot_type ?? null,
      renderCandidate: Boolean(a.render_candidate),
    });
    const key = a.group_key || "tour";
    if (!sceneInputsByKey.has(key)) {
      sceneInputsByKey.set(key, {
        groupKey: key,
        label: a.group_label || "The Tour",
        images: [],
      });
      groupOrder.set(key, a.group_order ?? i);
    }
    sceneInputsByKey.get(key)!.images.push({
      index: i,
      roomType: a.room_type || "Space",
      description: a.ai_description || "",
      shotType: a.shot_type || "detail",
    });
  });

  const scenes = [...sceneInputsByKey.values()].sort(
    (a, b) => (groupOrder.get(a.groupKey) ?? 0) - (groupOrder.get(b.groupKey) ?? 0),
  );

  let story;
  try {
    story = await generateListingStory({
      listingType: listing.listing_type ?? undefined,
      city: listing.city ?? undefined,
      state: listing.state ?? undefined,
      neighborhood: listing.hero?.neighborhood,
      facts: listing.facts ?? {},
      contact: listing.contact ?? {},
      guidedAnswers: listing.guided_answers ?? [],
      scenes,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed." };
  }

  // Replace scenes/moments, mapping each moment back to its image by index.
  await supabase.from("scenes").delete().eq("listing_id", listingId);

  let scenePos = 0;
  const usedKeys = new Set<string>();

  for (const scene of story.scenes) {
    let key = slugify(scene.groupKey || scene.label) || `scene-${scenePos + 1}`;
    while (usedKeys.has(key)) key = `${key}-${scenePos + 1}`;
    usedKeys.add(key);

    const { data: sceneRow } = await supabase
      .from("scenes")
      .insert({
        listing_id: listingId,
        position: scenePos,
        key,
        label: scene.label,
      })
      .select("id")
      .single();
    if (!sceneRow) continue;

    const momentRows = [];
    let mPos = 0;
    for (const m of scene.moments) {
      const image = urlByIndex.get(m.imageIndex);
      if (!image) continue;
      const shot = shotByIndex.get(m.imageIndex);
      momentRows.push({
        scene_id: sceneRow.id,
        position: mPos,
        image_path: image,
        frame_sequence_path: null,
        is_title: Boolean(m.isTitle),
        title: m.title,
        subtitle: m.subtitle || null,
        body: m.body || null,
        align: mPos % 2 === 0 ? "left" : "right",
        scroll_vh: null,
        shot_type: shot?.shotType ?? null,
        render_candidate: shot?.renderCandidate ?? false,
      });
      mPos += 1;
    }
    if (momentRows.length > 0) {
      await supabase.from("moments").insert(momentRows);
    }
    scenePos += 1;
  }

  // Write hero + seo, mark AI-generated.
  await supabase
    .from("listings")
    .update({
      hero: {
        ...(listing.hero ?? {}),
        title: story.hero.title,
        subtitle: story.hero.subtitle,
        introNarrative: story.hero.introNarrative,
        detailsHeadline: story.hero.detailsHeadline,
      },
      seo: {
        ...(listing.seo ?? {}),
        metaDescription: story.seo.metaDescription,
        ogTitle: story.seo.ogTitle,
        ogDescription: story.seo.ogDescription,
      },
      ai_generated: true,
    })
    .eq("id", listingId);

  revalidatePath(`/dashboard/listings/${listingId}`);
  revalidatePath(`/l/${listing.slug}`);
  return { ok: true };
}
