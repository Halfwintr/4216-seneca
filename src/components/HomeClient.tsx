"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { SceneSection } from "./SceneSection";
import { SceneNav } from "./SceneNav";
import { ProgressIndicator } from "./ProgressIndicator";
import { CTAButton } from "./CTAButton";

// ─── Section metadata ────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "arrival",        label: "Arrival"        },
  { id: "entrance",       label: "Entrance"       },
  { id: "the-heart",      label: "The Heart"      },
  { id: "accommodations", label: "Accommodations" },
  { id: "surroundings",   label: "Surroundings"   },
  { id: "neighborhood",   label: "Neighborhood"   },
  { id: "details",        label: "Details"        },
] as const;

// ─── Shared animation presets ────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
};

const viewportOpts = { once: true, margin: "-80px" } as const;

function SectionLabel({ index, label, light = true }: { index: number; label: string; light?: boolean }) {
  return (
    <motion.p
      variants={fadeIn}
      initial="hidden"
      whileInView="show"
      viewport={viewportOpts}
      transition={{ duration: 0.6 }}
      className={`text-[10px] tracking-[0.25em] uppercase font-sans font-light section-index ${
        light ? "text-stone-300/60" : "text-stone-700/60"
      }`}
    >
      {String(index + 1).padStart(2, "0")}&thinsp;/&thinsp;{label}
    </motion.p>
  );
}

