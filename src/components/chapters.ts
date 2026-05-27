// ─── Chapter / Moment data ────────────────────────────────────────────────────
//
// Two moment types:
//
//   isTitle: true  → Chapter title card: large serif headline + atmospheric
//                    subtitle. Rendered at a larger font scale.
//
//   isTitle: false → Moment text: grounded sans/serif pairing at a smaller
//                    scale. Tied to a specific detail of the property.
//
// scrollVh controls how many virtual-pixel heights of scroll each moment
// occupies, and thus how long the user dwells on it:
//   TITLE_VH  = 130  (title cards — less text, quicker chapter open)
//   MOMENT_VH = 160  (regular moments — enough time to read two sentences)
//   SHORT_VH  = 130  (short/list-style moments — neighborhood amenities, etc.)
//
// Image paths map to /public/images/property/*.webp.
//
// FUTURE: each Moment will also carry a `splat?: SplatSceneConfig` field.
// When that field is present, <SplatScene /> replaces the <Image> in
// MomentImageLayer. The scroll-animation wiring (opacity, scale, y) stays
// identical.

export type TextAlign = "left" | "center" | "right";

export interface Moment {
  image: string;
  /** Renders as a large editorial title card when true */
  isTitle?: boolean;
  /** Eyebrow label — small caps, tracking wide */
  eyebrow?: string;
  /** Main display headline */
  title: string;
  /** Atmospheric subtitle shown only on title cards */
  subtitle?: string;
  /** Body text — specific, grounded, 1–2 sentences */
  body?: string;
  align?: TextAlign;
  /** Scroll-space height in vh. Omit to use the per-type default. */
  scrollVh?: number;
}

export interface Chapter {
  id: string;
  label: string;
  moments: Moment[];
}

// Default scroll heights (used in ChapterScene when scrollVh is omitted)
export const TITLE_VH  = 130;
export const MOMENT_VH = 160;
export const SHORT_VH  = 130;

