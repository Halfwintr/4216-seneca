"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLenis } from "./LenisProvider";

interface NavSection {
  id: string;
  label: string;
}

interface SceneNavProps {
  sections: NavSection[];
  activeIndex: number;
}

export function SceneNav({ sections, activeIndex }: SceneNavProps) {
  const lenis = useLenis();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;

    if (lenis) {
      lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 3) });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <nav
      aria-label="Section navigation"
      className="fixed right-6 md:right-8 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-4 items-end"
    >
      {sections.map((section, i) => {
        const isActive = i === activeIndex;
        const isHovered = i === hoveredIndex;

        return (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            aria-label={`Navigate to ${section.label}`}
            aria-current={isActive ? "true" : undefined}
            className="group flex items-center gap-3 cursor-pointer"
          >
            {/* Label */}
            <AnimatePresence>
              {isHovered && (
                <motion.span
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-[10px] tracking-[0.2em] uppercase font-sans font-light text-stone-300 select-none"
                >
                  {section.label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Dot */}
            <motion.div
              animate={{
                width: isActive ? 20 : 6,
                opacity: isActive ? 1 : isHovered ? 0.7 : 0.35,
                backgroundColor: isActive ? "#C4956A" : "#F2EDE6",
              }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-px rounded-full"
              style={{ width: isActive ? 20 : 6 }}
            />
          </button>
        );
      })}
    </nav>
  );
}
