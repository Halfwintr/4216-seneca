"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ProgressIndicator() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-50 h-px origin-left"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, rgba(196,149,106,0.6) 0%, rgba(212,168,122,0.9) 50%, rgba(196,149,106,0.6) 100%)",
      }}
    />
  );
}