export const chapters: Chapter[] = [

  // ── 01 ARRIVAL ─────────────────────────────────────────────────────────────
  {
    id: "arrival",
    label: "Arrival",
    moments: [
      {
        image: "/images/property/arrival-001.webp",
        isTitle: true,
        eyebrow: "01",
        title: "Set above St. Elmo",
        subtitle:
          "A quiet climb up Seneca Avenue, a fenced hillside, and a front porch facing the Lookout Mountain ridge.",
        align: "left",
        scrollVh: TITLE_VH,
      },
      {
        image: "/images/property/arrival-002.webp",
        title: "The approach",
        body: "Seneca Avenue rises from Tennessee Avenue into a quiet closed loop at the foot of Lookout Mountain.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/arrival-003.webp",
        title: "The front lawn",
        body: "Original chert landscaping, upgraded lighting, and a lit brick walk lead toward the house.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/arrival-004.webp",
        title: "The porch",
        body: "A covered front porch spans the width of the home — room to sit, gather, and take in the ridge line.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
    ],
  },

  // ── 02 ENTRANCE ────────────────────────────────────────────────────────────
  {
    id: "entrance",
    label: "Entrance",
    moments: [
      {
        image: "/images/property/entrance-001.webp",
        isTitle: true,
        eyebrow: "02",
        title: "The first room opens wide",
        subtitle:
          "Ten-foot ceilings, original oversized windows, and an open living and dining space facing west toward the mountain.",
        align: "left",
        scrollVh: TITLE_VH,
      },
      {
        image: "/images/property/entrance-002.webp",
        title: "The living room",
        body: "Original windows bring in soft western light and frame the view back toward the porch and ridge.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/entrance-003.webp",
        title: "The dining room",
        body: "The front of the home flows naturally between dining, living, and kitchen — no forced separation.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/entrance-004.webp",
        title: "The fireplace wall",
        body: "Historic texture anchors the room without making the space feel formal or frozen.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
    ],
  },

  // ── 03 THE HEART ───────────────────────────────────────────────────────────
  {
    id: "the-heart",
    label: "The Heart",
    moments: [
      {
        image: "/images/property/heart-001.webp",
        isTitle: true,
        eyebrow: "03",
        title: "Where the house works",
        subtitle:
          "A warm kitchen, generous storage, and a practical back-of-house area that keeps daily life moving.",
        align: "left",
        scrollVh: TITLE_VH,
      },
      {
        image: "/images/property/heart-002.webp",
        title: "The kitchen",
        body: "Floor-to-ceiling wood cabinetry gives the kitchen unusually generous storage for a home this age.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/heart-003.webp",
        title: "The farmhouse sink",
        body: "An oversized original sink keeps the room connected to the home's older character without performing nostalgia.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/heart-004.webp",
        title: "The laundry room",
        body: "Surrounded by original paned windows, it doubles as a pantry and utility space. More useful than it has any right to be.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
    ],
  },

  // ── 04 ACCOMMODATIONS ──────────────────────────────────────────────────────
  {
    id: "accommodations",
    label: "Accommodations",
    moments: [
      {
        image: "/images/property/accommodations-001.webp",
        isTitle: true,
        eyebrow: "04",
        title: "The quiet side of the house",
        subtitle:
          "Two bedrooms, two baths, and rear-facing views that feel more wooded than urban.",
        align: "left",
        scrollVh: TITLE_VH,
      },
      {
        image: "/images/property/accommodations-002.webp",
        title: "The guest room",
        body: "Currently used as an office, this room looks out toward the private backyard. The light is cooler on this side of the house.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/accommodations-003.webp",
        title: "The guest bath",
        body: "Open shelving, a tub and shower, pedestal sink, and practical linen storage. Nothing overthought.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/accommodations-004.webp",
        title: "The primary bedroom",
        body: "Corner windows bring in natural light and connect the room to the trees outside. Morning is slow here.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/accommodations-005.webp",
        title: "The ensuite",
        body: "A double sink and glass-door walk-in shower give the primary suite a more generous feel than the square footage suggests.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
    ],
  },

  // ── 05 SURROUNDINGS ────────────────────────────────────────────────────────
  {
    id: "surroundings",
    label: "Surroundings",
    moments: [
      {
        image: "/images/property/surroundings-001.webp",
        isTitle: true,
        eyebrow: "05",
        title: "Wrapped in green",
        subtitle:
          "A privacy fence, mature trees, and a sloped backyard create the feeling of being tucked into the mountain.",
        align: "left",
        scrollVh: TITLE_VH,
      },
      {
        image: "/images/property/surroundings-002.webp",
        title: "The side yard",
        body: "A private outdoor chill space sits just off the main living areas — sheltered, unprogrammed, and easy to use.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/surroundings-003.webp",
        title: "The backyard",
        body: "The slope rises behind the house into mature trees and natural shade. The yard grows quieter the further you move through it.",
        align: "left",
        scrollVh: MOMENT_VH,
      },
      {
        image: "/images/property/surroundings-004.webp",
        title: "The fence line",
        body: "The property is wrapped in a tall privacy fence. Inside, it feels enclosed and quiet — more city garden than urban lot.",
        align: "right",
        scrollVh: MOMENT_VH,
      },
    ],
  },

  // ── 06 NEIGHBORHOOD ────────────────────────────────────────────────────────
  {
    id: "neighborhood",
    label: "Neighborhood",
    moments: [
      {
        image: "/images/property/neighborhood-01.webp",
        isTitle: true,
        eyebrow: "06",
        title: "A village inside the city",
        subtitle:
          "Coffee, trails, music, restaurants, the greenway, and the Incline Railway are all part of daily life in St. Elmo.",
        align: "left",
        scrollVh: TITLE_VH,
      },
      {
        image: "/images/property/neighborhood-02.webp",
        title: "Coffee nearby",
        body: "Goodman Coffee Roasters and Wayward Pastry Co are both within walking distance.",
        align: "left",
        scrollVh: SHORT_VH,
      },
      {
        image: "/images/property/neighborhood-03.webp",
        title: "Dinner nearby",
        body: "Little Coyote, The Purple Daisy, The Hummus Bowl, Mr. T's, and Amigos give the neighborhood real variety.",
        align: "right",
        scrollVh: SHORT_VH,
      },
      {
        image: "/images/property/neighborhood-01.webp",
        title: "Music nearby",
        body: "The Woodshop brings live music and a blues-room feel into the neighborhood most nights.",
        align: "left",
        scrollVh: SHORT_VH,
      },
      {
        image: "/images/property/neighborhood-02.webp",
        title: "The greenway",
        body: "Two blocks away, the walking and biking path eventually carries you toward downtown and the Tennessee River.",
        align: "right",
        scrollVh: SHORT_VH,
      },
      {
        image: "/images/property/neighborhood-03.webp",
        title: "The Incline",
        body: "Walk down to the historic Incline Railway and ride up toward the ridge and Point Park — still the best view in town.",
        align: "left",
        scrollVh: SHORT_VH,
      },
    ],
  },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

export function getMomentVh(m: Moment): number {
  return m.scrollVh ?? (m.isTitle ? TITLE_VH : MOMENT_VH);
}
