"use client";

import { useRef, useEffect } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { getMomentVh, isSceneShot, type Scene, type Moment } from "@/lib/types";
import { SceneImageLayer } from "./SceneImageLayer";
import { ScrollFrameScene } from "./ScrollFrameScene";
import { getSplatSceneForImage, setActiveSplatIndex } from "./splatScenes";
import { useScrollCue } from "./useScrollCue";

// ─── Animation constants (all in virtual-pixel vh units) ─────────────────────
//
// Timing is computed in vh, then converted to scroll-progress fractions.
// This keeps intent readable: "text holds for 90 of the 160vh allotted" is
// far clearer than "text opacity stays at 1 from progress 0.42 to 0.87".

/** How quickly images cross-fade at moment boundaries */
const IMG_CROSS_VH = 28;

/** Fade-in window at the start of chapters 2–6 (ch 1 starts fully visible) */
const CHAPTER_IN_VH = 22;

/** Text fade-in/out duration */
const TEXT_FADE_VH = 32;

/**
 * Distance from the slot's edge to where the text begins/ends its stable hold.
 * title cards get extra margin so their text doesn't appear before the image.
 */
const TEXT_MARGIN_TITLE  = 48;
const TEXT_MARGIN_MOMENT = 42;

// ─── Slot geometry ────────────────────────────────────────────────────────────

interface Slot {
  startVh: number;
  endVh: number;
  moment: Moment;
  isFirst: boolean;
  isLast: boolean;
}

function computeSlots(moments: Moment[]): { slots: Slot[]; totalScrollVh: number } {
  let cursor = 0;
  const slots: Slot[] = moments.map((moment, i) => {
    const vh = getMomentVh(moment);
    const slot: Slot = {
      startVh: cursor,
      endVh: cursor + vh,
      moment,
      isFirst: i === 0,
      isLast: i === moments.length - 1,
    };
    cursor += vh;
    return slot;
  });
  return { slots, totalScrollVh: cursor };
}

// ─── Keyframe helpers ─────────────────────────────────────────────────────────

/** Clamp-safe progress fraction for a vh position */
function fp(vh: number, total: number): number {
  return Math.max(0, Math.min(1, vh / total));
}

function makeImageKeyframes(
  slot: Slot,
  totalScrollVh: number,
  startsVisible: boolean
): [number[], number[]] {
  const { startVh, endVh, isFirst, isLast } = slot;
  const half = IMG_CROSS_VH / 2;
  const f = (v: number) => fp(v, totalScrollVh);

  // Single-moment chapter
  if (isFirst && isLast) {
    return startsVisible
      ? [[0, 1], [1, 1]]
      : [[0, f(CHAPTER_IN_VH), 1], [0, 1, 1]];
  }

  // First moment
  if (isFirst) {
    return startsVisible
      ? [[0, f(endVh - half), f(endVh + half), 1],           [1, 1, 0, 0]]
      : [[0, f(CHAPTER_IN_VH), f(endVh - half), f(endVh + half), 1], [0, 1, 1, 0, 0]];
  }

  // Last moment — always held at 1 (no fade-to-black; chapter boundary is a
  // physical scroll transition, not a dissolve)
  if (isLast) {
    return [[0, f(startVh - half), f(startVh + half), 1], [0, 0, 1, 1]];
  }

  // Middle moments
  return [
    [0, f(startVh - half), f(startVh + half), f(endVh - half), f(endVh + half), 1],
    [0, 0,                  1,                 1,                0,               0],
  ];
}

