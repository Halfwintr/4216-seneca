"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, MessageSquare } from "lucide-react";
import { useLenis } from "./LenisProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavSection {
  id: string;
  label: string;
}

export interface NavRailProps {
  sections: NavSection[];
  activeIndex: number;
  onContactClick: () => void;
}

// ─── NavRail ─────────────────────────────────────────────────────────────────
//
// A persistent left-side vertical rail: property seal at top, chapter
// navigation in the middle, listing/contact CTAs at the bottom.
//
// Design intent: feels like a printed historic placard or embossed mark affixed
// to the left edge — not a software sidebar. Low contrast, warm monochrome,
// tactile imperfection (seal has a slight rotation).
//
// Only rendered on md+ screens. The MobileBar handles smaller viewports.

export function NavRail({ sections, activeIndex, onContactClick }: NavRailProps) {
  const lenis = useLenis();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) {
      lenis.scrollTo(el, { duration: 1.6, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <nav
      aria-label="Chapter navigation"
      className="hidden md:flex fixed left-0 top-0 z-40 h-full flex-col items-center"
      style={{
        width: "64px",
        background: "linear-gradient(to right, rgba(6,4,2,0.30) 0%, rgba(6,4,2,0.10) 100%)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRight: "1px solid rgba(196,149,106,0.10)",
      }}
    >

      {/* ── Seal ─────────────────────────────────────────────────────────── */}
      {/*
       * The seal is treated like a historic placard or embossed mark:
       * slightly imperfect rotation, warm/sepia filter, reduced opacity.
       * The small imprecision signals handmade rather than digital.
       */}
      {/* Top spacer — keeps dots vertically centred in the rail */}
      <div className="shrink-0 pt-8" />

      {/* ── Chapter navigation ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
        {sections.map((section, i) => {
          const isActive  = i === activeIndex;
          const isHovered = i === hoveredIdx;

          return (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              aria-label={`Go to ${section.label}`}
              aria-current={isActive ? "location" : undefined}
              // Full-width so the hover label (absolute, left: 100%) is
              // anchored to the right edge of the rail, not the dot.
              className="relative w-full flex flex-col items-center py-2.5 cursor-pointer"
            >
              {/* Active: warm horizontal dash. Inactive: small circle. */}
              <motion.div
                className="rounded-full"
                animate={{
                  width:           isActive ? 20  : 4,
                  height:          isActive ? 1.5 : 4,
                  backgroundColor: isActive ? "#C4956A" : (isHovered ? "#8A7869" : "#6E5E52"),
                  opacity:         isActive ? 0.90 : (isHovered ? 0.70 : 0.45),
                }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              />

              {/* Chapter index number */}
              <span
                className="mt-1.5 font-sans font-light transition-colors duration-300"
                style={{
                  fontSize: "8px",
                  letterSpacing: "0.16em",
                  color: isActive ? "rgba(203,191,176,0.90)" : (isHovered ? "rgba(168,148,133,0.80)" : "rgba(110,94,82,0.70)"),
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Hover label — slides out to the right of the rail */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-4 pointer-events-none z-50"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <span
                      className="whitespace-nowrap font-sans font-light text-stone-300"
                      style={{ fontSize: "10px", letterSpacing: "0.20em", textTransform: "uppercase" }}
                    >
                      {section.label}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      {/* Hairline rule above CTAs */}
      <div
        aria-hidden
        className="w-5 shrink-0 mt-4"
        style={{ height: "1px", background: "rgba(196,149,106,0.18)" }}
      />

      {/* ── CTAs ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5 py-6 shrink-0">

        {/* View Full Listing */}
        <a
          href="https://beycome.com/" /* TODO: replace with actual MLS/Beycome URL */
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View full listing"
          className="group flex flex-col items-center gap-1.5"
        >
          <ExternalLink
            size={14}
            strokeWidth={1.5}
            style={{ color: "rgba(168,148,133,0.85)" }}
            className="group-hover:text-amber-warm transition-colors duration-300"
          />
          <span
            className="font-sans font-light text-stone-500 group-hover:text-stone-300 transition-colors duration-300"
            style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase" }}
          >
            View
          </span>
        </a>

        {/* Contact homeowner */}
        <button
          onClick={onContactClick}
          aria-label="Contact homeowner"
          className="group flex flex-col items-center gap-1.5"
        >
          <MessageSquare
            size={14}
            strokeWidth={1.5}
            style={{ color: "rgba(168,148,133,0.85)" }}
            className="group-hover:text-amber-warm transition-colors duration-300"
          />
          <span
            className="font-sans font-light text-stone-500 group-hover:text-stone-300 transition-colors duration-300"
            style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase" }}
          >
            Ask
          </span>
        </button>
      </div>

    </nav>
  );
}
