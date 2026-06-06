// ─── Platform domain types ───────────────────────────────────────────────────
//
// Two layers:
//   *Row types   — exactly what Supabase returns (snake_case columns / jsonb).
//   View models  — camelCase shapes the cinematic renderer consumes.
//
// Mapping between them lives in `src/lib/listings.ts`.

export type TextAlign = "left" | "center" | "right";
export type ListingStatus = "draft" | "published";

// Default scroll heights (vh) used by the renderer when a moment omits scrollVh.
export const TITLE_VH = 156;
export const MOMENT_VH = 192;
export const SHORT_VH = 156;

// ─── View models (renderer-facing) ───────────────────────────────────────────

export interface Moment {
  id?: string;
  image: string;
  /** Public path to a baked frame-sequence folder, e.g. /scenes/arrival-001 */
  frameSequencePath?: string | null;
  isTitle?: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  body?: string;
  align?: TextAlign;
  scrollVh?: number;
  /** "wide" = establishing shot (used for 3D renders); "detail" = carousel shot. */
  shotType?: ShotType;
  /** True when the image is earmarked as a 3D-render (wide) candidate. */
  renderCandidate?: boolean;
}

export interface Scene {
  id: string;
  /** Stable, human-readable anchor + nav id, e.g. "arrival" */
  key: string;
  label: string;
  moments: Moment[];
}

export interface ListingHero {
  title?: string;
  subtitle?: string;
  introNarrative?: string;
  /** Neighborhood shown on the address seal, e.g. "Saint Elmo". */
  neighborhood?: string;
  /** Headline for the details/contact section, e.g. "Claim your piece of Saint Elmo". */
  detailsHeadline?: string;
}

export interface ListingFactExtra {
  label: string;
  value: string;
}

export interface ListingFacts {
  beds?: string | number;
  baths?: string | number;
  sqft?: string;
  yearBuilt?: string | number;
  lotSize?: string;
  features?: string[];
  /** Free-form label/value rows rendered in the Details grid. */
  extra?: ListingFactExtra[];
}

export interface ListingContact {
  agentName?: string;
  brokerage?: string;
  phone?: string;
  sms?: string;
  email?: string;
  listingUrl?: string;
  mls?: string;
}

export interface CtaLink {
  label: string;
  href: string;
}

export interface ListingBranding {
  logoPath?: string;
  colors?: Record<string, string>;
  cta?: CtaLink[];
}

export interface ListingSeo {
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface OpenHouse {
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

/** One step in the AI-pre-answered guided questionnaire shown during creation. */
export interface GuidedAnswer {
  /** Stable id so edits map back to the right step. */
  id: string;
  question: string;
  /** Gemini's proposed answer; the owner agrees with or edits it. */
  answer: string;
  /** Whether the owner has explicitly approved this answer. */
  approved?: boolean;
}

/** Wide establishing shots make good 3D renders; detail shots feed the carousel. */
export type ShotType = "wide" | "detail";

export interface ListingQuestionnaire {
  /** One-sentence description of the property. */
  description?: string;
  /** What makes it feel different from nearby homes. */
  differentiator?: string;
  /** The buyer who'd love it most. */
  idealBuyer?: string;
  favoriteSpace?: string;
  favoriteSpaceWhy?: string;
  dailyLife?: string;
  outdoor?: string;
  neighborhoodFavorites?: string;
  architecture?: string;
  /** Emotional tone descriptors (multi-select). */
  tone?: string[];
  /** "If this property were a movie/hotel/destination…" */
  vibe?: string;
}

export interface Listing {
  id: string;
  ownerId: string;
  slug: string;
  status: ListingStatus;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  listingType?: string;
  occupancy?: string;
  hero: ListingHero;
  facts: ListingFacts;
  contact: ListingContact;
  branding: ListingBranding;
  seo: ListingSeo;
  openHouse?: OpenHouse | null;
  questionnaire: ListingQuestionnaire;
  aiGenerated: boolean;
  scenes: Scene[];
}

// ─── Database row types ───────────────────────────────────────────────────────

export interface ListingRow {
  id: string;
  owner_id: string;
  slug: string;
  status: ListingStatus;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  listing_type: string | null;
  occupancy: string | null;
  hero: ListingHero | null;
  facts: ListingFacts | null;
  contact: ListingContact | null;
  branding: ListingBranding | null;
  seo: ListingSeo | null;
  open_house: OpenHouse | null;
  questionnaire: ListingQuestionnaire | null;
  guided_answers: GuidedAnswer[] | null;
  ai_generated: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AssetRow {
  id: string;
  listing_id: string;
  storage_path: string;
  original_name: string | null;
  category: string | null;
  scene_key: string | null;
  is_hero: boolean;
  width: number | null;
  height: number | null;
  frame_sequence_path: string | null;
  // AI analysis (see migration 20260602000004).
  ai_description: string | null;
  room_type: string | null;
  shot_type: ShotType | string | null;
  render_candidate: boolean | null;
  group_key: string | null;
  group_label: string | null;
  group_order: number | null;
  sort_order: number | null;
  analyzed: boolean | null;
  created_at: string;
}

export interface SceneRow {
  id: string;
  listing_id: string;
  position: number;
  key: string;
  label: string;
}

export interface MomentRow {
  id: string;
  scene_id: string;
  position: number;
  image_path: string | null;
  frame_sequence_path: string | null;
  is_title: boolean;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  body: string | null;
  align: string | null;
  scroll_vh: number | null;
  shot_type: ShotType | string | null;
  render_candidate: boolean | null;
}

export interface LeadRow {
  id: string;
  listing_id: string;
  name: string | null;
  contact: string | null;
  message: string | null;
  source: string | null;
  created_at: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function getMomentVh(m: Moment): number {
  return m.scrollVh ?? (m.isTitle ? TITLE_VH : MOMENT_VH);
}

/**
 * Whether a moment's image belongs in the photo carousel. Detail shots always
 * qualify; wide / 3D-render-candidate shots are reserved for the cinematic
 * scene backgrounds. Legacy moments without an explicit shot classification
 * fall back to treating the scene's title (establishing) shot as the wide one.
 */
export function isCarouselShot(m: Moment): boolean {
  if (m.shotType === "detail") return true;
  if (m.shotType === "wide" || m.renderCandidate) return false;
  return !m.isTitle;
}

/**
 * Whether a moment belongs in the cinematic scroll (the full-screen story) — the
 * complement of {@link isCarouselShot}. These are the wide / 3D / title shots
 * that become push-in dolly sequences once baked (and render as a still 2D image
 * until then). Detail shots are excluded; they live only in the carousel/lightbox.
 */
export function isSceneShot(m: Moment): boolean {
  return !isCarouselShot(m);
}

export function listingFullAddress(listing: Listing): string {
  const cityState = [listing.city, listing.state].filter(Boolean).join(", ");
  return [listing.addressLine, cityState, listing.postalCode]
    .filter(Boolean)
    .join(" · ");
}

export interface SealParts {
  number: string;
  street: string;
  neighborhood?: string;
  cityState?: string;
}

/** Splits an address line into a leading number + street name for the seal. */
export function sealParts(listing: Listing): SealParts {
  const line = (listing.addressLine ?? "").trim();
  const match = line.match(/^(\d+[a-zA-Z]?)\s+(.*)$/);
  const number = match ? match[1] : line;
  const street = match ? match[2] : "";
  const cityState = [listing.city, listing.state].filter(Boolean).join(", ");
  return {
    number,
    street,
    neighborhood: listing.hero.neighborhood,
    cityState: cityState || undefined,
  };
}
