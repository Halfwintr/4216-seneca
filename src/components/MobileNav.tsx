"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Seal } from "./Seal";
import type { Listing } from "@/lib/types";

interface MobileNavProps {
  listing: Listing;
  activeId: string;
  /** Instantly load + jump to a section. */
  onNavigate: (key: string) => void;
}

export function MobileNav({ listing, activeId, onNavigate }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  function go(id: string) {
    setOpen(false);
    onNavigate(id);
  }

  const logo = listing.branding.logoPath;

  return (
    <div className="md:hidden">
      {/* Address scrim, flush to the top-left corner */}
      <div className="fixed left-0 top-0 z-50 flex flex-col items-center gap-2 bg-[#111111]/10 px-4 py-5 backdrop-blur-[2px]">
        <Seal listing={listing} size="compact" />
      </div>

      {/* Hamburger, top-right */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="fixed right-2.5 top-2.5 z-50 flex items-center justify-center bg-[#111111]/20 p-2.5 text-white backdrop-blur-[2px]"
        >
          <Menu size={24} strokeWidth={1.5} />
        </button>
      )}

      {/* Full-screen menu overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/55 backdrop-blur-md"
          >
            <div className="flex justify-end p-5">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-black/40 text-white"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col items-center justify-center gap-6">
              {listing.scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => go(scene.key)}
                  className={`text-[22px] uppercase leading-none transition-colors ${
                    scene.key === activeId ? "text-highlight" : "text-white"
                  }`}
                >
                  {scene.label}
                </button>
              ))}
            </nav>

            <div className="flex flex-col items-center gap-4 pb-16">
              {logo && (
                <Image src={logo} alt="" width={56} height={56} className="h-14 w-14" />
              )}
              <button
                onClick={() => go("details")}
                className="border-y border-white/80 px-10 py-2.5 text-[20px] uppercase leading-none text-white"
              >
                Details
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
