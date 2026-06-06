import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import type {
  ContentListUnion,
  GenerateContentResponse,
} from "@google/genai";
import type {
  GuidedAnswer,
  ListingContact,
  ListingFacts,
  ShotType,
} from "@/lib/types";

const MODEL = "gemini-2.5-flash";

// ─── Shared client / retry helper ─────────────────────────────────────────────

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local and restart the server.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

interface GenerateArgs {
  contents: ContentListUnion;
  systemInstruction: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseJsonSchema: any;
  temperature?: number;
}

/** Calls Gemini with JSON output + a short backoff for transient 503s. */
async function generateJson<T>(args: GenerateArgs): Promise<T> {
  const ai = getClient();
  let response: GenerateContentResponse | undefined;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: args.contents,
        config: {
          systemInstruction: args.systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: args.responseJsonSchema,
          temperature: args.temperature ?? 0.7,
        },
      });
      break;
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 503 && attempt < 4) {
        await new Promise((r) => setTimeout(r, attempt * 2500));
        continue;
      }
      throw e;
    }
  }

  const text = response?.text;
  if (!text) throw new Error("Gemini returned an empty response.");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }
}

/** Fetches an image and returns an inlineData part for the model. */
async function imagePart(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status}).`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  return { inlineData: { mimeType, data: buf.toString("base64") } };
}

// ─── 1a. Per-photo vision analysis (batched) ──────────────────────────────────

export interface PhotoToAnalyze {
  index: number;
  url: string;
}

export interface AnalyzedPhotoItem {
  index: number;
  /** Detected room / space, e.g. "Primary bedroom", "Kitchen", "Backyard". */
  roomType: string;
  /** Factual 1–2 sentence description of what's in the photo. */
  description: string;
  /** Short editorial caption suitable for a carousel. */
  caption: string;
  /** "wide" = establishing shot of a space; "detail" = a close, specific shot. */
  shotType: ShotType;
  /** A wide-angle shot of a full space — a good candidate for a 3D render. */
  renderCandidate: boolean;
}

const PHOTO_BATCH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    photos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.NUMBER },
          roomType: { type: Type.STRING },
          description: { type: Type.STRING },
          caption: { type: Type.STRING },
          shotType: { type: Type.STRING, enum: ["wide", "detail"] },
          renderCandidate: { type: Type.BOOLEAN },
        },
        required: [
          "index",
          "roomType",
          "description",
          "caption",
          "shotType",
          "renderCandidate",
        ],
      },
    },
  },
  required: ["photos"],
};

const PHOTO_BATCH_SYSTEM = `You are a real-estate photography analyst for "Love That For You", a platform that turns listing photos into cinematic property tours.

You will receive a small set of numbered listing photos. For EACH photo, return:
- index: the integer label of the image.
- roomType: the space shown (e.g. "Kitchen", "Primary bedroom", "Backyard", "Front exterior", "Entryway", "Bathroom", "Living room"). Be specific and consistent — reuse the SAME name for photos of the same kind of space.
- description: 1–2 plain, factual sentences describing exactly what is visible (layout, materials, light, notable fixtures). No marketing language.
- caption: a short, evocative 3–8 word caption suitable for a photo carousel.
- shotType: "wide" if it's an establishing/wide-angle shot showing most of a room or space; "detail" if it's a closer shot of a specific feature, corner, fixture, or texture.
- renderCandidate: true ONLY for wide-angle shots that capture a full space from a vantage point (good for 3D walkthrough renders). Detail/close shots are false.

