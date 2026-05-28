"use client";

import type { MotionValue } from "framer-motion";
import { useMotionValueEvent } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePointerParallax } from "./usePointerParallax";
import { getActiveSplatIndex, subscribeToActiveSplatIndex } from "./splatScenes";

const GallerySplatViewer = dynamic(() => import("./GallerySplatViewer"), {
  ssr: false,
});

interface SceneImageLayerProps {
  sceneId: string;
  imageSrc: string;
  scrollProgress: MotionValue<number>;
  layerOpacity?: MotionValue<number>;
  splatIndex?: number;
  splatUrl?: string;
  preloadSplatUrl?: string;
  priority?: boolean;
}

export function SceneImageLayer({
  sceneId,
  imageSrc,
  scrollProgress,
  layerOpacity,
  splatIndex,
  splatUrl,
  preloadSplatUrl,
  priority = false,
}: SceneImageLayerProps) {
  const [activeSplatIndex, setLocalActiveSplatIndex] = useState(getActiveSplatIndex());
  const { smoothMouseX, smoothMouseY } = usePointerParallax(!splatUrl);
  const shouldMountSplat = Boolean(splatUrl)
    && splatIndex !== undefined
    && Math.abs(splatIndex - activeSplatIndex) <= 1;

  useEffect(() => subscribeToActiveSplatIndex(setLocalActiveSplatIndex), []);

  useMotionValueEvent(layerOpacity ?? scrollProgress, "change", (value) => {
    if (!splatUrl || splatIndex === undefined) return;

    if (value > 0.55) {
      setLocalActiveSplatIndex(splatIndex);
    }
  });

  return (
    <div
      data-scene-image={sceneId}
      className="absolute inset-0 h-full w-full overflow-hidden select-none bg-stone-950/20"
      style={{ perspective: "1000px" }}
    >
      {splatUrl && shouldMountSplat ? (
        <GallerySplatViewer
          className="absolute inset-0 h-full w-full"
          splatUrl={splatUrl}
          preloadSplatUrl={preloadSplatUrl}
          fallbackSrc={imageSrc}
          scrollProgress={scrollProgress}
          smoothMouseX={smoothMouseX}
          smoothMouseY={smoothMouseY}
        />
      ) : (
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="100vw"
          quality={priority ? 88 : 75}
          className="object-cover object-center"
          priority={priority}
        />
      )}
    </div>
  );
}
