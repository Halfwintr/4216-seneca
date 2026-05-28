export interface SplatSceneEntry {
  image: string;
  url: string;
}

export const SPLAT_SCENES: SplatSceneEntry[] = [
  { image: "/images/property/arrival-001.webp", url: "/gaussians/arrival-001.ksplat" },
  { image: "/images/property/arrival-002.webp", url: "/gaussians/arrival-002.ksplat" },
  { image: "/images/property/arrival-003.webp", url: "/gaussians/arrival-003.ksplat" },
  { image: "/images/property/arrival-004.webp", url: "/gaussians/arrival-004.ksplat" },
  { image: "/images/property/entrance-17.jpg", url: "/gaussians/entrance-17.ksplat" },
  { image: "/images/property/entrance-16.jpg", url: "/gaussians/entrance-16.ksplat" },
  { image: "/images/property/entrance-13.jpg", url: "/gaussians/entrance-13.ksplat" },
  { image: "/images/property/entrance-15.jpg", url: "/gaussians/entrance-15.ksplat" },
  { image: "/images/property/heart-001.webp", url: "/gaussians/heart-001.ksplat" },
];

export function getSplatSceneForImage(image: string): (SplatSceneEntry & { index: number }) | undefined {
  const index = SPLAT_SCENES.findIndex((scene) => scene.image === image);
  if (index === -1) return undefined;

  return { ...SPLAT_SCENES[index], index };
}

type ActiveSplatSubscriber = (index: number) => void;

let activeSplatIndex = 0;
const subscribers = new Set<ActiveSplatSubscriber>();

export function getActiveSplatIndex() {
  return activeSplatIndex;
}

export function setActiveSplatIndex(index: number) {
  if (index === activeSplatIndex) return;

  activeSplatIndex = index;
  subscribers.forEach((subscriber) => subscriber(index));
}

export function subscribeToActiveSplatIndex(subscriber: ActiveSplatSubscriber) {
  subscribers.add(subscriber);
  subscriber(activeSplatIndex);

  return () => {
    subscribers.delete(subscriber);
  };
}
