"use client";

import { useRef, useEffect, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Image from "next/image";

// ─── SceneImage ──────────────────────────────────────────────────────────────
// Internal subcomponent. One per image in a section's `images` array.
// Handles:
//   • Crossfade opacity driven by the parent section's scrollYProgress
//   • Subtle scale-breathe zoom during the image's active scroll slot

interface SceneImageProps {
  src: string;
  scrollYProgress: MotionValue<number>;
  /** 0-based position within this section's image array */
  index: number;
  /** Total number of images in this section */
  total: number;
  /** Whether to eagerly load this image (use for above-the-fold images only) */
  priority?: boolean;
}

/**
 * Returns [progressKeyframes, opacityKeyframes] for a given image slot.
 * Progress 0→1 covers the full section scroll (start-enter → end-exit).
 * The crossfade zone is TRANSITION_WIDTH wide, centered on each slot boundary.
 */
function buildOpacityKeyframes(
  index: number,
  total: number
): [number[], number[]] {
  const TRANSITION_WIDTH = 0.18; // 18% of section progress per crossfade
  const half = TRANSITION_WIDTH / 2;

  if (total === 1) return [[0, 1], [1, 1]];

  const slotSize = 1 / total;
  const slotStart = index * slotSize;
  const slotEnd = (index + 1) * slotSize;

  if (index === 0) {
    return [
      [0,  slotEnd - half, slotEnd + half,   1],
      [1,  1,               0,               0],
    ];
  }

  if (index === total - 1) {
    return [
      [0,  slotStart - half, slotStart + half,  1],
      [0,  0,                 1,                 1],
    ];
  }

  return [
    [0, slotStart - half, slotStart + half, slotEnd - half, slotEnd + half, 1],
    [0, 0,                 1,               1,               0,              0],
  ];
}

function SceneImage({
  src,
  scrollYProgress,
  index,
  total,
  priority = false,
}: SceneImageProps) {
  const [progressKeys, opacityKeys] = buildOpacityKeyframes(index, total);
  const opacity = useTransform(scrollYProgress, progressKeys, opacityKeys);

  // Scale breathing: zoom from 1.08 → 1.03 during this image's active slot.
  // Both values are > 1 so the image always overflows its container — when
  // clipped by the parent's overflow:hidden, this guarantees zero edge gaps
  // regardless of any transform applied by the parent.
  const slotStart = index / total;
  const slotEnd = (index + 1) / total;
  const scale = useTransform(
    scrollYProgress,
    [slotStart, slotEnd],
    [1.08, 1.03],
    { clamp: true }
  );

  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
      {/*
       * ─── IMAGE LAYER ──────────────────────────────────────────────────────
       * FUTURE: Replace this motion.div + <Image> with:
       *
       *   <SplatScene
       *     sceneId="[section-id]"
       *     viewIndex={index}
       *     scrollProgress={scrollYProgress}
       *   />
       *
       * SplatScene should:
       *  • Fill this container (absolute inset-0)
       *  • Apply its own camera / depth animation driven by scrollProgress
       *  • Handle loading, fallback, and compositing internally
       *  • Keep z-order below the vignette and content layers
       * ──────────────────────────────────────────────────────────────────────
       */}
      <motion.div
        className="absolute inset-0"
        style={{
          scale,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          quality={90}
          className="object-cover object-center"
          priority={priority}
        />
      </motion.div>
    </motion.div>
  );
}

// ─── SceneSection ─────────────────────────────────────────────────────────────

export interface SceneSectionProps {
  /** Unique section id used for anchor navigation */
  id: string;
  /** Human-readable label for aria and navigation */
  label: string;
  /** 0-based position in the section sequence */
  index: number;

  /**
   * Ordered array of image paths for this section (1–3 images).
   *
   * When multiple images are supplied, the section's scrollYProgress is
   * divided evenly between them and each crossfades smoothly into the next.
   *
   * FUTURE: When Gaussian splat rendering is ready, remove `images` and
   * instead render a <SplatScene /> per image slot (see SceneImage above).
   * The section architecture and scroll-progress wiring remain identical.
   */
  images?: string[];

  /**
   * CSS background string used as a color fill beneath (and as fallback for)
   * the image layers. Always provide this alongside `images` so something
   * visible appears while images are loading and if they fail.
   */
  background?: string;

  /** Light text on dark background (default) or dark on light */
  textColor?: "light" | "dark";

  /** Called when this section enters the viewport at ≥20% visibility */
  onEnter?: (index: number) => void;

  children: ReactNode;
  className?: string;

  /** Suppress the gradient-layer parallax (use for form/details sections) */
  staticBackground?: boolean;
}

export function SceneSection({
  id,
  label,
  index,
  images,
  background,
  textColor = "light",
  onEnter,
  children,
  className = "",
  staticBackground = false,
}: SceneSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // offset: 'start end' → 'end start': progress 0 when section bottom enters
  // viewport bottom; 1 when section top exits viewport top.
  // For a 100vh section in a 100vh viewport this spans 200vh of scroll total,
  // meaning progress=0.5 (crossfade point) lands precisely when the section
  // fully fills the viewport — ideal timing for the image transition.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Parallax for the gradient fallback layer (not used when images present)
  const bgY = useTransform(
    scrollYProgress,
    [0, 1],
    staticBackground ? ["0%", "0%"] : ["0%", "-20%"]
  );

  // IntersectionObserver drives the active-section nav dot
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !onEnter) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            onEnter(index);
          }
        }
      },
      { threshold: [0.2] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onEnter]);

  const textClass =
    textColor === "light" ? "text-stone-100" : "text-stone-900";
  const hasImages = images && images.length > 0;

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={label}
      data-scene-index={index}
      className={`relative min-h-screen overflow-hidden ${className}`}
    >
      {/* ── Color fill — always rendered as the bottom-most layer ─────────── */}
      {background && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background }}
        />
      )}

      {hasImages ? (
        /*
         * ── IMAGE LAYERS ─────────────────────────────────────────────────
         * Each SceneImage manages its own opacity (crossfade) and scale
         * (zoom breath). They stack absolutely and crossfade in sequence.
         *
         * FUTURE: Swap the entire block below for one <SplatScene /> per
         * image path. SceneImage is the per-slot integration seam.
         * ──────────────────────────────────────────────────────────────────
         */
        images.map((src, i) => (
          <SceneImage
            key={src}
            src={src}
            scrollYProgress={scrollYProgress}
            index={i}
            total={images.length}
            // Eagerly load the first image of the first two sections
            priority={i === 0 && index <= 1}
          />
        ))
      ) : (
        /*
         * ── GRADIENT BACKGROUND FALLBACK ─────────────────────────────────
         * Used when no images are provided (e.g. the Details section).
         * FUTURE: Replace with <SplatScene sceneId={id} /> here too.
         * ──────────────────────────────────────────────────────────────────
         */
        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-0 w-full pointer-events-none"
          style={{
            height: "130%",
            background: background ?? "#0D0B09",
            y: bgY,
            willChange: "transform",
          }}
        />
      )}

      {/* Vignette — softens image edges, grounds the text */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 25%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Content layer — stable above all background layers */}
      <div className={`relative z-10 h-full ${textClass}`}>{children}</div>
    </section>
  );
}
