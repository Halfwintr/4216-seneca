"use client";

import { useState } from "react";
import { useScroll, useTransform, useMotionValueEvent } from "framer-motion";

/**
 * Drives the "Scroll" cue indicators. Before the user scrolls, the bright
 * segment runs its idle CSS loop (encouraging a first scroll). Once scrolling
 * begins, the segment position follows the page's scroll progress, turning the
 * cue into a live scroll-position indicator. Returns to idle at the very top.
 *
 * @param segmentFraction the segment's height as a fraction of the line, so the
 *   segment travels its full length without overflowing (top maps 0 → 1-frac).
 */
export function useScrollCue(segmentFraction = 1 / 3) {
  const { scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setScrolled(v > 0.002);
  });

  const maxTopPct = (1 - segmentFraction) * 100;
  const segmentTop = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", `${maxTopPct}%`],
  );

  return { scrolled, segmentTop };
}