function makeTextKeyframes(
  slot: Slot,
  totalScrollVh: number
): [number[], number[]] {
  const { startVh, endVh, moment } = slot;
  const margin = moment.isTitle ? TEXT_MARGIN_TITLE : TEXT_MARGIN_MOMENT;
  const f = (v: number) => fp(v, totalScrollVh);

  const inStart  = f(startVh + margin - TEXT_FADE_VH);
  const inEnd    = f(startVh + margin);
  const outStart = f(endVh   - margin);
  const outEnd   = f(endVh   - margin + TEXT_FADE_VH);

  // Guard: if slot is very short the ranges can overlap.
  // Collapse to a brief flash at the midpoint rather than invert.
  const mid = f((startVh + endVh) / 2);
  const safeInEnd    = Math.min(inEnd,    mid);
  const safeOutStart = Math.max(outStart, mid);

  return [
    [0, inStart, safeInEnd, safeOutStart, outEnd,   1],
    [0, 0,       1,         1,            0,        0],
  ];
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

function ChapterOverlay() {
  return (
    <div aria-hidden className="absolute inset-0 z-10 pointer-events-none">
      {/* 1. Translucent base scrim */}
      <div className="absolute inset-0" style={{ background: "rgba(6,4,2,0.26)" }} />
      {/* 2. Warm amber colour wash */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(28,16,6,0.10)", mixBlendMode: "multiply" }}
      />
      {/* 3. Bottom vignette — heaviest at foot, where body text lives */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(6,4,2,0.85) 0%, rgba(6,4,2,0.22) 30%, transparent 56%)",
        }}
      />
      {/* 4. Top vignette — lighter, breathes above the horizon */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,4,2,0.50) 0%, transparent 28%)",
        }}
      />
    </div>
  );
}

// ─── MomentImageLayer ─────────────────────────────────────────────────────────

interface MomentImageLayerProps {
  chapterId: string;
  slot: Slot;
  totalScrollVh: number;
  scrollYProgress: MotionValue<number>;
  startsVisible: boolean;
  preloadSplatUrl?: string;
  priority?: boolean;
}

function MomentImageLayer({
  chapterId,
  slot,
  totalScrollVh,
  scrollYProgress,
  startsVisible,
  preloadSplatUrl,
  priority = false,
}: MomentImageLayerProps) {
  const [pKeys, oKeys] = makeImageKeyframes(slot, totalScrollVh, startsVisible);
  const opacity = useTransform(scrollYProgress, pKeys, oKeys);

  // Map overall progress to 0..1 for this specific moment slot so each image
  // gets its own local parallax timing.
  const slotStart = slot.startVh / totalScrollVh;
  const slotEnd   = slot.endVh   / totalScrollVh;
  const slotProgress = useTransform(scrollYProgress, [slotStart, slotEnd], [0, 1], { clamp: true });
  const frameSequencePath = slot.moment.frameSequencePath;
  const splatScene = getSplatSceneForImage(slot.moment.image);

  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
      {frameSequencePath ? (
        <ScrollFrameScene
          scenePath={frameSequencePath}
          scrollProgress={slotProgress}
          priority={priority}
        />
      ) : (
        <SceneImageLayer
          sceneId={`${chapterId}_${slot.moment.title.toLowerCase().replace(/\s+/g, "_")}`}
          imageSrc={slot.moment.image}
          scrollProgress={slotProgress}
          layerOpacity={opacity}
          splatIndex={splatScene?.index}
          splatUrl={splatScene?.url}
          preloadSplatUrl={preloadSplatUrl}
          priority={priority}
        />
      )}
    </motion.div>
  );
}

// ─── MomentTextLayer ─────────────────────────────────────────────────────────

interface MomentTextLayerProps {
  slot: Slot;
  totalScrollVh: number;
  scrollYProgress: MotionValue<number>;
  sceneNumber: string;
  sceneLabel: string;
  /** When true, the copy is fully visible at scroll 0 (opening hero). */
  startVisible?: boolean;
}