function Rule({ light = true }: { light?: boolean }) {
  return (
    <motion.div
      variants={{ hidden: { scaleX: 0, originX: 0 }, show: { scaleX: 1 } }}
      initial="hidden"
      whileInView="show"
      viewport={viewportOpts}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className={`h-px w-12 ${light ? "bg-amber-warm/50" : "bg-amber-warm-dim/40"}`}
    />
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function HomeClient() {
  const [activeSection, setActiveSection] = useState(0);

  const handleSectionEnter = useCallback((index: number) => {
    setActiveSection(index);
  }, []);

  return (
    <>
      <ProgressIndicator />
      <SceneNav sections={[...SECTIONS]} activeIndex={activeSection} />
      <CTAButton />

      <main>

        {/* ── 1. ARRIVAL ─────────────────────────────────────────────────── */}
        <SceneSection
          id="arrival"
          label="Arrival"
          index={0}
          onEnter={handleSectionEnter}
          /*
           * FUTURE: Replace this `background` string with:
           *   <SplatScene sceneId="arrival" />
           * Scene concept: exterior dusk shot, warm porch light,
           * Lookout Mountain silhouette behind.
           */
          background="
            radial-gradient(ellipse at 50% 60%, #2C1E14 0%, #1A1108 40%, #0D0B09 100%)
          "
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="px-6 py-24 flex flex-col items-center gap-6">

            {/* Address mark */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="show"
              transition={{ duration: 1.2, delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <span className="h-px w-8 bg-amber-warm/40" />
              <span className="text-[10px] tracking-[0.3em] uppercase font-sans font-light text-stone-400">
                St. Elmo · Chattanooga, Tennessee
              </span>
              <span className="h-px w-8 bg-amber-warm/40" />
            </motion.div>

            {/* Main heading */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ duration: 1.1, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-serif font-light italic text-stone-50 leading-none tracking-tight"
              style={{ fontSize: "clamp(4.5rem, 12vw, 9rem)" }}
            >
              4216 Seneca
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ duration: 1, delay: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-serif font-light italic text-stone-300 max-w-sm leading-relaxed"
              style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)" }}
            >
              A house that has held a hundred years of morning light.
            </motion.p>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="mt-12 flex flex-col items-center gap-2"
              aria-hidden
            >
              <span className="text-[9px] tracking-[0.3em] uppercase font-sans text-stone-500">
                Scroll
              </span>
              <div className="flex flex-col gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-px h-1.5 bg-stone-500/50 rounded-full mx-auto"
                    style={{
                      animation: `pulse-down 1.8s ease-in-out ${i * 0.25}s infinite`,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </SceneSection>

        {/* ── 2. ENTRANCE ────────────────────────────────────────────────── */}
        <SceneSection
          id="entrance"
          label="Entrance"
          index={1}
          onEnter={handleSectionEnter}
          /*
           * FUTURE: Replace with <SplatScene sceneId="entrance" />
           * Scene concept: front porch and door frame, late afternoon,
           * original millwork visible through the glass.
           */
          background="
            linear-gradient(155deg, #A89070 0%, #8C7258 30%, #6B5240 60%, #3D2E22 100%)
          "
          className="flex flex-col justify-end"
        >
          <div className="px-8 md:px-16 lg:px-24 py-16 md:py-24 max-w-2xl">
            <div className="flex flex-col gap-5">
              <SectionLabel index={1} label="Entrance" />
              <Rule />

              <motion.h2
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-serif font-light italic text-stone-50 leading-tight"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
              >
                A Considered&nbsp;Welcome
              </motion.h2>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-sans font-light text-stone-300 leading-relaxed max-w-md"
                style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)" }}
              >
                The threshold tells you everything. Original woodwork, worn smooth
                to the touch over a century of hands. A staircase that has witnessed
                every season twice. The house greets you with the confidence of
                something that knows what it is.
              </motion.p>

              <motion.p
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="text-[10px] tracking-[0.2em] uppercase font-sans font-light text-stone-400/60"
              >
                Built 1922 &nbsp;·&nbsp; St. Elmo Historic District
              </motion.p>
            </div>
          </div>
        </SceneSection>

        {/* ── 3. THE HEART ───────────────────────────────────────────────── */}
        <SceneSection
          id="the-heart"
          label="The Heart"
          index={2}
          onEnter={handleSectionEnter}
          /*
           * FUTURE: Replace with <SplatScene sceneId="the-heart" />
           * Scene concept: living room into kitchen, natural light from south
           * windows, original fireplace, warm wood floors.
           */
          background="
            linear-gradient(148deg, #4A2E1A 0%, #2E1A0E 35%, #1A0E07 70%, #100B05 100%)
          "
          className="flex flex-col justify-center"
        >
          <div className="px-8 md:px-0 flex flex-col md:flex-row min-h-screen items-center">
            {/* Left — breathing room */}
            <div className="hidden md:block md:flex-1" />

            {/* Right — content */}
            <div className="md:w-1/2 lg:w-[42%] px-8 md:pr-16 lg:pr-24 py-16 flex flex-col gap-6">
              <SectionLabel index={2} label="The Heart" />
              <Rule />

              <motion.h2
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-serif font-light italic text-stone-50 leading-tight"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
              >
                Where Everything&nbsp;Gathers
              </motion.h2>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-sans font-light text-stone-300 leading-relaxed"
                style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)" }}
              >
                The living room and kitchen share a continuity that newer homes
                rarely achieve. Light that moves through the day. Ceiling height that
                breathes. A fireplace that anchors the room without dominating it.
              </motion.p>

              {/* Stat row */}
              <motion.div
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex gap-8 pt-2"
              >
                {[
                  { value: "1,847", label: "Sq Ft" },
                  { value: "1922",  label: "Est." },
                  { value: "0.44",  label: "Acres" },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="font-serif font-light text-stone-100 text-2xl leading-none">
                      {value}
                    </span>
                    <span className="text-[9px] tracking-[0.2em] uppercase font-sans text-stone-500">
                      {label}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </SceneSection>

        {/* ── 4. ACCOMMODATIONS ──────────────────────────────────────────── */}
        <SceneSection
          id="accommodations"
          label="Accommodations"
          index={3}
          onEnter={handleSectionEnter}
          textColor="dark"
          /*
           * FUTURE: Replace with <SplatScene sceneId="accommodations" />
           * Scene concept: primary bedroom, morning light through sheer curtains,
           * garden view from window.
           */
          background="
            linear-gradient(140deg, #DDD4C4 0%, #C8BAA8 40%, #B0A090 80%, #9A8C7C 100%)
          "
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="px-6 py-24 max-w-2xl mx-auto flex flex-col items-center gap-6">
            <SectionLabel index={3} label="Accommodations" light={false} />
            <Rule light={false} />

            <motion.h2
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewportOpts}
              transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-serif font-light italic text-stone-900 leading-tight"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
            >
              Three Rooms for Rest
            </motion.h2>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewportOpts}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="font-sans font-light text-stone-700 leading-relaxed max-w-md"
              style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)" }}
            >
              Each bedroom has its own quality of stillness. The primary overlooks
              the garden; morning arrives softly. The second holds the light
              differently. The third faces north, cool and quiet, best for sleep.
            </motion.p>

            {/* Bedroom indicators */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              whileInView="show"
              viewport={viewportOpts}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex items-center gap-5 mt-2"
            >
              {["Primary", "Second", "Third"].map((room, i) => (
                <div key={room} className="flex flex-col items-center gap-1.5">
                  <div className="w-px h-8 bg-stone-600/30" />
                  <span className="text-[9px] tracking-[0.2em] uppercase font-sans text-stone-600/60">
                    {room}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </SceneSection>

        {/* ── 5. SURROUNDINGS ────────────────────────────────────────────── */}
        <SceneSection
          id="surroundings"
          label="Surroundings"
          index={4}
          onEnter={handleSectionEnter}
          /*
           * FUTURE: Replace with <SplatScene sceneId="surroundings" />
           * Scene concept: backyard at golden hour, mature trees, screened
           * porch framing the view.
           */
          background="
            linear-gradient(165deg, #0E1A0C 0%, #1A2C16 35%, #243D1E 65%, #2E4E26 100%)
          "
          className="flex flex-col justify-center"
        >
          <div className="min-h-screen flex flex-col justify-end px-8 md:px-16 lg:px-24 py-16 md:py-24 max-w-xl">
            <div className="flex flex-col gap-5">
              <SectionLabel index={4} label="Surroundings" />
              <Rule />

              <motion.h2
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-serif font-light italic text-stone-50 leading-tight"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
              >
                The Land
              </motion.h2>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-sans font-light text-stone-300 leading-relaxed"
                style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)" }}
              >
                Nearly half an acre within the city — a generous thing. The backyard
                grows quieter the further you move through it. A screened porch
                that makes evenings longer than they have any right to be. Mature
                trees that have been here far longer than the house.
              </motion.p>

              <motion.div
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="flex gap-6 flex-wrap pt-1"
              >
                {["Screened Porch", "Mature Trees", "Off-Street Parking", "Garden Ready"].map(
                  (feature) => (
                    <span
                      key={feature}
                      className="text-[9px] tracking-[0.2em] uppercase font-sans text-stone-400/60 border-b border-stone-600/30 pb-0.5"
                    >
                      {feature}
                    </span>
                  )
                )}
              </motion.div>
            </div>
          </div>
        </SceneSection>

        {/* ── 6. NEIGHBORHOOD ────────────────────────────────────────────── */}
        <SceneSection
          id="neighborhood"
          label="Neighborhood"
          index={5}
          onEnter={handleSectionEnter}
          /*
           * FUTURE: Replace with <SplatScene sceneId="neighborhood" />
           * Scene concept: Tennessee Ave looking south toward Lookout Mountain
           * at dusk, warm streetlights just coming on.
           */
          background="
            linear-gradient(150deg, #0C1220 0%, #141E30 30%, #1C2C44 60%, #223452 100%)
          "
          className="flex flex-col justify-center"
        >
          <div className="min-h-screen flex flex-col md:flex-row items-center px-8 md:px-0">
            {/* Left: large heading */}
            <div className="md:w-1/2 px-8 md:pl-16 lg:pl-24 py-16 flex flex-col gap-5">
              <SectionLabel index={5} label="Neighborhood" />
              <Rule />

              <motion.h2
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-serif font-light italic text-stone-50 leading-none"
                style={{ fontSize: "clamp(3.5rem, 8vw, 6.5rem)" }}
              >
                St. Elmo
              </motion.h2>

              <motion.p
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-[10px] tracking-[0.2em] uppercase font-sans text-stone-400/60 max-w-xs"
              >
                Chattanooga's oldest neighborhood
              </motion.p>
            </div>

            {/* Right: descriptive text */}
            <div className="md:w-1/2 px-8 md:pr-16 lg:pr-24 pb-16 md:pb-0 flex flex-col gap-5 justify-center">
              <motion.p
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-sans font-light text-stone-300 leading-relaxed"
                style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)" }}
              >
                Walkable to the canyon, the market, the coffee shop on Tennessee
                Avenue. Lookout Mountain rises at the end of every south-facing
                street — a presence rather than a backdrop.
              </motion.p>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, delay: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="font-sans font-light text-stone-400 leading-relaxed"
                style={{ fontSize: "clamp(0.9rem, 1.6vw, 1rem)" }}
              >
                The neighborhood has the quality of somewhere that was always
                going to be good — settled, human, unhurried. People here know
                their neighbors. The streets are canopied. The sidewalks have cracks.
              </motion.p>

              <motion.div
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex gap-6 flex-wrap pt-1"
              >
                {[
                  "Bluff Trail · 0.4 mi",
                  "St. Elmo Market · 0.2 mi",
                  "Incline Railway · 0.6 mi",
                ].map((place) => (
                  <span
                    key={place}
                    className="text-[9px] tracking-[0.18em] uppercase font-sans text-stone-500"
                  >
                    {place}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </SceneSection>

        {/* ── 7. DETAILS ─────────────────────────────────────────────────── */}
        <SceneSection
          id="details"
          label="Details"
          index={6}
          onEnter={handleSectionEnter}
          /*
           * FUTURE: Replace with <SplatScene sceneId="details" />
           * Scene concept: interior looking out through a south window,
           * intimate framing, depth of field.
           */
          background="
            radial-gradient(ellipse at 30% 70%, #1C1208 0%, #0D0B09 60%, #080705 100%)
          "
          staticBackground
          className="flex flex-col justify-center"
        >
          <div className="min-h-screen flex flex-col lg:flex-row px-8 md:px-16 lg:px-0 py-24 gap-16 lg:gap-0">

            {/* Left — property particulars */}
            <div className="lg:w-1/2 lg:pl-16 xl:pl-24 flex flex-col justify-center gap-8">
              <div className="flex flex-col gap-5">
                <SectionLabel index={6} label="Details" />
                <Rule />

                <motion.h2
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={viewportOpts}
                  transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
                  className="font-serif font-light italic text-stone-50 leading-tight"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
                >
                  The Particulars
                </motion.h2>
              </div>

              {/* Specs grid */}
              <motion.dl
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="grid grid-cols-2 gap-x-8 gap-y-6"
              >
                {[
                  { label: "Address",   value: "4216 Seneca Ave" },
                  { label: "City",      value: "Chattanooga, TN 37409" },
                  { label: "Beds",      value: "3" },
                  { label: "Baths",     value: "2" },
                  { label: "Sq Ft",     value: "1,847" },
                  { label: "Lot",       value: "0.44 Acres" },
                  { label: "Year",      value: "1922" },
                  { label: "Style",     value: "Arts & Crafts Bungalow" },
                  { label: "Garage",    value: "Detached, 1-car" },
                  { label: "Zoning",    value: "R-1" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-[9px] tracking-[0.22em] uppercase font-sans font-light text-stone-500">
                      {label}
                    </dt>
                    <dd className="font-sans font-light text-stone-200 text-sm leading-snug">
                      {value}
                    </dd>
                  </div>
                ))}
              </motion.dl>

              <motion.p
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-[10px] tracking-[0.18em] uppercase font-sans text-stone-600"
              >
                Listed by&nbsp; [Agent Name] &nbsp;·&nbsp; [Brokerage]
                {/* TODO: fill in listing agent and brokerage */}
              </motion.p>
            </div>

            {/* Right — inquiry form */}
            <div className="lg:w-1/2 lg:pr-16 xl:pr-24 flex flex-col justify-center gap-7">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex flex-col gap-2"
              >
                <h3 className="font-serif font-light italic text-stone-100 text-2xl md:text-3xl">
                  Ask a question
                </h3>
                <p className="font-sans font-light text-stone-400 text-sm leading-relaxed">
                  We respond quickly. No pressure, no pipeline.
                </p>
              </motion.div>

              {/*
               * TODO: Wire form submission to your preferred handler —
               * e.g. a Next.js Server Action, Formspree, or Resend.
               */}
              <motion.form
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOpts}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col gap-5"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField id="name"  label="Name"         type="text"  placeholder="Your name" />
                  <FormField id="phone" label="Phone / Email" type="text"  placeholder="Best way to reach you" />
                </div>
                <FormField id="message" label="Message" type="textarea" placeholder="What would you like to know?" />

                <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-3 rounded-full border border-amber-warm/50 px-8 py-3 font-sans font-light text-sm tracking-[0.12em] text-stone-200 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80 hover:text-stone-50"
                  >
                    Send Message
                  </button>

                  <a
                    href="sms:+14235550100" /* TODO: replace with agent number */
                    className="inline-flex items-center gap-2 font-sans font-light text-xs tracking-[0.15em] uppercase text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    <span>or text directly</span>
                    <span className="text-amber-warm/60">→</span>
                  </a>
                </div>
              </motion.form>
            </div>
          </div>

          {/* Footer strip */}
          <motion.footer
            variants={fadeIn}
            initial="hidden"
            whileInView="show"
            viewport={viewportOpts}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative z-10 border-t border-stone-800/60 px-8 md:px-16 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <p className="font-serif font-light italic text-stone-500 text-sm">
              4216 Seneca Ave · Chattanooga, TN 37409
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase font-sans text-stone-600">
              © {new Date().getFullYear()} · All rights reserved
            </p>
          </motion.footer>
        </SceneSection>

      </main>
    </>
  );
}

// ─── Form field helper ───────────────────────────────────────────────────────

function FormField({
  id,
  label,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  type: "text" | "email" | "textarea";
  placeholder: string;
}) {
  const baseClass =
    "w-full bg-transparent border-b border-stone-700/60 pb-2 font-sans font-light text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-warm/50 transition-colors duration-300";

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[9px] tracking-[0.22em] uppercase font-sans text-stone-500"
      >
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          id={id}
          name={id}
          placeholder={placeholder}
          rows={3}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </div>
  );
}
