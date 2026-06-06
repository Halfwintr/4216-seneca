"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Images, Box, Trash2, Check, Loader2, AlertTriangle } from "lucide-react";
import type { Moment } from "@/lib/types";
import type { ListingAsset } from "@/lib/listings";

export type PhotoMode = "detail" | "3d";

const inputClass =
  "w-full rounded-md border border-stone-800 bg-stone-900/40 px-3 py-2 font-sans text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-warm/60 transition-colors";
const labelClass = "text-[10px] uppercase tracking-[0.18em] text-stone-500";

interface PhotoEditorPanelProps {
  moment: Moment | null;
  asset?: ListingAsset;
  mode: PhotoMode;
  saving: boolean;
  scenes: { id: string; label: string }[];
  currentSceneId: string;
  onChangeMode: (mode: PhotoMode) => void;
  onSaveField: (
    patch: Partial<
      Pick<Moment, "title" | "subtitle" | "body" | "eyebrow" | "isTitle" | "align">
    >,
  ) => void;
  onMoveToScene: (sceneId: string) => void;
  onDelete: () => void;
}

export function PhotoEditorPanel({
  moment,
  asset,
  mode,
  saving,
  scenes,
  currentSceneId,
  onChangeMode,
  onSaveField,
  onMoveToScene,
  onDelete,
}: PhotoEditorPanelProps) {
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");

  // Re-seed the local fields whenever a different photo is selected.
  useEffect(() => {
    setTitle(moment?.title ?? "");
    setEyebrow(moment?.eyebrow ?? "");
    setSubtitle(moment?.subtitle ?? "");
    setBody(moment?.body ?? "");
  }, [moment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!moment) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-stone-800 bg-stone-900/20 p-10 text-center">
        <Images size={28} className="text-stone-600" />
        <p className="mt-3 font-sans text-sm text-stone-500">
          Select a photo to edit its story and role.
        </p>
      </div>
    );
  }

  const is3d = mode === "3d";
  const rendered = Boolean(moment.frameSequencePath);
  const missingSource = is3d && !asset;

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-stone-800/80 bg-stone-900/20 p-5">
      {/* Large preview */}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-stone-950">
        {moment.image ? (
          <Image
            src={moment.image}
            alt={moment.title || ""}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-600">
            <Images size={28} />
          </div>
        )}
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          {saving ? (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-stone-300">
              <Loader2 size={11} className="animate-spin" /> Saving
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-stone-400">
              <Check size={11} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Role</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeMode("detail")}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 font-sans text-xs transition-colors ${
              !is3d
                ? "border-amber-warm/70 bg-amber-warm/10 text-amber-warm-light"
                : "border-stone-800 text-stone-400 hover:border-stone-600 hover:text-stone-200"
            }`}
          >
            <Images size={14} /> Detail shot
          </button>
          <button
            type="button"
            onClick={() => onChangeMode("3d")}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 font-sans text-xs transition-colors ${
              is3d
                ? "border-amber-warm/70 bg-amber-warm/10 text-amber-warm-light"
                : "border-stone-800 text-stone-400 hover:border-stone-600 hover:text-stone-200"
            }`}
          >
            <Box size={14} /> 3D photo
          </button>
        </div>
        <p className="font-sans text-[11px] leading-relaxed text-stone-500">
          {is3d ? (
            <>
              Reserved for the cinematic push-in. It will be turned into a splat
              and baked into a dolly sequence.{" "}
              {rendered ? (
                <span className="text-emerald-400/90">3D sequence ready.</span>
              ) : missingSource ? (
                <span className="inline-flex items-center gap-1 text-amber-400/90">
                  <AlertTriangle size={11} /> No uploaded source to render from.
                </span>
              ) : (
                <span className="text-stone-400">
                  Not yet rendered — run a 3D bake.
                </span>
              )}
            </>
          ) : (
            <>Shows in the photo carousel and expands in the lightbox.</>
          )}
        </p>
      </div>

      {/* Section assignment */}
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Section</span>
        <select
          value={currentSceneId}
          onChange={(e) => onMoveToScene(e.target.value)}
          className={inputClass}
        >
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {/* Content fields */}
      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 flex flex-col gap-1.5">
          <span className={labelClass}>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => onSaveField({ title: e.currentTarget.value })}
            placeholder="e.g. The approach"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Eyebrow</span>
          <input
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            onBlur={(e) => onSaveField({ eyebrow: e.currentTarget.value })}
            placeholder="01"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Subtitle (title cards)</span>
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onBlur={(e) => onSaveField({ subtitle: e.currentTarget.value })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Description</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={(e) => onSaveField({ body: e.currentTarget.value })}
          rows={3}
          placeholder="The story for this photo…"
          className={`${inputClass} resize-none`}
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(moment.isTitle)}
            onChange={(e) => onSaveField({ isTitle: e.target.checked })}
            className="accent-amber-warm"
          />
          <span className={labelClass}>Section title card</span>
        </label>

        <label className="flex items-center gap-2">
          <span className={labelClass}>Align</span>
          <select
            value={moment.align ?? "left"}
            onChange={(e) =>
              onSaveField({ align: e.target.value as Moment["align"] })
            }
            className="rounded-md border border-stone-800 bg-stone-900/40 px-2 py-1.5 font-sans text-xs text-stone-200 focus:border-amber-warm/60 focus:outline-none"
          >
            <option value="left">left</option>
            <option value="center">center</option>
            <option value="right">right</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-red-500/40 px-4 py-1.5 font-sans text-[11px] tracking-[0.08em] text-red-300/90 transition-colors hover:border-red-500/70 hover:bg-red-500/10"
      >
        <Trash2 size={13} /> Delete photo
      </button>
    </div>
  );
}