Return only data conforming to the schema, with exactly one photo object per input image, preserving its index.`;

/**
 * Analyzes a SMALL batch of photos (caller batches to keep request size sane —
 * encoding many full-resolution images into one request overflows V8 string
 * limits). Grouping is handled separately by `groupAnalyzedPhotos`.
 */
export async function analyzePhotoBatch(
  photos: PhotoToAnalyze[],
): Promise<AnalyzedPhotoItem[]> {
  if (photos.length === 0) return [];

  const ordered = [...photos].sort((a, b) => a.index - b.index);
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: `Analyze these ${ordered.length} listing photos.` }];

  for (const p of ordered) {
    parts.push({ text: `Image index ${p.index}:` });
    parts.push(await imagePart(p.url));
  }

  const result = await generateJson<{ photos: AnalyzedPhotoItem[] }>({
    contents: [{ role: "user", parts }],
    systemInstruction: PHOTO_BATCH_SYSTEM,
    responseJsonSchema: PHOTO_BATCH_SCHEMA,
    temperature: 0.4,
  });

  if (!result.photos?.length) {
    throw new Error("Gemini did not return any photo analysis.");
  }
  return result.photos;
}

// ─── 1b. Grouping (text-only, runs once over all analyzed photos) ─────────────

export interface GroupedChapter {
  key: string;
  label: string;
  /** Position of the chapter in the tour (lower = earlier). */
  order: number;
}

export interface PhotoChapterAssignment {
  index: number;
  /** A canonical chapter key, or a new slug the model coined for this listing. */
  chapterKey: string;
  /** Order within the chapter (0 = shown first). */
  sequence: number;
}

export interface PhotoGroupingResult {
  /** The chapters actually used, in tour order. */
  chapters: GroupedChapter[];
  photos: PhotoChapterAssignment[];
}

export interface ChapterForGrouping {
  key: string;
  label: string;
  description: string;
}

const GROUP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          label: { type: Type.STRING },
          order: { type: Type.NUMBER },
        },
        required: ["key", "label", "order"],
      },
    },
    photos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.NUMBER },
          chapterKey: { type: Type.STRING },
          sequence: { type: Type.NUMBER },
        },
        required: ["index", "chapterKey", "sequence"],
      },
    },
  },
  required: ["chapters", "photos"],
};

/**
 * Sorts photos into cinematic chapters. The canonical chapters are the strong
 * default; the model may coin a NEW chapter only when a distinct, significant
 * space clearly doesn't fit. The left nav must stay short, so it must prefer the
 * canonical set and keep the total number of chapters small.
 */
export async function groupAnalyzedPhotos(
  items: Array<{ index: number; roomType: string; description: string }>,
  chapters: ChapterForGrouping[],
  neighborhood?: string,
): Promise<PhotoGroupingResult> {
  if (items.length === 0) return { chapters: [], photos: [] };

  const system = `You organize a property's photos into cinematic CHAPTERS for "Love That For You". The left navigation must stay short — do NOT make one chapter per room.

Strongly PREFER this canonical set of chapters (in this order). Assign each photo to the single best-fitting one:
${chapters.map((c) => `- ${c.key} — ${c.label}: ${c.description}`).join("\n")}

Mapping guidance:
- Map most rooms to the closest canonical chapter. Bathrooms, closets, offices/dens → private-quarters. Dining rooms, pantries, breakfast nooks → heart. Foyers/entry halls that open into living space → great-room. Garages, sheds, pools, patios, yards → grounds.
- "arrival" is the approach from outside toward the front door; "grounds" is other outdoor areas. Distinguish them.
- ${neighborhood ? `The neighborhood is "${neighborhood}". ` : ""}Use the "neighborhood" chapter only for shots showing context beyond the property (aerials, streets, nearby landmarks/amenities).

Creative license (use sparingly):
- You MAY introduce a NEW chapter ONLY when several photos form a distinct, significant space that genuinely doesn't fit a canonical chapter (e.g. "the-pool-house", "the-studio", "the-wine-cellar", "the-sunroom", "the-home-theater"). Give it a lowercase-slug key and a short evocative label (2–4 words, e.g. "The Pool House"). Do NOT create a new chapter for a single stray photo or for something that fits a canonical chapter.
- Keep the TOTAL number of chapters at 7 or fewer when possible, and never exceed 9. Only output chapters that actually have photos.

