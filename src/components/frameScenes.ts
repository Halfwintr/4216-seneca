// Registry mapping a source image to a pre-rendered splat frame sequence.
//
// Frame sequences are baked offline (scripts/render-splat-frames.mjs) into
// /public/scenes/<id>/ and scrubbed on scroll at runtime. This is far cheaper
// than running live WebGL splat viewers, with bounded, predictable memory.

export interface FrameSceneEntry {
  image: string;
  /** Public path to the scene folder, e.g. /scenes/arrival-001 */
  path: string;
}

export const FRAME_SCENES: FrameSceneEntry[] = [
  { image: "/images/property/arrival-001.webp", path: "/scenes/arrival-001" },
  { image: "/images/property/arrival-002.webp", path: "/scenes/arrival-002" },
  { image: "/images/property/arrival-003.webp", path: "/scenes/arrival-003" },
  { image: "/images/property/arrival-004.webp", path: "/scenes/arrival-004" },
  { image: "/images/property/entrance-17.jpg", path: "/scenes/entrance-17" },
  { image: "/images/property/entrance-16.jpg", path: "/scenes/entrance-16" },
  { image: "/images/property/entrance-13.jpg", path: "/scenes/entrance-13" },
  { image: "/images/property/entrance-15.jpg", path: "/scenes/entrance-15" },
  { image: "/images/property/heart-001.webp", path: "/scenes/heart-001" },
  { image: "/images/property/heart-002.webp", path: "/scenes/heart-002" },
  { image: "/images/property/heart-003.webp", path: "/scenes/heart-003" },
  { image: "/images/property/heart-004.webp", path: "/scenes/heart-004" },
  { image: "/images/property/accommodations-12.webp", path: "/scenes/accommodations-12" },
  { image: "/images/property/accommodations-13.webp", path: "/scenes/accommodations-13" },
  { image: "/images/property/accommodations-18.webp", path: "/scenes/accommodations-18" },
  { image: "/images/property/accommodations-20.webp", path: "/scenes/accommodations-20" },
  { image: "/images/property/accommodations-23.webp", path: "/scenes/accommodations-23" },
  { image: "/images/property/surroundings-02.webp", path: "/scenes/surroundings-02" },
  { image: "/images/property/surroundings-09.webp", path: "/scenes/surroundings-09" },
  { image: "/images/property/surroundings-11.webp", path: "/scenes/surroundings-11" },
  { image: "/images/property/surroundings-14.webp", path: "/scenes/surroundings-14" },
  { image: "/images/property/neighborhood-01.webp", path: "/scenes/neighborhood-01" },
  { image: "/images/property/neighborhood-02.webp", path: "/scenes/neighborhood-02" },
  { image: "/images/property/neighborhood-03.webp", path: "/scenes/neighborhood-03" },
];

export function getFrameSceneForImage(image: string): FrameSceneEntry | undefined {
  return FRAME_SCENES.find((scene) => scene.image === image);
}
