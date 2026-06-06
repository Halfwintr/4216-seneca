import { motionValue } from "framer-motion";

/**
 * Shared 0..1 scroll progress of the currently active scene. The active
 * ChapterScene writes its scrollYProgress here; DetailTray reads it to scrub
 * the bottom filmstrip horizontally (off-screen right -> under the scroll line).
 */
export const activeSceneProgress = motionValue(0);
