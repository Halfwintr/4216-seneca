"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
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
    "w-full bg-transparent border-b border-stone-700/40 py-2 font-sans font-light text-sm text-stone-200 placeholder:text-stone-600/70 focus:outline-none focus:border-amber-warm/50 transition-colors duration-300";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[8px] tracking-[0.24em] uppercase font-sans font-light text-stone-500">
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

// ─── Property essentials row ──────────────────────────────────────────────────

const ESSENTIALS = [
  { label: "Bed", value: "2" },
  { label: "Bath", value: "2" },
  { label: "Sq Ft", value: "~1,400" },
  { label: "Built", value: "1920" },
  { label: "Area", value: "St. Elmo" },
];

// ─── ContactDrawer ────────────────────────────────────────────────────────────

export function ContactDrawer({ isOpen, onClose }: ContactDrawerProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Track breakpoint for animation direction
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while open; restore scroll position on close
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Animation: slide from right on desktop, slide from bottom on mobile
  const initial  = isDesktop ? { x: "100%", y: 0 }   : { x: 0, y: "100%" };
  const animate  = { x: 0, y: 0 };
  const exit     = isDesktop ? { x: "100%", y: 0 }   : { x: 0, y: "100%" };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ───────────────────────────────────────────────── */}
          <motion.div
            key="drawer-backdrop"
            className="fixed inset-0 z-50"
            style={{ background: "rgba(6,4,2,0.55)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={onClose}
            aria-hidden
          />

          {/* ── Drawer panel ───────────────────────────────────────────── */}
          <motion.div
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Contact the homeowner"
            className={[
              // Shared
              "fixed z-50 flex flex-col overflow-hidden",
              // Mobile: bottom sheet
              "bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl",
              // Desktop: right panel
              "sm:top-0 sm:right-0 sm:bottom-auto sm:left-auto sm:h-full sm:w-[400px] sm:max-h-none sm:rounded-none sm:rounded-l-2xl",
            ].join(" ")}
            style={{
              background:
                "linear-gradient(160deg, rgba(22,17,12,0.97) 0%, rgba(13,11,9,0.96) 60%, rgba(18,14,10,0.97) 100%)",
              backdropFilter: "blur(24px) saturate(1.2)",
              WebkitBackdropFilter: "blur(24px) saturate(1.2)",
              borderLeft: "1px solid rgba(196,149,106,0.08)",
              borderTop: "1px solid rgba(196,149,106,0.08)",
            }}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={{ duration: 0.44, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-8 h-0.5 rounded-full bg-stone-700/60" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 sm:top-6 sm:right-5 z-10 flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-200 text-stone-500 hover:text-stone-200"
            >
              <X size={14} />
            </button>

            {/* ── Scrollable content ──────────────────────────────────── */}
            <div
              ref={contentRef}
              data-lenis-prevent
              className="flex-1 overflow-y-auto overscroll-contain px-8 sm:px-9 pt-8 pb-10 sm:pt-12"
            >

              {/* Seal */}
              <div className="flex justify-center mb-8">
                <div style={{ transform: "rotate(-1.5deg)" }}>
                  <Image
                    src="/images/ui/seal@2x.webp"
                    alt="4216 Seneca"
                    width={64}
                    height={64}
                    className="opacity-50"
                    style={{ filter: "sepia(0.45) brightness(0.70)" }}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="text-center mb-8">
                <p
                  className="font-serif font-light italic text-stone-100 leading-tight mb-1"
                  style={{ fontSize: "clamp(1.5rem, 4vw, 1.85rem)" }}
                >
                  4216 Seneca Ave
                </p>
                <p className="text-[9px] tracking-[0.26em] uppercase font-sans font-light text-stone-500">
                  St. Elmo · Chattanooga, TN 37409
                </p>
              </div>

              {/* Property essentials */}
              <div
                className="grid grid-cols-5 gap-2 mb-9 pb-8"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {ESSENTIALS.map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <span className="font-serif font-light italic text-stone-200 text-lg leading-none">
                      {value}
                    </span>
                    <span className="text-[7px] tracking-[0.18em] uppercase font-sans font-light text-stone-600">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Inquiry form */}
              <div className="flex flex-col gap-2 mb-6">
                <p
                  className="font-serif font-light italic text-stone-300 text-lg leading-snug mb-4"
                >
                  Ask a question
                </p>

                {/* TODO: wire onSubmit to a server action, Resend, or Formspree */}
                <form
                  className="flex flex-col gap-5"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field id="drawer-name"  label="Name"          type="text"     placeholder="Your name" />
                    <Field id="drawer-phone" label="Phone / Email"  type="text"     placeholder="Best way to reach you" />
                  </div>
                  <Field id="drawer-message" label="Message" type="textarea" placeholder="What would you like to know?" />

                  <button
                    type="submit"
                    className="self-start inline-flex items-center gap-3 rounded-full border border-amber-warm/30 px-7 py-2.5 font-sans font-light text-xs tracking-[0.14em] text-stone-300 transition-all duration-300 hover:bg-amber-warm/8 hover:border-amber-warm/60 hover:text-stone-100"
                  >
                    Send message
                  </button>
                </form>
              </div>

              {/* Divider */}
              <div
                className="my-8"
                style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
              />

              {/* View full listing CTA */}
              <a
                href="https://beycome.com/" /* TODO: replace with actual MLS/Beycome URL */
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between group mb-8 py-3 transition-opacity duration-200 hover:opacity-75"
              >
                <span className="font-sans font-light text-xs tracking-[0.18em] uppercase text-stone-400 group-hover:text-stone-200 transition-colors duration-200">
                  View Full Listing
                </span>
                <ExternalLink size={12} className="text-stone-600 group-hover:text-amber-warm/70 transition-colors duration-200" />
              </a>

              {/* Contact info */}
              <div className="flex flex-col gap-2">
                <p className="text-[8px] tracking-[0.22em] uppercase font-sans font-light text-stone-600">
                  Direct contact
                </p>
                <a
                  href="sms:+14235550100" /* TODO: replace with actual number */
                  className="font-sans font-light text-sm text-stone-400 hover:text-stone-200 transition-colors duration-200"
                >
                  (423) 555-0100
                </a>
                <p className="text-[8px] tracking-[0.18em] uppercase font-sans font-light text-stone-700 mt-1">
                  {/* TODO: fill in listing agent and brokerage before launch */}
                  [Agent Name] · [Brokerage]
                </p>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
