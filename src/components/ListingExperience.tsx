"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChapterScene } from "./ChapterScene";
import { NavRail } from "./NavRail";
import { MobileNav } from "./MobileNav";
import { DetailTray } from "./DetailTray";
import { DetailsSection } from "./DetailsSection";
import { useLenis } from "./LenisProvider";
import type { Listing } from "@/lib/types";

export function ListingExperience({ listing }: { listing: Listing }) {
  const lenis = useLenis();
  const [activeId, setActiveId] = useState<string>(
    listing.scenes[0]?.key ?? "details",
  );
  const [navigating, setNavigating] = useState(false);
  const veilTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSceneEnter = useCallback((key: string) => {
    setActiveId(key);
  }, []);

  // Instantly load + jump to a section from the menu (no long smooth scroll).
  // A brief veil masks the jump while the target section's poster reveals.
  const handleNavigate = useCallback(
    (key: string) => {
      setActiveId(key);
      setNavigating(true);
      // Jump on the next frame, after the target section has mounted. Land a
      // little INTO the chapter (past its intro fade-in) so the first frame is
      // fully visible — landing at the exact top would show opacity 0 (blank).
      requestAnimationFrame(() => {
        const el = document.getElementById(key);
        if (!el) return;
        const intro =
          key === "details" ? 0 : Math.round(window.innerHeight * 0.3);
        const target = el.offsetTop + intro;
        if (lenis) lenis.scrollTo(target, { immediate: true });
        else window.scrollTo(0, target);
      });
      if (veilTimer.current) clearTimeout(veilTimer.current);
      veilTimer.current = setTimeout(() => setNavigating(false), 400);
    },
    [lenis],
  );

  useEffect(
    () => () => {
      if (veilTimer.current) clearTimeout(veilTimer.current);
    },
    [],
  );

  // Mark the details section active when it scrolls into view.
  useEffect(() => {
    const el = document.getElementById("details");
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId("details");
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeIndex = listing.scenes.findIndex((s) => s.key === activeId);
  const activeScene = activeIndex >= 0 ? listing.scenes[activeIndex] : undefined;
  // The details section sits after the last scene in the loading window.
  const activePos = activeId === "details" ? listing.scenes.length : activeIndex;

  return (
    <>
      <NavRail listing={listing} activeId={activeId} onNavigate={handleNavigate} />
      <MobileNav listing={listing} activeId={activeId} onNavigate={handleNavigate} />

      <main>
        {listing.scenes.map((scene, i) => (
          <ChapterScene
            key={scene.id}
            scene={scene}
            sceneIndex={i}
            onEnter={handleSceneEnter}
            // Only the active section (+/- 1 for smooth reveal / scroll-back)
            // mounts its layers and decodes frames.
            inWindow={Math.abs(i - activePos) <= 1}
          />
        ))}

        <DetailsSection listing={listing} />
      </main>

      {/* Filmstrip over the scenes; hides on the details section. */}
      <DetailTray scene={activeScene} sceneNumber={activeIndex >= 0 ? activeIndex + 1 : 1} />

      {/* Crossfade veil over the scene area (below the nav + filmstrip). Covers
          the instant jump, then fades out once the new section is shown. */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-30 bg-[#111111] ${
          navigating
            ? "opacity-100"
            : "opacity-0 transition-opacity duration-500 ease-out"
        }`}
      />
    </>
  );
}
