"use client";

import type { WheelEvent } from "react";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Lightbox, type LightboxImage } from "./Lightbox";
import { isCarouselShot, type Scene } from "@/lib/types";
import { useScrollCue } from "./useScrollCue";

interface DetailTrayProps {
  /** The currently active scene, whose images populate the filmstrip. */
  scene: Scene | undefined;
  /** 1-based index of the active scene, shown in the lightbox header. */
  sceneNumber?: number;
}

// On section change the thumbnails cascade in from the right (off-screen) and
// settle into place left-to-right. The cascade is held back ~1.5s so the new
// scene's image reveals first, then the carousel arrives.
const trackVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 1.5 } },
};

const thumbVariants = {
  hidden: { x: 80, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/**
 * Bottom filmstrip anchored to the bottom-right. It stays fixed while the page
 * scrolls and behaves like a small, self-contained carousel.
 */
export function DetailTray({ scene, sceneNumber }: DetailTrayProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrolled, segmentTop } = useScrollCue(1 / 4);
  const reduceMotion = useReducedMotion();

  const images: LightboxImage[] = (scene?.moments ?? [])
    .filter((m) => m.image && isCarouselShot(m))
    .map((m) => ({ src: m.image, caption: m.body ?? m.subtitle }));

  if (images.length === 0) return null;

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!trackRef.current) return;
    const dominantVertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);
    if (!dominantVertical) return;

    event.preventDefault();
    trackRef.current.scrollLeft += event.deltaY;
  }

  return (
    <>
      <div
        className={`fixed bottom-0 right-0 z-40 h-[119px] w-full overflow-hidden bg-[#111111] py-5 transition-opacity duration-200 md:left-[37.04vw] md:flex md:h-[26.13vh] md:w-auto md:items-stretch md:bg-transparent md:py-0 ${
          openIndex === null ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="relative hidden w-[3.2vw] shrink-0 py-[2.6vh] md:block">
          <span className="absolute right-0 top-[2.6vh] translate-x-1/2 font-sans text-[0.81vw] italic leading-[0.81vw] text-white motion-safe:animate-[scroll-pulse_2.6s_ease-in-out_infinite]">
            Scroll
          </span>
          <span className="absolute bottom-[2.6vh] right-0 top-[calc(2.6vh_+_0.81vw_+_0.87vh)] w-0.5 overflow-hidden bg-white/25 motion-reduce:bg-white">
            {scrolled ? (
              <motion.span
                style={{ top: segmentTop }}
                className="absolute inset-x-0 h-1/4 bg-white motion-reduce:hidden"
              />
            ) : (
              <span className="absolute inset-x-0 top-0 h-1/4 bg-white motion-safe:animate-[scroll-cue_2.6s_ease-in-out_infinite] motion-reduce:hidden" />
            )}
          </span>
        </div>

        <motion.div
          // Keyed by scene so the cascade replays whenever the section changes.
          key={scene?.key ?? "scene"}
          ref={trackRef}
          data-lenis-prevent
          onWheel={handleWheel}
          variants={trackVariants}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          className="flex h-full snap-x snap-mandatory items-center gap-2.5 overflow-x-auto scroll-smooth px-5 scroll-pl-5 [scrollbar-width:none] md:flex-1 md:px-0 md:scroll-pl-0 md:gap-[1.16vw] md:bg-gradient-to-b md:from-[#11111100] md:via-[#11111180] md:to-[#111111] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <motion.button
              key={`${img.src}-${i}`}
              variants={thumbVariants}
              whileHover={{ y: -4 }}
              onClick={() => setOpenIndex(i)}
              aria-label="View photo"
              suppressHydrationWarning
              className="shrink-0 snap-start bg-[#f3ede8] p-1.5 shadow-lg md:w-[9.84vw] md:p-[0.58vw]"
            >
              <div className="relative h-[67px] w-[100px] md:h-[8.68vh] md:w-full">
                <Image src={img.src} alt="" fill sizes="150px" className="object-cover" />
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <Lightbox
        images={images}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onIndexChange={setOpenIndex}
        sceneNumber={sceneNumber}
        sceneLabel={scene?.label}
      />
    </>
  );
}
