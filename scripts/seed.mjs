// ─────────────────────────────────────────────────────────────────────────────
// Seed 4216 Seneca Ave as the first published listing.
//
// Run with:  npm run seed
// (uses node --env-file=.env.local; requires SUPABASE_SERVICE_ROLE_KEY)
//
// Idempotent: deletes any existing listing with the same slug (cascading to its
// scenes/moments) and re-inserts. Content mirrors the original hardcoded
// chapters.ts + frameScenes.ts + Details block.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const SLUG = "4216-seneca";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@lovethatforyou.app";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Fill in .env.local and run `npm run seed`.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Derive the baked frame-sequence folder from an image path:
//   /images/property/arrival-001.webp  ->  /scenes/arrival-001
function frameFor(image) {
  const base = image.split("/").pop().replace(/\.(webp|jpg|jpeg|png)$/i, "");
  return `/scenes/${base}`;
}

const TITLE_VH = 156;
const MOMENT_VH = 192;
const SHORT_VH = 156;

const IMG = (name) => `/images/property/${name}`;

const SCENES = [
  {
    key: "arrival",
    label: "Arrival",
    moments: [
      { image: IMG("arrival-001.webp"), isTitle: true, eyebrow: "01", title: "Set above St. Elmo", subtitle: "A quiet climb up Seneca Avenue, a fenced hillside, and a front porch facing the Lookout Mountain ridge.", align: "left", scrollVh: TITLE_VH },
      { image: IMG("arrival-002.webp"), title: "The approach", body: "Seneca Avenue rises from Tennessee Avenue into a quiet closed loop at the foot of Lookout Mountain.", align: "left", scrollVh: MOMENT_VH },
      { image: IMG("arrival-003.webp"), title: "The front lawn", body: "Original chert landscaping, upgraded lighting, and a lit brick walk lead toward the house.", align: "right", scrollVh: MOMENT_VH },
      { image: IMG("arrival-004.webp"), title: "The porch", body: "A covered front porch spans the width of the home — room to sit, gather, and take in the ridge line.", align: "left", scrollVh: MOMENT_VH },
    ],
  },
  {
    key: "entrance",
    label: "Entrance",
    moments: [
      { image: IMG("entrance-17.jpg"), isTitle: true, eyebrow: "02", title: "The first room opens wide", subtitle: "Ten-foot ceilings, original oversized windows, and an open living and dining space facing west toward the mountain.", align: "left", scrollVh: TITLE_VH },
      { image: IMG("entrance-16.jpg"), title: "The living room", body: "Original windows bring in soft western light and frame the view back toward the porch and ridge.", align: "left", scrollVh: MOMENT_VH },
      { image: IMG("entrance-13.jpg"), title: "The dining room", body: "The front of the home flows naturally between dining, living, and kitchen — no forced separation.", align: "right", scrollVh: MOMENT_VH },
      { image: IMG("entrance-15.jpg"), title: "The fireplace wall", body: "Historic texture anchors the room without making the space feel formal or frozen.", align: "left", scrollVh: MOMENT_VH },
    ],
  },
  {
    key: "the-heart",
    label: "The Heart",
    moments: [
      { image: IMG("heart-001.webp"), isTitle: true, eyebrow: "03", title: "Where the house works", subtitle: "A warm kitchen, generous storage, and a practical back-of-house area that keeps daily life moving.", align: "left", scrollVh: TITLE_VH },
      { image: IMG("heart-002.webp"), title: "The kitchen", body: "Floor-to-ceiling wood cabinetry gives the kitchen unusually generous storage for a home this age.", align: "right", scrollVh: MOMENT_VH },
      { image: IMG("heart-003.webp"), title: "The farmhouse sink", body: "An oversized original sink keeps the room connected to the home's older character without performing nostalgia.", align: "left", scrollVh: MOMENT_VH },
      { image: IMG("heart-004.webp"), title: "The laundry room", body: "Surrounded by original paned windows, it doubles as a pantry and utility space. More useful than it has any right to be.", align: "right", scrollVh: MOMENT_VH },
    ],
  },
  {
    key: "accommodations",
    label: "Quarters",
    moments: [
      { image: IMG("accommodations-12.webp"), isTitle: true, eyebrow: "04", title: "The quiet side of the house", subtitle: "Two bedrooms, two baths, and rear-facing views that feel more wooded than urban.", align: "left", scrollVh: TITLE_VH },
      { image: IMG("accommodations-23.webp"), title: "The guest room", body: "Currently used as an office, this room looks out toward the private backyard. The light is cooler on this side of the house.", align: "right", scrollVh: MOMENT_VH },
      { image: IMG("accommodations-13.webp"), title: "The guest bath", body: "Open shelving, a tub and shower, pedestal sink, and practical linen storage. Nothing overthought.", align: "left", scrollVh: MOMENT_VH },
      { image: IMG("accommodations-20.webp"), title: "The primary bedroom", body: "Corner windows bring in natural light and connect the room to the trees outside. Morning is slow here.", align: "right", scrollVh: MOMENT_VH },
      { image: IMG("accommodations-18.webp"), title: "The ensuite", body: "A double sink and glass-door walk-in shower give the primary suite a more generous feel than the square footage suggests.", align: "left", scrollVh: MOMENT_VH },
    ],
  },
  {
    key: "surroundings",
    label: "Grounds",
    moments: [
      { image: IMG("surroundings-14.webp"), isTitle: true, eyebrow: "05", title: "Wrapped in green", subtitle: "A privacy fence, mature trees, and a sloped backyard create the feeling of being tucked into the mountain.", align: "left", scrollVh: TITLE_VH },
      { image: IMG("surroundings-09.webp"), title: "The side yard", body: "A private outdoor chill space sits just off the main living areas — sheltered, unprogrammed, and easy to use.", align: "right", scrollVh: MOMENT_VH },
      { image: IMG("surroundings-11.webp"), title: "The backyard", body: "The slope rises behind the house into mature trees and natural shade. The yard grows quieter the further you move through it.", align: "left", scrollVh: MOMENT_VH },
      { image: IMG("surroundings-02.webp"), title: "The fence line", body: "The property is wrapped in a tall privacy fence. Inside, it feels enclosed and quiet — more city garden than urban lot.", align: "right", scrollVh: MOMENT_VH },
    ],
  },
  {
    key: "neighborhood",
    label: "Nearby",
    moments: [
      { image: IMG("neighborhood-01.webp"), isTitle: true, eyebrow: "06", title: "A village inside the city", subtitle: "Coffee, trails, music, restaurants, the greenway, and the Incline Railway are all part of daily life in St. Elmo.", align: "left", scrollVh: TITLE_VH },
      { image: IMG("neighborhood-02.webp"), title: "Coffee nearby", body: "Goodman Coffee Roasters and Wayward Pastry Co are both within walking distance.", align: "left", scrollVh: SHORT_VH },
      { image: IMG("neighborhood-03.webp"), title: "Dinner nearby", body: "Little Coyote, The Purple Daisy, The Hummus Bowl, Mr. T's, and Amigos give the neighborhood real variety.", align: "right", scrollVh: SHORT_VH },
      { image: IMG("neighborhood-01.webp"), title: "Music nearby", body: "The Woodshop brings live music and a blues-room feel into the neighborhood most nights.", align: "left", scrollVh: SHORT_VH },
      { image: IMG("neighborhood-02.webp"), title: "The greenway", body: "Two blocks away, the walking and biking path eventually carries you toward downtown and the Tennessee River.", align: "right", scrollVh: SHORT_VH },
      { image: IMG("neighborhood-03.webp"), title: "The Incline", body: "Walk down to the historic Incline Railway and ride up toward the ridge and Point Park — still the best view in town.", align: "left", scrollVh: SHORT_VH },
    ],
  },
];

