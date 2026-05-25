"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export interface SceneSectionProps {
  /** Unique section id used for anchor navigation */
  id: string;
  /** Human-readable label for aria and navigation */
  label: string;
  /** 0-based position in the section sequence */
  index: number;
  /**
   * CSS background value for the placeholder scene.
   *
   * FUTURE INTEGRATION POINT:
   * When Gaussian splat rendering is ready, pass `splat={true}` (or a scene
   * config) instead of a `background` string and render:
   *
   *   <SplatScene sceneId={id} className="absolute inset-0 w-full h-full" />
   *
   * The SplatScene component should fill the container and handle its own
   * loading, camera animation, and depth compositing. Keep the content layer
   * (z-10 div below) above it.
   */
  background: string;
  /** Light text on dark background (default) or dark on light */
  textColor?: "light" | "dark";
  /** Called when this section enters the viewport at ≥40% visibility */
  onEnter?: (index: number) => void;
  children: ReactNode;
  className?: string;
  /** Reduce parallax intensity (e.g. for sections with form inputs) */
  staticBackground?: boolean;
}

export function SceneSection({
  id,
  label,
  index,
  background,
  textColor = "light",
  onEnter,
  children,
  className = "",
  staticBackground = false,
}: SceneSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Parallax: background drifts upward at ~60% of scroll speed.
  // Background is 130% tall so the movement never creates edge gaps.
  const bgY = useTransform(
    scrollYProgress,
    [0, 1],
    staticBackground ? ["0%", "0%"] : ["0%", "-20%"]
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !onEnter) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            onEnter(index);
          }
        }
      },
      { threshold: [0.35] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onEnter]);

  const textClass =
    textColor === "light" ? "text-stone-100" : "text-stone-900";

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-label={label}
      data-scene-index={index}
      className={`relative min-h-screen overflow-hidden ${className}`}
    >
      {/*
       * ─── SCENE BACKGROUND ────────────────────────────────────────────────
       * Placeholder: CSS gradient occupying 130% height for parallax room.
       *
       * REPLACE THIS BLOCK with <SplatScene /> when the Gaussian splat
       * renderer is available. See SceneSectionProps.background JSDoc above.
       * ─────────────────────────────────────────────────────────────────────
       */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 w-full pointer-events-none"
        style={{
          height: "130%",
          background,
          y: bgY,
          willChange: "transform",
        }}
      />

      {/* Vignette — edges darker, center breathes */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Content layer — always above background and vignette */}
      <div className={`relative z-10 h-full ${textClass}`}>{children}</div>
    </section>
  );
}
