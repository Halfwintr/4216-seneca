"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

/**
 * Persistent "Text About the Home" CTA.
 * Update the href with the actual listing agent's phone number before launch.
 */
export function CTAButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50"
    >
      <a
        href="sms:+14235550100" /* TODO: replace with listing agent's number */
        aria-label="Text us about the home"
        className="group flex items-center gap-2.5 rounded-full border border-amber-warm/40 bg-stone-950/80 backdrop-blur-sm px-5 py-3 text-stone-200 transition-all duration-300 hover:bg-stone-900/90 hover:border-amber-warm/70 hover:text-stone-50"
      >
        <MessageCircle
          size={14}
          strokeWidth={1.5}
          className="text-amber-warm transition-transform duration-300 group-hover:scale-110"
        />
        <span className="text-xs tracking-[0.15em] uppercase font-sans font-light">
          Text About the Home
        </span>
      </a>
    </motion.div>
  );
}
