export interface SplatSceneEntry {
  image: string;
  url: string;
}

// Scenes are now served as pre-rendered frame sequences (a moment's
// frameSequencePath), which removed the live WebGL splat viewers. This list is
// intentionally empty; the splat path remains available for future use.
export const SPLAT_SCENES: SplatSceneEntry[] = [];

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
