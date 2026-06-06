"use client";

import Image from "next/image";
import { Seal } from "./Seal";
import type { Listing } from "@/lib/types";

interface NavRailProps {
  listing: Listing;
  /** Active scene key (or "details"). */
  activeId: string;
  /** Instantly load + jump to a section. */
  onNavigate: (key: string) => void;
}

export function NavRail({ listing, activeId, onNavigate }: NavRailProps) {
  // CMS-driven sections, matching the mobile nav (MobileNav) exactly.
  const railItems = listing.scenes.map((scene) => ({
    ...scene,
    displayLabel: scene.label,
  }));

  const logo = listing.branding.logoPath ?? "/brand/beycome.svg";

  return (
    <nav
      aria-label="Scene navigation"
      className="fixed left-0 top-0 z-50 hidden h-[78vh] w-[165px] flex-col items-center justify-between px-5 py-10 md:inline-flex"
    >
      {/* Frosted scrim that feathers out on the right/bottom so it blends into
          the scene instead of cutting a hard rectangular edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-black/20 backdrop-blur-[1px]"
        style={{
          WebkitMaskImage:
            "radial-gradient(135% 120% at 0% 38%, #000 55%, transparent 100%)",
          maskImage:
            "radial-gradient(135% 120% at 0% 38%, #000 55%, transparent 100%)",
        }}
      />

      <Seal listing={listing} />

      <ul className="flex w-full flex-col items-start justify-center gap-1.5">
        {railItems.map((scene) => {
          const active = scene.key === activeId;
          return (
            <li
              key={scene.id}
              className="inline-flex items-center justify-start gap-2.5"
            >
              <button
                onClick={() => onNavigate(scene.key)}
                aria-current={active ? "true" : undefined}
                suppressHydrationWarning
                className={`py-2.5 text-left font-sans text-[16px] font-normal uppercase leading-[18px] transition-colors duration-300 ${
                  active ? "text-highlight" : "text-white hover:text-white/70"
                }`}
              >
                {scene.displayLabel}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex w-full flex-col items-center gap-5">
        {logo && (
          <div className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-[10px] bg-white p-1.5">
            <Image src={logo} alt="" width={48} height={48} className="h-full w-full object-contain" />
          </div>
        )}
        <button
          onClick={() => onNavigate("details")}
          aria-current={activeId === "details" ? "true" : undefined}
          className={`w-full border-y border-white bg-black/20 p-2.5 text-center font-sans text-[20px] font-normal uppercase leading-5 transition-colors duration-300 ${
            activeId === "details" ? "text-highlight" : "text-white hover:text-white/70"
          }`}
        >
          Details
        </button>
      </div>
    </nav>
  );
}