function MomentTextLayer({
  slot,
  totalScrollVh,
  scrollYProgress,
  sceneNumber,
  sceneLabel,
  startVisible = false,
}: MomentTextLayerProps) {
  const { moment } = slot;

  const [pKeys, oKeysRaw] = makeTextKeyframes(slot, totalScrollVh);
  // For the opening hero, hold opacity at 1 through the entry window so the
  // headline is readable on first paint (no fade-in-on-scroll required).
  const oKeys = startVisible
    ? oKeysRaw.map((v, i) => (i <= 1 ? 1 : v))
    : oKeysRaw;
  const opacity = useTransform(scrollYProgress, pKeys, oKeys);

  // Text enters from slightly below, exits upward — restrained, not theatrical
  const textInFrac  = fp(slot.startVh + (moment.isTitle ? TEXT_MARGIN_TITLE  : TEXT_MARGIN_MOMENT), totalScrollVh);
  const textOutFrac = fp(slot.endVh   - (moment.isTitle ? TEXT_MARGIN_TITLE  : TEXT_MARGIN_MOMENT), totalScrollVh);
  const y = useTransform(
    scrollYProgress,
    [0, textInFrac, textOutFrac, 1],
    [startVisible ? 0 : 22, 0, 0, -14],
    { clamp: true }
  );

  const body = moment.isTitle ? moment.subtitle : moment.body;
  const { scrolled, segmentTop } = useScrollCue(1 / 3);

  return (
    <motion.div
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ opacity }}
    >
      <motion.div
        className="absolute bottom-[118px] left-0 right-0 flex items-center gap-5 bg-gradient-to-b from-[#11111100] via-[#11111180] via-30% to-[#111111] px-5 py-10 md:bottom-0 md:left-0 md:right-auto md:h-[26.13vh] md:w-[40.24vw] md:items-center md:gap-0 md:via-50% md:px-[2.31vw] md:py-[5.21vh]"
        style={{ y }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 text-left md:gap-2.5">
          <p
            className="flex items-center gap-1 text-[14px] uppercase leading-none md:gap-1 md:text-[1.16vw] md:leading-[1.16vw]"
            suppressHydrationWarning
          >
            <span className="font-sans font-semibold text-highlight">{sceneNumber}.</span>
            <span className="font-sans font-normal text-white">{sceneLabel}</span>
          </p>
          <h2
            className="font-sans font-medium uppercase text-white leading-[1.02] drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] md:text-[48px] md:leading-[48px] md:drop-shadow-none"
            suppressHydrationWarning
            style={{
              fontSize: moment.isTitle
                ? "clamp(2rem, 2.78vw, 3rem)"
                : "clamp(1.75rem, 2.78vw, 3rem)",
              lineHeight: "clamp(2rem, 2.78vw, 3rem)",
            }}
          >
            {moment.title}
          </h2>
          {body && (
            <p
              className="font-sans font-normal text-white/90 leading-snug drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] md:text-[24px] md:leading-[28.8px] md:text-white md:drop-shadow-none"
              suppressHydrationWarning
            style={{
              fontSize: "clamp(1.125rem, 1.39vw, 1.5rem)",
              lineHeight: "clamp(1.35rem, 1.67vw, 1.8rem)",
            }}
            >
              {body}
            </p>
          )}
        </div>

        {/* Mobile scroll indicator (desktop uses the filmstrip's own divider) */}
        <div className="flex shrink-0 select-none flex-col items-center gap-2.5 self-stretch md:hidden">
          <span className="font-sans text-[14px] leading-none text-white motion-safe:animate-[scroll-pulse_2.4s_ease-in-out_infinite]">
            Scroll
          </span>
          <span className="relative w-0.5 flex-1 overflow-hidden bg-white/25 motion-reduce:bg-white">
            {scrolled ? (
              <motion.span
                style={{ top: segmentTop }}
                className="absolute inset-x-0 h-1/3 bg-white motion-reduce:hidden"
              />
            ) : (
              <span className="absolute inset-x-0 top-0 h-1/3 bg-white motion-safe:animate-[scroll-cue_2.4s_ease-in-out_infinite] motion-reduce:hidden" />
            )}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ChapterScene ─────────────────────────────────────────────────────────────

export interface ChapterSceneProps {
  scene: Scene;
  sceneIndex: number;
  /** Called when this scene becomes the dominant scene in the viewport */
  onEnter: (key: string) => void;
  /**
   * Whether this scene is within the active loading window (active +/- 1). Only
   * windowed scenes mount their heavy image/text layers (and decode sequences),
   * so just one section's frames load at a time. The outer scroll spacer always
   * renders, so scroll offsets and navigation anchors are unaffected.
   */
  inWindow: boolean;
}

export function ChapterScene({
  scene,
  sceneIndex,
  onEnter,
  inWindow,
}: ChapterSceneProps) {
  const outerRef = useRef<HTMLDivElement>(null);

  // The cinematic scroll is built only from scene shots (wide / 3D / title).
  // Detail shots live in the carousel/lightbox, not the full-screen story.
  // Fall back to all moments if a scene has no scene shots (so it never blanks).
  const sceneShots = scene.moments.filter(isSceneShot);
  const scrollMoments = sceneShots.length > 0 ? sceneShots : scene.moments;

  // Pre-compute geometry: each moment's vh range and total scroll distance
  const { slots, totalScrollVh } = computeSlots(scrollMoments);

  // Chapter outer div height = scroll space + 1 viewport of breathing room.
  // The sticky inner stays pinned while the scroll space drains.
  const chapterVh = totalScrollVh + 100;

  // scrollYProgress 0→1 maps exactly to totalScrollVh of scroll distance,
  // because offset 'start start'→'end end' gives:
  //   distance = chapterHeight - viewportHeight = totalScrollVh ✓
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const currentVh = progress * totalScrollVh;
    const nextActiveSlotIndex = slots.findIndex(
      (slot) => currentVh >= slot.startVh && currentVh < slot.endVh
    );

    const activeSlot = slots[nextActiveSlotIndex === -1 ? Math.max(0, slots.length - 1) : nextActiveSlotIndex];
    const activeSplatScene = activeSlot ? getSplatSceneForImage(activeSlot.moment.image) : undefined;
    if (activeSplatScene) {
      setActiveSplatIndex(activeSplatScene.index);
    }
  });

  // ── Nav: activate this chapter when it enters the viewport ────────────────
  // Threshold must be < viewport/chapterHeight to guarantee the observer fires.
  // Using 0.05 (5%) is safe for all chapter heights we generate (min ~4vh on
  // a 100vh viewport vs a 880vh chapter = 11% max ratio → 5% always crosses).
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) onEnter(scene.key); } },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scene.key, onEnter]);

  // First scene starts with its first image fully visible (no fade-from-black
  // on page load). All subsequent scenes fade in over CHAPTER_IN_VH.
  const startsVisible = sceneIndex === 0;

  return (
    <div
      ref={outerRef}
      id={scene.key}
      style={{ height: `${chapterVh}vh` }}
      className="relative"
    >
      {/*
       * Sticky viewport — stays pinned at the top of the screen while the
       * outer div's scroll space drives all animations inside.
       */}
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* ── IMAGE LAYERS (z-0) ─────────────────────────────────────────── */}
        {inWindow && slots.map((slot, i) => (
          <MomentImageLayer
            key={`img-${i}-${slot.moment.image}`}
            chapterId={scene.key}
            slot={slot}
            totalScrollVh={totalScrollVh}
            scrollYProgress={scrollYProgress}
            startsVisible={startsVisible && slot.isFirst}
            preloadSplatUrl={getSplatSceneForImage(slots[i + 1]?.moment.image ?? "")?.url}
            // Priority-load only the opening hero image.
            priority={sceneIndex === 0 && slot.isFirst}
          />
        ))}

        {/* ── OVERLAY LAYERS (z-10) ──────────────────────────────────────── */}
        <ChapterOverlay />

        {/* ── TEXT LAYERS (z-20) ─────────────────────────────────────────── */}
        {inWindow && slots.map((slot, i) => (
          <MomentTextLayer
            key={`txt-${i}-${slot.moment.image}`}
            slot={slot}
            totalScrollVh={totalScrollVh}
            scrollYProgress={scrollYProgress}
            sceneNumber={String(sceneIndex + 1).padStart(2, "0")}
            sceneLabel={scene.label}
            startVisible={startsVisible && slot.isFirst}
          />
        ))}

      </div>
    </div>
  );
}
