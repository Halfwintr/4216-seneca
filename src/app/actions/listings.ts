"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
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

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function strOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v || null;
}

function revalidateListing(id: string, slug?: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/listings/${id}`);
  if (slug) {
    revalidatePath(`/listing/${slug}`);
    revalidatePath(`/l/${slug}`);
  }
}

// ─── Listing-level actions ────────────────────────────────────────────────────

export async function createListing(): Promise<void> {
  const { supabase, user } = await requireUser();

  const slug = `new-listing-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      slug,
      status: "draft",
      hero: { title: "Untitled listing" },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create listing");
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/listings/${data.id}`);
}

export async function deleteListing(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = str(formData, "listingId");
  if (id) {
    await supabase.from("listings").delete().eq("id", id);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = str(formData, "listingId");
  const next = str(formData, "next"); // "published" | "draft"
  if (!id || (next !== "published" && next !== "draft")) return;

  const { data } = await supabase
    .from("listings")
    .update({ status: next })
    .eq("id", id)
    .select("slug")
    .single();

  revalidateListing(id, data?.slug);
}

export async function updateListingDetails(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = str(formData, "listingId");
  if (!id) return;

  const features = str(formData, "features")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  const extraLabels = formData.getAll("extraLabel").map((v) => String(v).trim());
  const extraValues = formData.getAll("extraValue").map((v) => String(v).trim());
  const extra = extraLabels
    .map((label, i) => ({ label, value: extraValues[i] ?? "" }))
    .filter((e) => e.label || e.value);

  const slug = slugify(str(formData, "slug")) || undefined;

  const update: Record<string, unknown> = {
    address_line: strOrNull(formData, "addressLine"),
    city: strOrNull(formData, "city"),
    state: strOrNull(formData, "state"),
    postal_code: strOrNull(formData, "postalCode"),
    listing_type: strOrNull(formData, "listingType"),
    occupancy: strOrNull(formData, "occupancy"),
    hero: {
      title: strOrNull(formData, "heroTitle"),
      subtitle: strOrNull(formData, "heroSubtitle"),
      introNarrative: strOrNull(formData, "heroIntro"),
    },
    facts: {
      beds: strOrNull(formData, "beds"),
      baths: strOrNull(formData, "baths"),
      sqft: strOrNull(formData, "sqft"),
      yearBuilt: strOrNull(formData, "yearBuilt"),
      lotSize: strOrNull(formData, "lotSize"),
      features,
      extra,
    },
    contact: {
      agentName: strOrNull(formData, "agentName"),
      brokerage: strOrNull(formData, "brokerage"),
      phone: strOrNull(formData, "phone"),
      sms: strOrNull(formData, "sms"),
      email: strOrNull(formData, "email"),
      listingUrl: strOrNull(formData, "listingUrl"),
      mls: strOrNull(formData, "mls"),
    },
    seo: {
      metaDescription: strOrNull(formData, "metaDescription"),
      ogTitle: strOrNull(formData, "ogTitle"),
      ogDescription: strOrNull(formData, "ogDescription"),
      ogImage: strOrNull(formData, "ogImage"),
    },
  };
  if (slug) update.slug = slug;

  // Slug collisions: fall back to a suffixed slug rather than failing the save.
  let { error } = await supabase.from("listings").update(update).eq("id", id);
  if (error && slug) {
    update.slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    ({ error } = await supabase.from("listings").update(update).eq("id", id));
  }

  revalidateListing(id, slug);
}

// ─── Scene actions ──────────────────────────────────────────────────────────

export async function addScene(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const listingId = str(formData, "listingId");
  if (!listingId) return;

  const { data: scenes } = await supabase
    .from("scenes")
    .select("position")
    .eq("listing_id", listingId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = (scenes?.[0]?.position ?? -1) + 1;

  await supabase.from("scenes").insert({
    listing_id: listingId,
    position: nextPos,
    key: `scene-${nextPos + 1}`,
    label: `New Scene ${nextPos + 1}`,
  });

  revalidateListing(listingId);
}

export async function updateScene(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = str(formData, "sceneId");
  const listingId = str(formData, "listingId");
  if (!id) return;

  await supabase
    .from("scenes")
    .update({
      key: slugify(str(formData, "key")) || "scene",
      label: str(formData, "label") || "Scene",
    })
    .eq("id", id);

  revalidateListing(listingId);
}

export async function deleteScene(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = str(formData, "sceneId");
  const listingId = str(formData, "listingId");
  if (id) await supabase.from("scenes").delete().eq("id", id);
  revalidateListing(listingId);
}

// ─── Moment actions ───────────────────────────────────────────────────────────

export async function addMoment(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const sceneId = str(formData, "sceneId");
  const listingId = str(formData, "listingId");
  if (!sceneId) return;

  const { data: moments } = await supabase
    .from("moments")
    .select("position")
    .eq("scene_id", sceneId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = (moments?.[0]?.position ?? -1) + 1;

  await supabase.from("moments").insert({
    scene_id: sceneId,
    position: nextPos,
    title: "New moment",
    align: "left",
  });

  revalidateListing(listingId);
}

export async function updateMoment(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = str(formData, "momentId");
  const listingId = str(formData, "listingId");
  if (!id) return;

  const scrollVhRaw = str(formData, "scrollVh");
  const scrollVh = scrollVhRaw ? Number(scrollVhRaw) : null;

  await supabase
    .from("moments")
    .update({
      image_path: strOrNull(formData, "imagePath"),
      frame_sequence_path: strOrNull(formData, "frameSequencePath"),
      is_title: formData.get("isTitle") === "on",
      eyebrow: strOrNull(formData, "eyebrow"),
      title: str(formData, "title"),
      subtitle: strOrNull(formData, "subtitle"),
      body: strOrNull(formData, "body"),
      align: str(formData, "align") || "left",
      scroll_vh: Number.isFinite(scrollVh) ? scrollVh : null,
    })
    .eq("id", id);

  revalidateListing(listingId);
}

export async function deleteMoment(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = str(formData, "momentId");
  const listingId = str(formData, "listingId");
  if (id) await supabase.from("moments").delete().eq("id", id);
  revalidateListing(listingId);
}

// ─── Reordering (swap positions with the neighbour) ───────────────────────────

async function swapPositions(
  table: "scenes" | "moments",
  aId: string,
  aPos: number,
  bId: string,
  bPos: number,
) {
  const { supabase } = await requireUser();
  await supabase.from(table).update({ position: bPos }).eq("id", aId);
  await supabase.from(table).update({ position: aPos }).eq("id", bId);
}

export async function moveScene(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const listingId = str(formData, "listingId");
  const id = str(formData, "sceneId");
  const dir = str(formData, "dir"); // "up" | "down"
  if (!id || !listingId) return;

  const { data: scenes } = await supabase
    .from("scenes")
    .select("id, position")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });
  if (!scenes) return;

  const idx = scenes.findIndex((s) => s.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= scenes.length) {
    revalidateListing(listingId);
    return;
  }
  await swapPositions(
    "scenes",
    scenes[idx].id,
    scenes[idx].position,
    scenes[swapIdx].id,
    scenes[swapIdx].position,
  );
  revalidateListing(listingId);
}

export async function moveMoment(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const listingId = str(formData, "listingId");
  const sceneId = str(formData, "sceneId");
  const id = str(formData, "momentId");
  const dir = str(formData, "dir");
  if (!id || !sceneId) return;

  const { data: moments } = await supabase
    .from("moments")
    .select("id, position")
    .eq("scene_id", sceneId)
    .order("position", { ascending: true });
  if (!moments) return;

  const idx = moments.findIndex((m) => m.id === id);
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= moments.length) {
    revalidateListing(listingId);
    return;
  }
  await swapPositions(
    "moments",
    moments[idx].id,
    moments[idx].position,
    moments[swapIdx].id,
    moments[swapIdx].position,
  );
  revalidateListing(listingId);
}