Output:
- "chapters": every chapter you used, each with key, label, and an integer "order" (0 = first) placing it in the natural tour. Canonical chapters keep their natural order; slot any new chapter into a sensible position. For the neighborhood chapter use the label "${neighborhood?.trim() || "The Neighborhood"}".
- "photos": assign EVERY photo exactly once (preserving index) with its chapterKey and a "sequence" (0-based order within the chapter). For "arrival", sequence from the farthest establishing view progressing CLOSER to the front door; for every other chapter, lead with the widest establishing shot, then details.

Return only data conforming to the schema.`;

  const prompt = [
    "Assign and order these photos into chapters:",
    JSON.stringify(items),
  ].join("\n");

  const result = await generateJson<PhotoGroupingResult>({
    contents: prompt,
    systemInstruction: system,
    responseJsonSchema: GROUP_SCHEMA,
    temperature: 0.4,
  });

  if (!result.photos?.length) {
    throw new Error("Gemini did not return photo groupings.");
  }
  return result;
}

// ─── 2. Pre-answered guided questionnaire ─────────────────────────────────────

export interface GuidedQuestionnaireInput {
  listingType?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  facts: ListingFacts;
  /** Compact per-group summary derived from photo analysis. */
  groups: Array<{ label: string; rooms: string[]; descriptions: string[] }>;
}

const GUIDED_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["id", "question", "answer"],
      },
    },
  },
  required: ["questions"],
};

const GUIDED_SYSTEM = `You are an interviewer helping a homeowner or agent tell the story of a property for "Love That For You".

You will receive property facts, location, and a summary of what every photo shows (grouped by space). Produce a short, step-by-step questionnaire that is ALREADY ANSWERED on the owner's behalf, inferring the best possible answer purely from the photos and facts. The owner will read each answer and either agree or edit it, so write answers in a confident, first-person-friendly voice that sounds like the owner could have written it.

Produce 7–9 questions covering, in this order:
1. id "description" — "In one sentence, how would you describe this property?"
2. id "differentiator" — "What makes it feel different from nearby homes?"
3. id "ideal-buyer" — "Who would love this home most?"
4. id "favorite-space" — "Which space is the most special, and why?"
5. id "daily-life" — "What does daily life here feel like?"
6. id "outdoor" — "Describe the outdoor spaces and connection to nature."
7. id "neighborhood" — "What's worth knowing about the neighborhood / location?"
8. id "architecture" — "What architectural details are worth highlighting?"
9. id "tone" — "What three words capture the emotional tone of this home?"

Each "answer" must be specific to THIS property based on the photos (mention real rooms, materials, light, layout) — never generic. 1–3 sentences each (the tone answer can be three words/phrases). Keep ids exactly as listed.

