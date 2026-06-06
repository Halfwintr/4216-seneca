"use client";

import { useEffect, useState } from "react";
import { useLenis } from "./LenisProvider";

export interface EditorSection {
  id: string;
  label: string;
}

interface EditorSectionNavProps {
  sections: EditorSection[];
}

/**
 * Sticky jump-nav for the listing editor. Smooth-scrolls to each section via
 * Lenis and highlights the section currently in view.
 */
export function EditorSectionNav({ sections }: EditorSectionNavProps) {
  const lenis = useLenis();
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    if (lenis) {
      lenis.scrollTo(el, { offset: -96, duration: 1.0 });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      // Activate a section once its top crosses ~110px from the viewport top.
      { rootMargin: "-110px 0px -65% 0px", threshold: 0 },
    );

    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Editor sections"
      className="sticky top-16 z-30 -mx-6 border-b border-stone-800/60 bg-stone-950/85 px-6 py-3 backdrop-blur-sm"
    >
      <ul className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <button
                onClick={() => scrollTo(section.id)}
                aria-current={active ? "true" : undefined}
                className={`rounded-full border px-4 py-1.5 font-sans font-light text-xs tracking-[0.1em] transition-colors ${
                  active
                    ? "border-amber-warm/60 bg-amber-warm/10 text-stone-100"
                    : "border-stone-800 text-stone-400 hover:border-stone-600 hover:text-stone-200"
                }`}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