const LISTING = {
  slug: SLUG,
  status: "published",
  address_line: "4216 Seneca Ave",
  city: "Chattanooga",
  state: "TN",
  postal_code: "37409",
  listing_type: "Residential",
  occupancy: "Owner occupied",
  hero: {
    title: "4216 Seneca Ave — A Private Mountain-Side Home in St. Elmo",
    subtitle: "A private mountain-side home in the heart of St. Elmo.",
    introNarrative:
      "At the edge of the St. Elmo historic district, the house rises above a quiet wooded loop beneath Lookout Mountain — elevated enough to feel secluded, yet walkable to coffee shops, trails, restaurants, music venues, and the greenway below.",
    neighborhood: "Saint Elmo",
    detailsHeadline: "Claim Your Piece of Saint Elmo",
  },
  facts: {
    beds: 2,
    baths: 2,
    sqft: "~1,400",
    yearBuilt: 1920,
    lotSize: "0.44 acre",
    features: [
      "Open-concept layout",
      "10-foot ceilings",
      "Original hardwood floors",
      "Oversized original windows",
      "Gas fireplace",
      "Encapsulated basement",
      "Updated heat pump HVAC",
      "Full roof replacement (50-year transferable warranty)",
      "Updated kitchen with Samsung Bespoke appliances",
      "Original farmhouse sink",
      "Full-width covered porch",
      "Landscape lighting",
      "Restored historic stonework",
      "Garage with power door",
    ],
    extra: [
      { label: "Ceilings", value: "10 ft in main living areas" },
      { label: "Basement", value: "Encapsulated, moisture-controlled" },
      { label: "Garage", value: "Power door + storage" },
      { label: "Porch", value: "Full-width covered front porch" },
      { label: "Yard", value: "Fully fenced property" },
      { label: "Location", value: "Walkable St. Elmo" },
    ],
  },
  contact: {
    phone: "844-799-7886",
    sms: "(423) 463-0640",
    email: "halfwintr@gmail.com",
    mls: "1535585",
    brokerage: "Beycome Brokerage Realty LLC",
  },
  branding: {
    logoPath: "/brand/beycome.svg",
  },
  seo: {
    metaDescription:
      "Historic 1920 bungalow in St. Elmo with mountain views, oversized lot, tall ceilings, restored character, and wooded privacy minutes from downtown Chattanooga.",
    ogTitle: "4216 Seneca Ave — A Private Mountain-Side Home in St. Elmo",
    ogDescription:
      "An immersive cinematic property story exploring one of St. Elmo's most private and distinctive historic homes.",
  },
  open_house: {
    date: "Sunday, May 31, 2026",
    startTime: "2:00 PM",
    endTime: "5:00 PM",
    notes:
      "Walk the property, experience the mountain view, and explore St. Elmo from one of its most private settings.",
  },
};

