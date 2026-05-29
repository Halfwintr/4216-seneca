"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

interface SceneManifest {
  frameCount: number;
  pad: number;
  ext: string;
}

interface ScrollFrameSceneProps {
  /** Public path to the baked scene folder, e.g. /scenes/arrival-001 */
  scenePath: string;
  scrollProgress: MotionValue<number>;
  /** Opacity of this slide; used to defer frame preload until it's approaching. */
  layerOpacity?: MotionValue<number>;
  priority?: boolean;
}

function frameUrl(scenePath: string, index: number, manifest: SceneManifest) {
  const name = `frame-${String(index).padStart(manifest.pad, "0")}.${manifest.ext}`;
  return `${scenePath}/${name}`;
}

export function ScrollFrameScene({
  scenePath,
  scrollProgress,
  layerOpacity,
  priority = false,
}: ScrollFrameSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const manifestRef = useRef<SceneManifest | null>(null);
  const lastIndexRef = useRef(-1);
  const [ready, setReady] = useState(false);
  // Defer the (memory-heavy) frame preload until this slide is approaching, so
  // multiple scenes in one chapter don't all decode their sequences at once.
  const [shouldLoad, setShouldLoad] = useState(priority);

  useMotionValueEvent(layerOpacity ?? scrollProgress, "change", (value) => {
    if (!shouldLoad && value > 0.02) setShouldLoad(true);
  });

  // ── Draw a frame with object-cover behavior ──────────────────────────────
  const drawIndex = (index: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const manifest = manifestRef.current;
    const frame = framesRef.current[index];
    if (!canvas || !container || !manifest || !frame) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const targetW = Math.round(cw * dpr);
    const targetH = Math.round(ch * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const iw = frame.naturalWidth;
    const ih = frame.naturalHeight;
    const scale = Math.max(targetW / iw, targetH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;

    ctx.drawImage(frame, dx, dy, dw, dh);
    lastIndexRef.current = index;
  };

  const indexForProgress = (progress: number) => {
    const manifest = manifestRef.current;
    if (!manifest) return 0;
    const clamped = Math.max(0, Math.min(1, progress));
    return Math.round(clamped * (manifest.frameCount - 1));
  };

  const drawForProgress = (progress: number) => {
    if (!manifestRef.current) return;
    const index = indexForProgress(progress);
    if (index === lastIndexRef.current) return;
    drawIndex(index);
  };

  // ── Load manifest, paint the current frame ASAP, then preload the rest ────
  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;

    const loadFrame = (index: number, manifest: SceneManifest) =>
      new Promise<void>((resolve) => {
        const img = new window.Image();
        img.decoding = "async";
        img.onload = () => {
          framesRef.current[index] = img;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = frameUrl(scenePath, index, manifest);
      });

    async function load() {
      try {
        const res = await fetch(`${scenePath}/manifest.json`);
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        const manifest = (await res.json()) as SceneManifest;
        if (cancelled) return;
        manifestRef.current = manifest;
        framesRef.current = new Array(manifest.frameCount);

        // Paint the first visible frame immediately so the canvas can reveal
        // without waiting on the whole sequence (no separate poster image).
        const firstIndex = indexForProgress(scrollProgress.get());
        await loadFrame(firstIndex, manifest);
        if (cancelled) return;
        drawForProgress(scrollProgress.get());
        setReady(true);

        // Background-load the remaining frames for smooth scrubbing.
        const rest = Array.from({ length: manifest.frameCount }, (_, i) => i).filter(
          (i) => i !== firstIndex
        );
        await Promise.all(rest.map((i) => loadFrame(i, manifest)));
        if (cancelled) return;
        drawForProgress(scrollProgress.get());
      } catch (error) {
        console.warn("ScrollFrameScene failed to load:", error);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenePath, shouldLoad]);

  // ── Redraw on scroll ─────────────────────────────────────────────────────
  useMotionValueEvent(scrollProgress, "change", (value) => {
    drawForProgress(value);
  });

  // ── Redraw on resize ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      lastIndexRef.current = -1;
      drawForProgress(scrollProgress.get());
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      data-frame-scene={scenePath}
      className="absolute inset-0 h-full w-full overflow-hidden bg-stone-950/20"
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full transition-opacity duration-500 ease-out"
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}
