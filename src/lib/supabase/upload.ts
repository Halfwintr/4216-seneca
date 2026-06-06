import { createClient } from "./client";

export interface UploadedPhoto {
  assetId: string;
  path: string;
  publicUrl: string;
  isHero: boolean;
}

const BUCKET = "listing-assets";

/**
 * Uploads a photo to the listing-assets bucket (client-side, authenticated) and
 * records an `assets` row. RLS permits this for the listing's owner.
 */
export async function uploadListingPhoto(
  listingId: string,
  file: File,
  isHero = false,
): Promise<UploadedPhoto> {
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `listings/${listingId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: asset, error: insErr } = await supabase
    .from("assets")
    .insert({
      listing_id: listingId,
      storage_path: path,
      original_name: file.name,
      is_hero: isHero,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);

  return { assetId: asset.id, path, publicUrl: pub.publicUrl, isHero };
}

/** Sets which asset is the hero (clears the rest) for a listing. */
export async function setHeroAsset(listingId: string, assetId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("assets").update({ is_hero: false }).eq("listing_id", listingId);
  await supabase.from("assets").update({ is_hero: true }).eq("id", assetId);
}

/** Removes an asset row (storage object is left for cleanup later). */
export async function removeAsset(assetId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("assets").delete().eq("id", assetId);
}