async function ensureOwner() {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (!error && created?.user) {
    console.log(`Created seed owner: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
    return created.user;
  }

  // Already exists — find the user.
  let page = 1;
  for (;;) {
    const { data, error: listErr } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const found = data.users.find((u) => u.email === OWNER_EMAIL);
    if (found) {
      console.log(`Using existing seed owner: ${OWNER_EMAIL}`);
      return found;
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  throw new Error(`Could not create or find seed owner ${OWNER_EMAIL}`);
}

async function main() {
  const owner = await ensureOwner();

  // Remove any prior copy (cascade clears scenes/moments/leads).
  const { error: delErr } = await admin
    .from("listings")
    .delete()
    .eq("slug", SLUG);
  if (delErr) throw delErr;

  const { data: listing, error: insErr } = await admin
    .from("listings")
    .insert({ ...LISTING, owner_id: owner.id })
    .select("id")
    .single();
  if (insErr) throw insErr;

  console.log(`Inserted listing ${SLUG} (${listing.id})`);

  for (let s = 0; s < SCENES.length; s += 1) {
    const scene = SCENES[s];
    const { data: sceneRow, error: sceneErr } = await admin
      .from("scenes")
      .insert({
        listing_id: listing.id,
        position: s,
        key: scene.key,
        label: scene.label,
      })
      .select("id")
      .single();
    if (sceneErr) throw sceneErr;

    const moments = scene.moments.map((m, i) => {
      // The title/establishing shot is the wide, 3D-render image; the rest are
      // detail shots that populate the photo carousel.
      const wide = Boolean(m.isTitle);
      return {
        scene_id: sceneRow.id,
        position: i,
        image_path: m.image,
        frame_sequence_path: frameFor(m.image),
        is_title: wide,
        eyebrow: m.eyebrow ?? null,
        title: m.title,
        subtitle: m.subtitle ?? null,
        body: m.body ?? null,
        align: m.align ?? "left",
        scroll_vh: m.scrollVh ?? null,
        shot_type: wide ? "wide" : "detail",
        render_candidate: wide,
      };
    });

    const { error: momErr } = await admin.from("moments").insert(moments);
    if (momErr) throw momErr;

    console.log(`  + scene ${scene.key} (${moments.length} moments)`);
  }

  console.log("\nDone. Visit /l/4216-seneca to preview.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
