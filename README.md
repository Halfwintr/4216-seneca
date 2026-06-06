# Love That For You — Property Story Engine

A platform that turns standard real estate listing assets into immersive,
cinematic property experiences. Agents create a listing, add photos and
details, and get a narrative-driven microsite served on a per-listing
subdomain.

Built with Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, Framer
Motion, Lenis, and Supabase (Postgres + Auth + Storage).

> Note: this repo runs a non-standard build of Next.js 16. Middleware is
> replaced by `proxy.ts`, and route `params` are async. See
> `node_modules/next/dist/docs/` before changing routing.

## Architecture

- **Public microsite** — `app/listing/[slug]` renders the cinematic
  `ListingExperience` from data in Supabase. `proxy.ts` rewrites
  `<slug>.<BASE_DOMAIN>` to this route; `/l/<slug>` is the local-dev fallback.
- **Dashboard** — `app/(dashboard)` (auth-gated) for listing CRUD, the scene /
  moment editor, publish toggle, and leads.
- **Data** — `src/lib/types.ts` (domain types), `src/lib/listings.ts` (queries),
  `src/lib/supabase/*` (browser / server / admin / proxy clients).
- **Rendering** — scroll-scrubbed baked frame sequences (`/public/scenes`) via
  `ScrollFrameScene`; offline splat baking tooling lives in `/capture` +
  `scripts/`.

## Local development (macOS)

These steps get a fresh clone running on a Mac. The core app (Steps 1–6) runs on
any machine; the optional **3D push-in renders** (Step 7) bake locally and are
designed for **Apple Silicon**.

### Prerequisites

- **Node.js 20+** and npm (`node -v` to check).
- **Git**.
- A **Supabase** project (free tier is fine) — or the [Supabase CLI](https://supabase.com/docs/guides/local-development)
  for a fully local stack.
- For the optional 3D pipeline only: an **Apple Silicon Mac**, **Python 3.13**,
  and **Xcode Command Line Tools** (`xcode-select --install`).

### 1. Clone and install

```bash
git clone <repo-url> 4216-seneca
cd 4216-seneca
npm install
```

### 2. Install the Playwright browser

The offline frame renderer (`scripts/render-splat-frames.mjs`) drives a real
Chromium. Only needed if you'll bake 3D sequences (Step 7), but harmless to run now:

```bash
npx playwright install chromium
```

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard → **Project Settings → API**.
  (Service role key is **server-only**; never expose it to the browser.)
- `NEXT_PUBLIC_BASE_DOMAIN` — leave as `localhost:3000` for local dev (the
  path-based `/l/<slug>` fallback always works).
- `GEMINI_API_KEY` — optional; only needed for the AI listing walkthrough.
  Get one at [Google AI Studio](https://aistudio.google.com/apikey).
- `RENDER_*` — optional; only for the 3D pipeline (see Step 7).

### 4. Apply the database schema

Run the SQL in `supabase/migrations/` **in filename order**, via the Supabase
SQL editor, or with the CLI against your linked project:

```bash
supabase db push
```

(For a local Supabase stack: `supabase start`, then `supabase db reset` applies
all migrations.)

### 5. Seed the example listing (optional)

```bash
npm run seed
```

Creates a seed owner account (credentials printed to the console) and one
published demo listing (4216 Seneca). Preview at
[http://localhost:3000/l/4216-seneca](http://localhost:3000/l/4216-seneca).

> The seeded demo uses static images bundled in `public/images/property/`.
> Listings you create through the app store their photos in Supabase Storage.

### 6. Run the dev server

```bash
npm run dev
```

- `/` — marketing page
- `/signup` — create an account
- `/dashboard` — manage listings (the image-first editor)
- `/l/<slug>` — the public cinematic microsite

### 7. 3D push-in renders (optional, Apple Silicon)

The cinematic "dolly" sequences are baked **locally** from a single photo using
Apple's [SHARP](https://github.com/apple/ml-sharp) model (image → Gaussian
splat), then a Chromium pass captures the camera move into a WebP frame
sequence that's uploaded to Supabase. The app runs fine without this — scenes
just won't have 3D motion until baked.

1. Install SHARP into a Python venv:

   ```bash
   git clone https://github.com/apple/ml-sharp.git ~/ml-sharp
   python3.13 -m venv ~/.sharp-venv
   ~/.sharp-venv/bin/pip install -r ~/ml-sharp/requirements.txt
   ~/.sharp-venv/bin/sharp --help   # verify the CLI is installed
   ```

   The model checkpoint (~250 MB) auto-downloads on first run and caches in
   `~/.cache/torch`.

2. Point the app at the venv in `.env.local`:

   ```bash
   RENDER_SHARP_VENV=/Users/<you>/.sharp-venv
   ```

   (The default is `/tmp/4216-seneca-sharp/.venv`, but macOS clears `/tmp` on
   reboot — use a persistent path.)

3. With `npm run dev` running, open a listing in `/dashboard`, flag photos as
   **3D** on the Photos tab, then click **Generate 3D**. Only newly-flagged
   photos are baked; already-baked ones are skipped.

**Render tuning** (all optional, set in `.env.local`):

| Var | Default | Meaning |
| --- | --- | --- |
| `RENDER_WIDTH` / `RENDER_HEIGHT` | `2560` / `1440` | Output frame resolution (QHD) |
| `RENDER_QUALITY` | `90` | WebP quality |
| `RENDER_FRAMES` | `60` | Frames per dolly |
| `RENDER_ZOOM` | `0.03` | Dolly push distance (small = gentle, less distortion) |
| `RENDER_FOV` | `46.8` | Camera FOV; narrow it for a distant/outdoor shot that shows a black border |
| `RENDER_START` | `0` | Base inward dolly offset |
| `RENDER_SHARP_VENV` | `/tmp/4216-seneca-sharp/.venv` | Path to the SHARP venv |

> A CUDA GPU is **not** required: SHARP prediction runs on Apple's MPS. (SHARP's
> own video rendering needs CUDA, but this project renders frames via Chromium
> instead, so MPS is sufficient.)

## Deferred (roadmap)

AI narrative generation + discovery questionnaire, automated Gaussian-splat
generation from photos, MLS/Zillow import, social asset export, Stripe billing
tiers, AI receptionist, advanced analytics, and custom domains.
