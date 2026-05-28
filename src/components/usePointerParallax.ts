"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";

const POINTER_SPRING = { stiffness: 60, damping: 26, mass: 1 };

type PointerSubscriber = (x: number, y: number) => void;

const subscribers = new Set<PointerSubscriber>();
let currentX = 0.5;
let currentY = 0.5;
let teardownPointerListener: (() => void) | null = null;

function emitPointer(x: number, y: number) {
  currentX = x;
  currentY = y;
  subscribers.forEach((subscriber) => subscriber(x, y));
}

function ensurePointerListener() {
  if (teardownPointerListener || typeof window === "undefined") return;

  const handlePointerMove = (event: PointerEvent) => {
    emitPointer(event.clientX / window.innerWidth, event.clientY / window.innerHeight);
  };

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  teardownPointerListener = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    teardownPointerListener = null;
  };
}

function releasePointerListener() {
  if (subscribers.size === 0) {
    teardownPointerListener?.();
  }
}

export function usePointerParallax(disabled = false): {
  smoothMouseX: MotionValue<number>;
  smoothMouseY: MotionValue<number>;
  prefersReducedMotion: boolean;
} {
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothMouseX = useSpring(mouseX, POINTER_SPRING);
  const smoothMouseY = useSpring(mouseY, POINTER_SPRING);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (disabled || prefersReducedMotion) {
      mouseX.set(0.5);
      mouseY.set(0.5);
      return;
    }

    const subscriber: PointerSubscriber = (x, y) => {
      mouseX.set(x);
      mouseY.set(y);
    };

    subscribers.add(subscriber);
    ensurePointerListener();
    subscriber(currentX, currentY);

    return () => {
      subscribers.delete(subscriber);
      releasePointerListener();
    };
  }, [disabled, mouseX, mouseY, prefersReducedMotion]);

  return { smoothMouseX, smoothMouseY, prefersReducedMotion };
}
