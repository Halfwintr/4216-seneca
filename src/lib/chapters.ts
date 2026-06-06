// ─── Canonical story chapters ─────────────────────────────────────────────────
//
// Generation groups every photo into ONE of these fixed chapters (never a scene
// per room) so the left nav stays short and cinematic. Empty chapters are
// dropped. The final chapter is labeled with the listing's neighborhood when we
// have one (e.g. "St. Elmo"), otherwise "The Neighborhood".

export interface ChapterDef {
  key: string;
  label: string;
  /** Guidance the model uses to assign photos to this chapter. */
  description: string;
}

export const NEIGHBORHOOD_CHAPTER_KEY = "neighborhood";

export const CHAPTERS: ChapterDef[] = [
  {
    key: "arrival",
    label: "Arrival",
    description:
      "Establishing shots that lead up to the house — the street, the approach, the facade from a distance, progressing closer toward the front door. The first sight of the home from outside.",
  },
  {
    key: "porch",
    label: "The Porch",
    description:
      "The porch, front steps, or entry threshold seen from different angles. May be absent for some homes.",
  },
  {
    key: "great-room",
    label: "The Great Room",
    description:
      "The main living space where the family gathers — living room, family room, the room with the fireplace or television, shared gathering areas, entry foyer that opens into living space.",
  },
  {
    key: "heart",
    label: "The Heart",
    description:
      "The kitchen and dining areas — where food is prepared and meals are shared. Kitchen, breakfast nook, dining room, pantry, bar.",
  },
  {
    key: "private-quarters",
    label: "Private Quarters",
    description:
      "The private rooms — bedrooms, primary suite, ensuite and other bathrooms, closets, nurseries, private offices or studies.",
  },
  {
    key: "grounds",
    label: "The Grounds",
    description:
      "Outdoor areas of the property that are NOT part of the arrival approach — backyard, patio, deck, pool, gardens, outdoor living, garage, outbuildings.",
  },
  {
    key: NEIGHBORHOOD_CHAPTER_KEY,
    label: "The Neighborhood",
    description:
      "The surrounding area and neighborhood — aerial shots, streetscapes, nearby parks, landmarks, shops, or amenities that show local context beyond the property lines.",
  },
];

export const CHAPTER_ORDER: Record<string, number> = Object.fromEntries(
  CHAPTERS.map((c, i) => [c.key, i]),
);

/** Resolves a chapter's display label, substituting the neighborhood name. */
export function chapterLabel(key: string, neighborhood?: string | null): string {
  if (key === NEIGHBORHOOD_CHAPTER_KEY && neighborhood?.trim()) {
    return neighborhood.trim();
  }
  return CHAPTERS.find((c) => c.key === key)?.label ?? "More";
}

/** The chapter list with the neighborhood chapter relabeled for this listing. */
export function chaptersFor(neighborhood?: string | null): ChapterDef[] {
  return CHAPTERS.map((c) => ({
    ...c,
    label: chapterLabel(c.key, neighborhood),
  }));
}
