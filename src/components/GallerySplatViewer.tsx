"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import Image from "next/image";
import * as THREE from "three";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

type ViewerStatus = "checking" | "fallback" | "loading" | "ready";

interface GallerySplatViewerProps {
  className?: string;
  splatUrl: string;
  preloadSplatUrl?: string;
  fallbackSrc: string;
  scrollProgress: MotionValue<number>;
  smoothMouseX: MotionValue<number>;
  smoothMouseY: MotionValue<number>;
}

export default function GallerySplatViewer({
  className = "",
  splatUrl,
  preloadSplatUrl,
  fallbackSrc,
  scrollProgress,
  smoothMouseX,
  smoothMouseY,
}: GallerySplatViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GaussianSplats3D.Viewer | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("checking");

  useEffect(() => {
    if (!preloadSplatUrl) return;

    const existingLink = document.querySelector<HTMLLinkElement>(
      `link[data-splat-prefetch="${preloadSplatUrl}"]`
    );

    if (existingLink) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.href = preloadSplatUrl;
    link.crossOrigin = "anonymous";
    link.dataset.splatPrefetch = preloadSplatUrl;
    document.head.appendChild(link);
  }, [preloadSplatUrl]);

  useEffect(() => {
    let cancelled = false;
    let viewer: GaussianSplats3D.Viewer | null = null;
    let cameraFrame = 0;
    const controller = new AbortController();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = "connection" in navigator
      && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

    if (reducedMotion || saveData) {
      const frame = requestAnimationFrame(() => setStatus("fallback"));
      return () => {
        cancelAnimationFrame(frame);
        controller.abort();
      };
    }

    const waitForViewerToSettle = (activeViewer: GaussianSplats3D.Viewer, root: HTMLDivElement) => {
      type ViewerInternals = GaussianSplats3D.Viewer & {
        splatRenderReady?: boolean;
        sortRunning?: boolean;
        splatMesh?: { visibleRegionChanging?: boolean };
      };

      const viewerState = activeViewer as ViewerInternals;
      const startedAt = performance.now();

      return new Promise<void>((resolve) => {
        const check = () => {
          if (cancelled) {
            resolve();
            return;
          }

          const canvas = root.querySelector("canvas");
          const isSettled = Boolean(canvas)
            && viewerState.splatRenderReady
            && !viewerState.sortRunning
            && !viewerState.splatMesh?.visibleRegionChanging;

          if (isSettled || performance.now() - startedAt > 5000) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => resolve());
            });
            return;
          }

          requestAnimationFrame(check);
        };

        check();
      });
    };

    async function loadViewer() {
      const root = rootRef.current;
      if (!root) return;

      try {
        setStatus("loading");

        const dimensions = root.getBoundingClientRect();
        const camera = new THREE.PerspectiveCamera(
          46.8,
          Math.max(dimensions.width / Math.max(dimensions.height, 1), 0.1),
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
          renderMode: GaussianSplats3D.RenderMode.OnChange,
          sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant,
          webXRMode: GaussianSplats3D.WebXRMode.None,
          logLevel: GaussianSplats3D.LogLevel.None,
          ignoreDevicePixelRatio: true,
          sphericalHarmonicsDegree: 0,
        });
        viewerRef.current = viewer;

        let lastCameraState: { x: number; y: number; z: number; lx: number; ly: number; lz: number } | null = null;
        let trackCameraMotion = false;

        const updateViewerCamera = () => {
          if (cancelled || !viewer?.camera) return;

          const mx = smoothMouseX.get() - 0.5;
          const my = smoothMouseY.get() - 0.5;
          const scroll = trackCameraMotion ? scrollProgress.get() : 0;

          const renderBounds = root.getBoundingClientRect();
          camera.aspect = Math.max(renderBounds.width / Math.max(renderBounds.height, 1), 0.1);
          const nextCameraState = {
            x: mx * 0.012,
            y: my * 0.008,
            z: scroll * -0.025,
            lx: mx * 0.004,
            ly: my * 0.003,
            lz: -1,
          };

          const cameraChanged = !lastCameraState
            || Math.abs(nextCameraState.x - lastCameraState.x) > 0.0005
            || Math.abs(nextCameraState.y - lastCameraState.y) > 0.0005
            || Math.abs(nextCameraState.z - lastCameraState.z) > 0.0005
            || Math.abs(nextCameraState.lx - lastCameraState.lx) > 0.0005
            || Math.abs(nextCameraState.ly - lastCameraState.ly) > 0.0005;

          if (cameraChanged) {
            viewer.camera.position.set(nextCameraState.x, nextCameraState.y, nextCameraState.z);
            viewer.camera.lookAt(nextCameraState.lx, nextCameraState.ly, nextCameraState.lz);
            viewer.camera.updateProjectionMatrix?.();
            viewer.forceRenderNextFrame();
            lastCameraState = nextCameraState;
          }

          cameraFrame = requestAnimationFrame(updateViewerCamera);
        };

        await viewer.addSplatScene(splatUrl, {
          splatAlphaRemovalThreshold: 12,
          showLoadingUI: false,
          progressiveLoad: true,
          position: [0, 0, 0],
          rotation: [1, 0, 0, 0],
          scale: [0.02, 0.02, 0.02],
        });

        if (cancelled) return;

        viewer.start();
        cameraFrame = requestAnimationFrame(updateViewerCamera);
        await waitForViewerToSettle(viewer, root);
        if (cancelled) return;

        setStatus("ready");
        trackCameraMotion = true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Falling back from Gaussian splat viewer.", error);
        if (!cancelled) setStatus("fallback");
      }
    }

    loadViewer();

    return () => {
      cancelled = true;
      controller.abort();

      const activeViewer = viewerRef.current ?? viewer;
      viewerRef.current = null;
      cancelAnimationFrame(cameraFrame);
      void activeViewer?.dispose?.();
    };
  }, [scrollProgress, smoothMouseX, smoothMouseY, splatUrl]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-splat-viewer-status={status}
    >
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ opacity: status === "ready" ? 0 : 1 }}
      >
        <Image
          src={fallbackSrc}
          alt=""
          fill
          sizes="100vw"
          quality={88}
          priority
          className="object-cover object-center"
        />
      </div>

      <div
        ref={rootRef}
        aria-hidden
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ opacity: status === "ready" ? 1 : 0 }}
      />

    </div>
  );
}
