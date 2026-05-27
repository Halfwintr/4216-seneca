"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChapterScene } from "./ChapterScene";
import { ProgressIndicator } from "./ProgressIndicator";
import { NavRail } from "./NavRail";
import { MobileBar } from "./MobileBar";
import { ContactDrawer } from "./ContactDrawer";
import { SealBadge } from "./SealBadge";
import { chapters } from "./chapters";

// ─── Nav items (chapters + the details anchor) ───────────────────────────────

const NAV_ITEMS = [
  ...chapters.map((ch) => ({ id: ch.id, label: ch.label })),
  { id: "details", label: "Details" },
];

// ─── Shared animation presets ────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
};

const vp = { once: true, margin: "-60px" } as const;

// ─── Details section sub-components ─────────────────────────────────────────

function Rule() {
  return (
    <motion.div
      variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
      initial="hidden"
      whileInView="show"
      viewport={vp}
      transition={{ duration: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
      className="h-px w-10 bg-amber-warm/50 origin-left"
    />
  );
}

function FormField({
  id,
  label,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  type: "text" | "textarea";
  placeholder: string;
}) {
  const base =
    "w-full bg-transparent border-b border-stone-700/50 pb-2 font-sans font-light text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-warm/50 transition-colors duration-300";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[9px] tracking-[0.22em] uppercase font-sans text-stone-500">
        {label}
      </label>
      {type === "textarea" ? (
        <textarea id={id} name={id} placeholder={placeholder} rows={3} className={`${base} resize-none`} />
      ) : (
        <input id={id} name={id} type="text" placeholder={placeholder} className={base} />
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function HomeClient() {
  const [activeId, setActiveId]         = useState<string>(chapters[0].id);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const detailsRef = useRef<HTMLElement>(null);

  const handleChapterEnter = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const openDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Detect when the Details section is the active view
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId("details");
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeNavIndex  = NAV_ITEMS.findIndex((n) => n.id === activeId);
  const activeNavLabel  = NAV_ITEMS[activeNavIndex]?.label ?? NAV_ITEMS[0].label;

  return (
    <>
      <ProgressIndicator />

      {/* Property seal — top-center fixed, purely atmospheric */}
      <SealBadge />

      {/* Desktop: left-side editorial nav rail */}
      <NavRail
        sections={NAV_ITEMS}
        activeIndex={activeNavIndex}
        onContactClick={openDrawer}
      />

      {/* Mobile: floating bottom control bar */}
      <MobileBar
        activeLabel={activeNavLabel}
        onContactClick={openDrawer}
      />

      {/* Cinematic contact/inquiry drawer (shared mobile + desktop) */}
      <ContactDrawer isOpen={drawerOpen} onClose={closeDrawer} />

      <main>
        {/* ── CINEMATIC CHAPTERS (01–06) ─────────────────────────────────── */}
        {chapters.map((chapter, i) => (
          <ChapterScene
            key={chapter.id}
            chapter={chapter}
            chapterIndex={i}
            onEnter={handleChapterEnter}
          />
        ))}

        {/* ── 07 DETAILS ─────────────────────────────────────────────────── */}
        {/*
         * Intentionally typographic — no background image.
         * If desired, a single ambient <SplatScene sceneId="details" />
         * at very low opacity would work here as an atmospheric depth layer.
         */}
        <section
          ref={detailsRef}
          id="details"
          aria-label="Details"
          className="relative min-h-screen overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 30% 70%, #1C1208 0%, #0D0B09 60%, #080705 100%)",
          }}
        >
          {/* Vignette */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 25%, rgba(0,0,0,0.45) 100%)",
            }}
          />

          {/* ── Details title card ─────────────────────────────────────────── */}
          <div className="relative z-10 flex items-end px-8 md:px-16 lg:px-24 pb-20 pt-32 lg:pt-40">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={vp}
              transition={{ duration: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col gap-5 max-w-xl"
            >
              <p className="text-[10px] tracking-[0.30em] uppercase font-sans font-light text-stone-300/60">
                07&thinsp;/&thinsp;Details
              </p>
              <h2
                className="font-serif font-light italic text-stone-50 leading-none"
                style={{ fontSize: "clamp(3rem, 7.5vw, 5.75rem)" }}
              >
                The particulars
              </h2>
              <p
                className="font-sans font-light text-stone-200/75 leading-relaxed"
                style={{ fontSize: "clamp(0.9rem, 1.7vw, 1.05rem)" }}
              >
                The practical information, without losing the story.
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row px-8 md:px-16 lg:px-0 pb-24 gap-16 lg:gap-0">

            {/* Left — property particulars */}
            <div className="lg:w-1/2 lg:pl-16 xl:pl-24 flex flex-col justify-center gap-8">
              <div className="flex flex-col gap-5">
                <Rule />
              </div>

              <motion.dl
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={vp}
                transition={{ duration: 0.8, delay: 0.15 }}
                className="grid grid-cols-2 gap-x-8 gap-y-6"
              >
                {[
                  { label: "Address",      value: "4216 Seneca Ave"                        },
                  { label: "City",         value: "Chattanooga, TN 37409"                  },
                  { label: "Beds",         value: "2"                                       },
                  { label: "Baths",        value: "2"                                       },
                  { label: "Sq Ft",        value: "~1,400"                                  },
                  { label: "Year Built",   value: "1920"                                    },
                  { label: "Ceilings",     value: "10 ft in main living areas"             },
                  { label: "Basement",     value: "Encapsulated, moisture-controlled"       },
                  { label: "Garage",       value: "Power door + storage"                    },
                  { label: "Porch",        value: "Full-width covered front porch"          },
                  { label: "Yard",         value: "Fully fenced property"                   },
                  { label: "Location",     value: "Walkable St. Elmo"                       },
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
                viewport={vp}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-[10px] tracking-[0.18em] uppercase font-sans text-stone-600"
              >
                {/* TODO: fill in listing agent and brokerage before launch */}
                Listed by [Agent Name] · [Brokerage]
              </motion.p>
            </div>

            {/* Right — inquiry form */}
            <div className="lg:w-1/2 lg:pr-16 xl:pr-24 flex flex-col justify-center gap-7">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={vp}
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

              {/* TODO: wire onSubmit to a server action, Resend, or Formspree */}
              <motion.form
                variants={fadeIn}
                initial="hidden"
                whileInView="show"
                viewport={vp}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col gap-5"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField id="name"  label="Name"          type="text"     placeholder="Your name" />
                  <FormField id="phone" label="Phone / Email"  type="text"     placeholder="Best way to reach you" />
                </div>
                <FormField id="message" label="Message" type="textarea" placeholder="What would you like to know?" />

                <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-3 rounded-full border border-amber-warm/50 px-8 py-3 font-sans font-light text-sm tracking-[0.12em] text-stone-200 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80"
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

          {/* Footer */}
          <motion.footer
            variants={fadeIn}
            initial="hidden"
            whileInView="show"
            viewport={vp}
            transition={{ duration: 0.6 }}
            className="relative z-10 border-t border-stone-800/50 px-8 md:px-16 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <p className="font-serif font-light italic text-stone-500 text-sm">
              4216 Seneca Ave · Chattanooga, TN 37409
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase font-sans text-stone-600">
              © {new Date().getFullYear()} · All rights reserved
            </p>
          </motion.footer>
        </section>
      </main>
    </>
  );
}
