"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

// ─── Offline frame-capture page ───────────────────────────────────────────────
//
// This route is NOT part of the public experience. It renders a single Gaussian
// splat full-bleed on black and exposes a deterministic camera dolly so an
// offline renderer (scripts/render-splat-frames.mjs) can step through the move
// and screenshot each frame.
//
// Query params:
//   splat   – path to a .ksplat file (e.g. /gaussians/arrival-001.ksplat)
//   frames  – total frame count (default 60)
//   zoom    – dolly distance along the view axis over the whole sequence
//
// The viewer setup mirrors GallerySplatViewer exactly so baked frames match the
// live, already-approved look.

declare global {
  interface Window {
    __captureReady?: boolean;
    __captureFrameCount?: number;
    __captureFailed?: boolean;
    __captureSeek?: (frameIndex: number) => Promise<void>;
  }
}

function readParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    splatUrl: params.get("splat") ?? "",
    frames: Math.max(2, Number(params.get("frames") ?? 60)),
    zoom: Number(params.get("zoom") ?? 0.08),
  };
}

export default function CapturePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Initializing capture…");

  useEffect(() => {
    let cancelled = false;
    let viewer: GaussianSplats3D.Viewer | null = null;
    const { splatUrl, frames, zoom } = readParams();

    // Keep dev-only chrome (Next.js indicator, portals) out of baked frames.
    const hideDevChrome = document.createElement("style");
    hideDevChrome.textContent =
      "nextjs-portal, #__next-build-watcher, [data-nextjs-toast] { display: none !important; }";
    document.head.appendChild(hideDevChrome);

    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    async function init() {
      const root = rootRef.current;
      if (!root || !splatUrl) {
        window.__captureFailed = true;
        setMessage("Missing splat URL.");
        return;
      }

      try {
        const bounds = root.getBoundingClientRect();
        const camera = new THREE.PerspectiveCamera(
          46.8,
          Math.max(bounds.width / Math.max(bounds.height, 1), 0.1),
          0.01,
          100
        );
        camera.position.set(0, 0, 0);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, -1);

        viewer = new GaussianSplats3D.Viewer({
          rootElement: root,
          camera,
          cameraUp: [0, 1, 0],
          initialCameraPosition: [0, 0, 0],
          initialCameraLookAt: [0, 0, 0],
          useBuiltInControls: false,
          sharedMemoryForWorkers: false,
          gpuAcceleratedSort: false,
          dynamicScene: false,
          renderMode: GaussianSplats3D.RenderMode.Always,
          sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant,
          webXRMode: GaussianSplats3D.WebXRMode.None,
          logLevel: GaussianSplats3D.LogLevel.None,
          ignoreDevicePixelRatio: true,
          sphericalHarmonicsDegree: 0,
        });

        await viewer.addSplatScene(splatUrl, {
          splatAlphaRemovalThreshold: 12,
          showLoadingUI: false,
          progressiveLoad: false,
          position: [0, 0, 0],
          rotation: [1, 0, 0, 0],
          scale: [0.02, 0.02, 0.02],
        });

        if (cancelled) return;

        viewer.start();

        const seek = async (frameIndex: number) => {
          if (!viewer?.camera) return;

          const progress = frames <= 1 ? 0 : frameIndex / (frames - 1);
          camera.position.set(0, 0, -zoom * progress);
          camera.lookAt(0, 0, -1);
          camera.updateProjectionMatrix?.();
          viewer.forceRenderNextFrame();

          // Allow the async splat sort + paint to catch up before capture.
          for (let i = 0; i < 8; i += 1) {
            await nextFrame();
          }
        };

        window.__captureFrameCount = frames;
        window.__captureSeek = seek;

        await seek(0);
        // A little extra settle on the very first frame.
        await new Promise((resolve) => setTimeout(resolve, 400));

        if (cancelled) return;
        window.__captureReady = true;
        setMessage("");
      } catch (error) {
        console.error("Capture init failed:", error);
        window.__captureFailed = true;
        setMessage("Capture failed. See console.");
      }
    }

    init();

    return () => {
      cancelled = true;
      window.__captureReady = false;
      window.__captureSeek = undefined;
      hideDevChrome.remove();
      void viewer?.dispose?.();
    };
  }, []);

  return (
    <main className="fixed inset-0 bg-black">
      <div ref={rootRef} className="absolute inset-0" />
      {message && (
        <p className="absolute left-4 top-4 font-mono text-xs text-stone-500">
          {message}
        </p>
      )}
    </main>
  );
}
