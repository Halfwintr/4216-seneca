"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface LightboxImage {
  src: string;
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** 1-based active scene number, e.g. 1 → "01" in the mobile header. */
  sceneNumber?: number;
  /** Active scene label, e.g. "Arrival", shown in the mobile header. */
  sceneLabel?: string;
}

export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
  sceneNumber,
  sceneLabel,
}: LightboxProps) {
  const open = index !== null;
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const next = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % images.length);
  }, [index, images.length, onIndexChange]);

  const prev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, next, prev]);

  useEffect(() => {
    if (index === null) return;
    thumbRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [index]);

  const current = index !== null ? images[index] : null;
  const renderedImageIndexes =
    index === null || images.length === 0
      ? []
      : Array.from(
          new Set([
            index,
            (index - 1 + images.length) % images.length,
            (index + 1) % images.length,
          ]),
        );

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-[linear-gradient(to_bottom,transparent_28%,rgba(17,17,17,0.92)_54%,#111111_72%)] px-4 pb-6 pt-6 md:block md:bg-none md:px-0 md:py-0 md:backdrop-blur-[1px]"
          onClick={onClose}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 hidden h-[33vh] bg-gradient-to-b from-[#11111100] via-[#11111180] to-[#111111] md:left-[37vw] md:block"
            style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, #000 5.5%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, #000 5.5%)",
            }}
          />

          <div
            className="flex w-full flex-col gap-3 md:contents"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile header: scene number/label + close */}
            <div className="flex items-center justify-between md:hidden">
              <p className="font-sans text-[14px] uppercase leading-none">
                <span className="font-semibold text-highlight">
                  {String(sceneNumber ?? 1).padStart(2, "0")}.
                </span>{" "}
                <span className="font-normal text-white">{sceneLabel}</span>
              </p>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 flex h-8 w-8 items-center justify-center text-white"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col gap-3 md:absolute md:bottom-[22vh] md:left-[42vw] md:right-[2.4vw] md:top-[8vh] md:justify-center md:gap-2"
            >
              <div className="relative border border-white/60 bg-[#f3ede8] p-1.5 shadow-2xl md:w-full md:max-w-[94vh] md:p-2.5">
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute -top-8 right-0 hidden h-8 w-8 items-center justify-center text-white transition-colors hover:bg-black/30 md:flex"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
                <div className="relative aspect-[1264/843] w-full">
                  {renderedImageIndexes.map((imageIndex) => {
                    const image = images[imageIndex];
                    const active = imageIndex === index;
                    return (
                      <Image
                        key={image.src}
                        src={image.src}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 60vw, 92vw"
                        priority={active}
                        loading={active ? undefined : "eager"}
                        className={`object-cover transition-opacity duration-150 ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
              {current.caption && (
                <p className="mt-2 font-sans text-sm italic text-white/85 md:w-full md:text-left md:text-[13px] md:leading-[14px]">
                  {current.caption}
                </p>
              )}
            </motion.div>
            {images.length > 1 && (
              <div
                className="-mx-4 mt-1 flex items-stretch md:mx-0 md:fixed md:bottom-0 md:left-[37.04vw] md:right-0 md:mt-0 md:h-[26.13vh] md:items-stretch"
              >
                <div className="relative hidden w-[3.2vw] shrink-0 md:block">
                  <span className="absolute right-0 w-0.5 bg-white md:bottom-[2.6vh] md:top-[calc(2.6vh_+_0.81vw_+_0.87vh)]" />
                </div>
                <div
                  data-lenis-prevent
                  className="flex items-center gap-4 overflow-x-auto scroll-smooth px-4 py-2.5 [scrollbar-width:none] md:flex-1 md:items-center md:gap-[1.16vw] md:px-0 md:py-0 [&::-webkit-scrollbar]:hidden"
                >
                  {images.map((img, i) => {
                    const active = i === index;
                    return (
                      <button
                        key={`${img.src}-${i}`}
                        ref={(el) => {
                          thumbRefs.current[i] = el;
                        }}
                        onClick={() => onIndexChange(i)}
                        aria-label={`View photo ${i + 1}`}
                        aria-current={active ? "true" : undefined}
                        className={`relative shrink-0 bg-[#f3ede8] p-1.5 shadow-lg transition-all duration-200 md:w-[9.84vw] md:p-[0.58vw] ${
                          active
                            ? "z-10 scale-[1.22] opacity-100 shadow-2xl"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="relative h-[58px] w-[92px] md:h-[8.68vh] md:w-full">
                          <Image
                            src={img.src}
                            alt=""
                            fill
                            sizes="150px"
                            loading="eager"
                            className="object-cover"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
