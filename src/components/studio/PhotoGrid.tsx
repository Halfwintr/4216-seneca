"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Images,
  Box,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  UploadCloud,
  Loader2,
  Sparkles,
  GripVertical,
} from "lucide-react";
import type { Moment, Scene } from "@/lib/types";
import type { PhotoMode } from "./PhotoEditorPanel";

interface PhotoGridProps {
  scenes: Scene[];
  selectedId: string | null;
  uploadingScene: string | null;
  modeOf: (m: Moment) => PhotoMode;
  isRendered: (m: Moment) => boolean;
  onSelect: (momentId: string) => void;
  onReorder: (sceneId: string, momentId: string, dir: "up" | "down") => void;
  /** Drag-and-drop: place `momentId` in `toSceneId` before `beforeMomentId` (or append when null). */
  onMovePhoto: (
    momentId: string,
    toSceneId: string,
    beforeMomentId: string | null,
  ) => void;
  onUpload: (sceneId: string, files: FileList) => void;
  onAddSection: () => void;
  onRenameSection: (sceneId: string, label: string) => void;
  onReorderSection: (sceneId: string, dir: "up" | "down") => void;
  onDeleteSection: (sceneId: string) => void;
}

function UploadTile({
  sceneId,
  uploading,
  onUpload,
}: {
  sceneId: string;
  uploading: boolean;
  onUpload: (sceneId: string, files: FileList) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      disabled={uploading}
      className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-700 bg-stone-900/30 text-stone-500 transition-colors hover:border-amber-warm/50 hover:text-amber-warm-light disabled:opacity-50"
    >
      {uploading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <UploadCloud size={18} />
      )}
      <span className="font-sans text-[10px] uppercase tracking-[0.12em]">
        {uploading ? "Uploading" : "Add photos"}
      </span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onUpload(sceneId, e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}

export function PhotoGrid({
  scenes,
  selectedId,
  uploadingScene,
  modeOf,
  isRendered,
  onSelect,
  onReorder,
  onMovePhoto,
  onUpload,
  onAddSection,
  onRenameSection,
  onReorderSection,
  onDeleteSection,
}: PhotoGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overSection, setOverSection] = useState<string | null>(null);

  function clearDrag() {
    setDragId(null);
    setOverId(null);
    setOverSection(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {scenes.map((scene, si) => {
        const sectionDropActive =
          overSection === scene.id && dragId !== null && overId === null;
        return (
          <div key={scene.id} className="flex flex-col gap-2.5">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <input
                key={scene.id}
                defaultValue={scene.label}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== scene.label) onRenameSection(scene.id, v);
                }}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-stone-300 hover:border-stone-800 focus:border-amber-warm/50 focus:outline-none"
              />
              <span className="shrink-0 font-sans text-[10px] text-stone-600">
                {scene.moments.length}
              </span>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onReorderSection(scene.id, "up")}
                  disabled={si === 0}
                  aria-label="Move section up"
                  className="rounded p-1 text-stone-500 hover:text-stone-200 disabled:opacity-30"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onReorderSection(scene.id, "down")}
                  disabled={si === scenes.length - 1}
                  aria-label="Move section down"
                  className="rounded p-1 text-stone-500 hover:text-stone-200 disabled:opacity-30"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSection(scene.id)}
                  aria-label="Delete section"
                  className="rounded p-1 text-stone-600 hover:text-red-300"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Photo cards — the grid is also a drop zone (append to section). */}
            <div
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverSection(scene.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target && overSection === scene.id)
                  setOverSection(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) onMovePhoto(dragId, scene.id, null);
                clearDrag();
              }}
              className={`grid grid-cols-2 gap-2.5 rounded-md sm:grid-cols-3 ${
                sectionDropActive ? "ring-1 ring-amber-warm/50" : ""
              }`}
            >
              {scene.moments.map((m, mi) => {
                const mode = modeOf(m);
                const active = m.id === selectedId;
                const dragging = m.id === dragId;
                const dropBefore = m.id === overId && dragId && dragId !== m.id;
                return (
                  <div
                    key={m.id}
                    draggable={Boolean(m.id)}
                    onDragStart={(e) => {
                      if (!m.id) return;
                      setDragId(m.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", m.id);
                    }}
                    onDragEnd={clearDrag}
                    onDragOver={(e) => {
                      if (!dragId || dragId === m.id) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setOverId(m.id ?? null);
                      setOverSection(null);
                    }}
                    onDragLeave={() => {
                      if (overId === m.id) setOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragId && dragId !== m.id && m.id)
                        onMovePhoto(dragId, scene.id, m.id);
                      clearDrag();
                    }}
                    className={`group relative transition-opacity ${
                      dragging ? "opacity-40" : ""
                    }`}
                  >
                    {/* Insertion indicator */}
                    {dropBefore && (
                      <span className="absolute -left-1.5 top-0 h-[calc(100%-1.25rem)] w-0.5 rounded bg-amber-warm" />
                    )}
                    <button
                      type="button"
                      onClick={() => m.id && onSelect(m.id)}
                      className={`relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-stone-900 ring-2 transition-all ${
                        active
                          ? "ring-amber-warm"
                          : "ring-transparent hover:ring-stone-700"
                      }`}
                    >
                      {m.image && (
                        <Image
                          src={m.image}
                          alt={m.title || ""}
                          fill
                          sizes="200px"
                          draggable={false}
                          className="object-cover"
                        />
                      )}
                      {/* Drag affordance */}
                      <span className="absolute right-1 top-1 rounded bg-black/45 p-0.5 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100">
                        <GripVertical size={11} />
                      </span>
                      {/* Mode badge */}
                      <span
                        className={`absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${
                          mode === "3d"
                            ? "bg-amber-warm/90 text-stone-950"
                            : "bg-black/55 text-stone-200"
                        }`}
                      >
                        {mode === "3d" ? <Box size={9} /> : <Images size={9} />}
                        {mode === "3d" ? "3D" : "Detail"}
                      </span>
                      {mode === "3d" && isRendered(m) && (
                        <span
                          title="3D sequence baked"
                          className="absolute bottom-1.5 right-1.5 inline-flex items-center rounded bg-emerald-500/90 px-1 py-0.5 text-stone-950"
                        >
                          <Sparkles size={9} />
                        </span>
                      )}
                      {/* Reorder controls */}
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.id) onReorder(scene.id, m.id, "up");
                          }}
                          aria-label="Move left"
                          className={`rounded p-0.5 text-stone-300 hover:text-white ${
                            mi === 0 ? "pointer-events-none opacity-30" : ""
                          }`}
                        >
                          <ChevronUp size={13} className="-rotate-90" />
                        </span>
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.id) onReorder(scene.id, m.id, "down");
                          }}
                          aria-label="Move right"
                          className={`rounded p-0.5 text-stone-300 hover:text-white ${
                            mi === scene.moments.length - 1
                              ? "pointer-events-none opacity-30"
                              : ""
                          }`}
                        >
                          <ChevronDown size={13} className="-rotate-90" />
                        </span>
                      </span>
                    </button>
                    <p className="mt-1 truncate font-sans text-[11px] text-stone-400">
                      {m.title || "Untitled"}
                    </p>
                  </div>
                );
              })}

              <UploadTile
                sceneId={scene.id}
                uploading={uploadingScene === scene.id}
                onUpload={onUpload}
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddSection}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-stone-800 px-4 py-1.5 font-sans text-[11px] tracking-[0.08em] text-stone-400 transition-colors hover:border-stone-600 hover:text-stone-200"
      >
        <Plus size={13} /> Add section
      </button>
    </div>
  );
}
