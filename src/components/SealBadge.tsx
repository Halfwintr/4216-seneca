"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// ─── SealBadge ────────────────────────────────────────────────────────────────
//
// A large editorial stamp fixed to the top-center of the viewport.
// Treated as atmosphere rather than UI — decorative, non-interactive,
// intentionally tilted to feel hand-placed rather than screen-rendered.
// Sits above scene content (z-40) but carries low opacity and pointer-events-none
// so it never interferes with reading or interaction.

export function SealBadge() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
      aria-hidden
      className="fixed top-6 left-6 sm:left-10 md:left-14 lg:left-20 z-40 pointer-events-none"
    >
      <div style={{ transform: "rotate(-6deg)", transformOrigin: "center top" }}>
        {/* Responsive size: 100px mobile → 120px desktop, natural aspect ratio */}
        <div className="w-[100px] md:w-[120px]">
          <Image
            src="/images/ui/seal@2x.webp"
            alt=""
            width={240}
            height={240}
            priority
            style={{
              width: "100%",
              height: "auto",
              opacity: 0.5,
              filter: "sepia(0.25) brightness(0.90) contrast(1.05)",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