Return only data conforming to the schema.`;

export async function generateGuidedQuestionnaire(
  input: GuidedQuestionnaireInput,
): Promise<GuidedAnswer[]> {
  const prompt = [
    `Listing type: ${input.listingType ?? "Residential"}`,
    `Location: ${[input.neighborhood, input.city, input.state].filter(Boolean).join(", ") || "Unknown"}`,
    `Facts: ${JSON.stringify(input.facts)}`,
    `Spaces shown in photos:`,
    ...input.groups.map(
      (g) =>
        `- ${g.label} (${g.rooms.join(", ")}): ${g.descriptions.join(" ")}`,
    ),
  ].join("\n");

  const { questions } = await generateJson<{ questions: GuidedAnswer[] }>({
    contents: prompt,
    systemInstruction: GUIDED_SYSTEM,
    responseJsonSchema: GUIDED_SCHEMA,
    temperature: 0.8,
  });

  if (!questions?.length) {
    throw new Error("Gemini did not return any questions.");
  }
  return questions.map((q) => ({ ...q, approved: false }));
}

// ─── 3. Final story generation (grouped, image-aware) ─────────────────────────

export interface StoryMoment {
  imageIndex: number;
  isTitle: boolean;
  title: string;
  subtitle?: string;
  body?: string;
}

export interface StoryScene {
  groupKey: string;
  label: string;
  moments: StoryMoment[];
}

export interface GeneratedStory {
  hero: {
    title: string;
    subtitle: string;
    introNarrative: string;
    detailsHeadline: string;
  };
  scenes: StoryScene[];
  seo: {
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  };
}

export interface StorySceneInput {
  groupKey: string;
  label: string;
  /** Images already ordered (wide/establishing first, then details). */
  images: Array<{
    index: number;
    roomType: string;
    description: string;
    shotType: ShotType | string;
  }>;
}

export interface GenerateStoryInput {
  listingType?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  facts: ListingFacts;
  contact: ListingContact;
  guidedAnswers: GuidedAnswer[];
  scenes: StorySceneInput[];
}

const STORY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hero: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        subtitle: { type: Type.STRING },
        introNarrative: { type: Type.STRING },
        detailsHeadline: { type: Type.STRING },
      },
      required: ["title", "subtitle", "introNarrative", "detailsHeadline"],
    },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          groupKey: { type: Type.STRING },
          label: { type: Type.STRING },
          moments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                imageIndex: { type: Type.NUMBER },
                isTitle: { type: Type.BOOLEAN },
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                body: { type: Type.STRING },
              },
              required: ["imageIndex", "isTitle", "title"],
            },
          },
        },
        required: ["groupKey", "label", "moments"],
      },
    },
    seo: {
      type: Type.OBJECT,
      properties: {
        metaDescription: { type: Type.STRING },
        ogTitle: { type: Type.STRING },
        ogDescription: { type: Type.STRING },
      },
      required: ["metaDescription", "ogTitle", "ogDescription"],
    },
  },
  required: ["hero", "scenes", "seo"],
};

const STORY_SYSTEM = `You are the narrative engine for "Love That For You", a platform that turns ordinary real-estate listing photos into immersive, cinematic property stories.

Voice: cinematic, grounded, editorial, emotional, premium — never MLS-like, never salesy, never clichéd ("luxury living awaits", "dream home"). Write like a thoughtful magazine feature. Short, evocative scene titles. Body copy is 1–2 specific, sensory sentences tied to a real detail visible in the photo.

You will receive: property facts, the owner's confirmed answers, and a pre-built set of SCENES. Each scene already contains its images, in order, each with an imageIndex, roomType, and description. DO NOT reorder, add, merge, split, or drop scenes or images.

For EVERY image in EVERY scene, output exactly one moment, preserving its imageIndex and the given order:
- The FIRST image of each scene is the title card: isTitle=true, a short evocative "title" (3–6 words) and one atmospheric "subtitle" sentence. Leave "body" empty.
- Every OTHER image: isTitle=false, a short "title" (room or feature name) and a grounded "body" of 1–2 sentences tied to what's actually in that photo's description. Leave "subtitle" empty.
- Keep the scene's groupKey and label exactly as given.

Also write:
- hero.title: a short evocative headline; hero.subtitle: one sentence; hero.introNarrative: 2–4 sentences; hero.detailsHeadline: like "Claim your piece of <neighborhood or city>".
- seo.metaDescription <= 160 chars; ogTitle and ogDescription.

Return only data conforming to the schema. The total number of moments must equal the total number of input images, with matching imageIndex values.`;

export async function generateListingStory(
  input: GenerateStoryInput,
): Promise<GeneratedStory> {
  const prompt = [
    `Listing type: ${input.listingType ?? "Residential"}`,
    `Location: ${[input.neighborhood, input.city, input.state].filter(Boolean).join(", ")}`,
    `Facts: ${JSON.stringify(input.facts)}`,
    `Owner's confirmed answers:`,
    ...input.guidedAnswers.map((a) => `- ${a.question} ${a.answer}`),
    `Scenes (do not reorder; one moment per image):`,
    JSON.stringify(input.scenes),
  ].join("\n");

  const parsed = await generateJson<GeneratedStory>({
    contents: prompt,
    systemInstruction: STORY_SYSTEM,
    responseJsonSchema: STORY_SCHEMA,
    temperature: 0.9,
  });

  if (!parsed.scenes?.length) {
    throw new Error("Gemini did not return any scenes.");
  }
  return parsed;
}
