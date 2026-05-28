"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { getMomentVh, type Chapter, type Moment, type TextAlign } from "./chapters";
import { SceneImageLayer } from "./SceneImageLayer";
import { getSplatSceneForImage, setActiveSplatIndex } from "./splatScenes";

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

// ─── Text-area radial gradient ────────────────────────────────────────────────

function textAreaRadial(align: TextAlign, isTitle: boolean): string {
  const rx = isTitle ? "100% 88%" : "90% 76%";
  const origins: Record<TextAlign, string> = {
    left:   `ellipse ${rx} at 8%  96%`,
    center: `ellipse ${rx} at 50% 84%`,
    right:  `ellipse ${rx} at 92% 96%`,
  };
  const alpha = isTitle ? "0.90" : "0.80";
  return `radial-gradient(${origins[align]}, rgba(6,4,2,${alpha}) 0%, rgba(6,4,2,0.30) 42%, transparent 66%)`;
}

// ─── Text positioning ─────────────────────────────────────────────────────────

const containerClass: Record<TextAlign, string> = {
  left:
    "absolute bottom-16 sm:bottom-20 md:bottom-24 left-6 sm:left-10 md:left-14 lg:left-20",
  center:
    "absolute bottom-[26%] inset-x-0 flex flex-col items-center",
  right:
    "absolute bottom-16 sm:bottom-20 md:bottom-24 right-6 sm:right-10 md:right-14 lg:right-20",
};

const textAlignClass: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

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
  const splatScene = getSplatSceneForImage(slot.moment.image);

  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    >
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
    </motion.div>
  );
}

// ─── MomentTextLayer ─────────────────────────────────────────────────────────

interface MomentTextLayerProps {
  slot: Slot;
  totalScrollVh: number;
  scrollYProgress: MotionValue<number>;
}

function MomentTextLayer({ slot, totalScrollVh, scrollYProgress }: MomentTextLayerProps) {
  const { moment } = slot;
  const align = moment.align ?? "left";

  const [pKeys, oKeys] = makeTextKeyframes(slot, totalScrollVh);
  const opacity = useTransform(scrollYProgress, pKeys, oKeys);

  // Text enters from slightly below, exits upward — restrained, not theatrical
  const textInFrac  = fp(slot.startVh + (moment.isTitle ? TEXT_MARGIN_TITLE  : TEXT_MARGIN_MOMENT), totalScrollVh);
  const textOutFrac = fp(slot.endVh   - (moment.isTitle ? TEXT_MARGIN_TITLE  : TEXT_MARGIN_MOMENT), totalScrollVh);
  const y = useTransform(
    scrollYProgress,
    [0, textInFrac, textOutFrac, 1],
    [22, 0, 0, -14],
    { clamp: true }
  );

  return (
    <motion.div
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ opacity }}
    >
      {/* Per-moment text-area radial — a soft pool of darkness around the copy */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: textAreaRadial(align, !!moment.isTitle) }}
      />

      <motion.div className={`${containerClass[align]} max-w-2xl`} style={{ y }}>
        {moment.isTitle ? (
          // ── TITLE CARD MODE ───────────────────────────────────────────
          // Large editorial serif heading + atmospheric subtitle.
          <div className={`flex flex-col gap-5 ${textAlignClass[align]}`}>
            {moment.eyebrow && (
              <p className="text-[10px] tracking-[0.30em] uppercase font-sans font-light text-stone-300/65">
                {moment.eyebrow}&thinsp;/&thinsp;{moment.title.split(" ")[0]}
              </p>
            )}
            <h2
              className="font-serif font-light italic text-stone-50 leading-none drop-shadow-sm"
              style={{ fontSize: "clamp(3rem, 7.5vw, 5.75rem)" }}
            >
              {moment.title}
            </h2>
            {moment.subtitle && (
              <p
                className="font-sans font-light text-stone-200/80 leading-relaxed max-w-lg drop-shadow-sm"
                style={{ fontSize: "clamp(0.9rem, 1.7vw, 1.05rem)" }}
              >
                {moment.subtitle}
              </p>
            )}
          </div>
        ) : (
          // ── MOMENT TEXT MODE ──────────────────────────────────────────
          // Smaller serif heading + grounded sans body.
          <div className={`flex flex-col gap-3 ${textAlignClass[align]}`}>
            <h3
              className="font-serif font-light italic text-stone-50 leading-tight drop-shadow-sm"
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}
            >
              {moment.title}
            </h3>
            {moment.body && (
              <p
                className="font-sans font-light text-stone-200/85 leading-relaxed max-w-md drop-shadow-sm"
                style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}
              >
                {moment.body}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── ChapterScene ─────────────────────────────────────────────────────────────

export interface ChapterSceneProps {
  chapter: Chapter;
  chapterIndex: number;
  /** Called when this chapter becomes the dominant chapter in the viewport */
  onEnter: (id: string) => void;
}

export function ChapterScene({
  chapter,
  chapterIndex,
  onEnter,
}: ChapterSceneProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [shouldRenderLayers, setShouldRenderLayers] = useState(chapterIndex === 0);

  // Pre-compute geometry: each moment's vh range and total scroll distance
  const { slots, totalScrollVh } = computeSlots(chapter.moments);

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
      (entries) => { for (const e of entries) { if (e.isIntersecting) onEnter(chapter.id); } },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [chapter.id, onEnter]);

  // Only mount the expensive full-screen image/text layers while this chapter is
  // close enough to matter. The outer scroll height stays intact, so the scene
  // timing and navigation do not shift.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShouldRenderLayers(entry.isIntersecting),
      { rootMargin: "150% 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // First chapter starts with its first image fully visible (no fade-from-black
  // on page load). All subsequent chapters fade in over CHAPTER_IN_VH.
  const startsVisible = chapterIndex === 0;

  return (
    <div
      ref={outerRef}
      id={chapter.id}
      style={{ height: `${chapterVh}vh` }}
      className="relative"
    >
      {/*
       * Sticky viewport — stays pinned at the top of the screen while the
       * outer div's scroll space drives all animations inside.
       */}
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* ── IMAGE LAYERS (z-0) ─────────────────────────────────────────── */}
        {shouldRenderLayers && slots.map((slot, i) => (
          <MomentImageLayer
            key={`img-${i}-${slot.moment.image}`}
            chapterId={chapter.id}
            slot={slot}
            totalScrollVh={totalScrollVh}
            scrollYProgress={scrollYProgress}
            startsVisible={startsVisible && slot.isFirst}
            preloadSplatUrl={getSplatSceneForImage(slots[i + 1]?.moment.image ?? "")?.url}
            // Priority-load only the opening hero image.
            priority={chapterIndex === 0 && slot.isFirst}
          />
        ))}

        {/* ── OVERLAY LAYERS (z-10) ──────────────────────────────────────── */}
        <ChapterOverlay />

        {/* ── TEXT LAYERS (z-20) ─────────────────────────────────────────── */}
        {shouldRenderLayers && slots.map((slot, i) => (
          <MomentTextLayer
            key={`txt-${i}-${slot.moment.image}`}
            slot={slot}
            totalScrollVh={totalScrollVh}
            scrollYProgress={scrollYProgress}
          />
        ))}

      </div>
    </div>
  );
}
