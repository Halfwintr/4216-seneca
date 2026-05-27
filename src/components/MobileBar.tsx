"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ExternalLink, MessageSquare } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MobileBarProps {
  /** Label of the chapter currently occupying the viewport */
  activeLabel: string;
  onContactClick: () => void;
}

// ─── MobileBar ────────────────────────────────────────────────────────────────
//
// Floating bottom control bar for mobile viewports. Hides on md+ screens
// (the desktop NavRail takes over).
//
// Layout: [seal] [current chapter] [view] [contact]
//
// Cinematic glass treatment: warm-tinted frosted surface sitting just above
// the thumb zone. Appears on load with a soft upward fade.

export function MobileBar({ activeLabel, onContactClick }: MobileBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      // Hide on md+; NavRail handles larger breakpoints
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        // Leave breathing room for iOS home indicator
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="mx-3 mb-3 rounded-2xl flex items-center gap-3 px-4"
        style={{
          height: "52px",
          background:
            "linear-gradient(135deg, rgba(22,17,12,0.88) 0%, rgba(13,11,9,0.90) 100%)",
          backdropFilter: "blur(18px) saturate(1.1)",
          WebkitBackdropFilter: "blur(18px) saturate(1.1)",
          border: "1px solid rgba(196,149,106,0.09)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.03) inset",
        }}
      >
        {/* Mini seal */}
        <button
          aria-label="Back to top"
          onClick={() => {
            const el = document.getElementById("arrival");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="shrink-0"
          style={{ transform: "rotate(-1.8deg)" }}
        >
          <Image
            src="/images/ui/seal@2x.webp"
            alt="4216 Seneca"
            width={28}
            height={28}
            style={{
              opacity: 0.75,
              filter: "sepia(0.25) brightness(0.88) contrast(1.05)",
            }}
          />
        </button>

        {/* Divider */}
        <div
          aria-hidden
          className="shrink-0 self-stretch my-3"
          style={{ width: "1px", background: "rgba(196,149,106,0.18)" }}
        />

        {/* Current chapter label — animates on chapter change */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={activeLabel}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="block font-sans font-light text-stone-300 truncate"
              style={{ fontSize: "10px", letterSpacing: "0.20em", textTransform: "uppercase" }}
            >
              {activeLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div
          aria-hidden
          className="shrink-0 self-stretch my-3"
          style={{ width: "1px", background: "rgba(196,149,106,0.18)" }}
        />

        {/* View full listing */}
        <a
          href="https://beycome.com/" /* TODO: replace with actual MLS/Beycome URL */
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View full listing"
          className="shrink-0 flex flex-col items-center gap-1 px-2 py-1 group"
        >
          <ExternalLink
            size={15}
            strokeWidth={1.5}
            style={{ color: "rgba(168,148,133,0.90)" }}
            className="group-active:text-amber-warm transition-colors"
          />
          <span
            className="font-sans font-light text-stone-500"
            style={{ fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase" }}
          >
            View
          </span>
        </a>

        {/* Contact */}
        <button
          onClick={onContactClick}
          aria-label="Contact homeowner"
          className="shrink-0 flex flex-col items-center gap-1 px-2 py-1 group"
        >
          <MessageSquare
            size={15}
            strokeWidth={1.5}
            style={{ color: "rgba(168,148,133,0.90)" }}
            className="group-active:text-amber-warm transition-colors"
          />
          <span
            className="font-sans font-light text-stone-500"
            style={{ fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase" }}
          >
            Ask
          </span>
        </button>
      </div>
    </motion.div>
  );
}
