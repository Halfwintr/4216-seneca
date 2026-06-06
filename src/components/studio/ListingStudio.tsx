"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Listing, Moment, Scene } from "@/lib/types";
import type { ListingAsset } from "@/lib/listings";
import { uploadListingPhoto } from "@/lib/supabase/upload";
import {
  saveMomentContent,
  setMomentMode,
  addMomentFromAsset,
  deleteMomentById,
  reorderMoment,
  reorderMoments,
  moveMomentToScene,
  createSection,
  renameSection,
  reorderSection,
  deleteSection,
} from "@/app/actions/studio";
import { PhotoGrid } from "./PhotoGrid";
import { PhotoEditorPanel, type PhotoMode } from "./PhotoEditorPanel";
import { RenderControls } from "./RenderControls";

function modeOf(m: Moment): PhotoMode {
  return m.renderCandidate || m.shotType === "wide" ? "3d" : "detail";
}
function isRendered(m: Moment): boolean {
  return Boolean(m.frameSequencePath);
}

interface ListingStudioProps {
  listing: Listing;
  assets: ListingAsset[];
}

export function ListingStudio({ listing, assets }: ListingStudioProps) {
  const router = useRouter();
  const [scenes, setScenes] = useState<Scene[]>(listing.scenes);
  const [selectedId, setSelectedId] = useState<string | null>(
    listing.scenes[0]?.moments[0]?.id ?? null,
  );
  const [uploadingScene, setUploadingScene] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Re-seed from the server whenever revalidated data arrives (saves, renders).
  useEffect(() => {
    setScenes(listing.scenes);
  }, [listing]);

  const assetByUrl = useMemo(() => {
    const map = new Map<string, ListingAsset>();
    for (const a of assets) map.set(a.publicUrl, a);
    return map;
  }, [assets]);

  const { selectedMoment, selectedScene } = useMemo(() => {
    for (const scene of scenes) {
      const m = scene.moments.find((mm) => mm.id === selectedId);
      if (m) return { selectedMoment: m, selectedScene: scene };
    }
    return { selectedMoment: null, selectedScene: null };
  }, [scenes, selectedId]);

  const candidateCount = useMemo(
    () => scenes.flatMap((s) => s.moments).filter((m) => modeOf(m) === "3d").length,
    [scenes],
  );
  const renderedCount = useMemo(
    () =>
      scenes
        .flatMap((s) => s.moments)
        .filter((m) => modeOf(m) === "3d" && isRendered(m)).length,
    [scenes],
  );

  // ── Local optimistic updaters ──────────────────────────────────────────────

  function patchMoment(momentId: string, patch: Partial<Moment>) {
    setScenes((prev) =>
      prev.map((s) => ({
        ...s,
        moments: s.moments.map((m) =>
          m.id === momentId ? { ...m, ...patch } : m,
        ),
      })),
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveField(
    patch: Partial<
      Pick<Moment, "title" | "subtitle" | "body" | "eyebrow" | "isTitle" | "align">
    >,
  ) {
    if (!selectedMoment?.id) return;
    const id = selectedMoment.id;
    patchMoment(id, patch);
    startSaving(async () => {
      await saveMomentContent({ listingId: listing.id, momentId: id, ...patch });
    });
  }

  function handleChangeMode(mode: PhotoMode) {
    if (!selectedMoment?.id) return;
    const id = selectedMoment.id;
    patchMoment(id, {
      shotType: mode === "3d" ? "wide" : "detail",
      renderCandidate: mode === "3d",
    });
    startSaving(async () => {
      await setMomentMode({ listingId: listing.id, momentId: id, mode });
    });
  }

  function handleDelete() {
    if (!selectedMoment?.id) return;
    const id = selectedMoment.id;
    setScenes((prev) =>
      prev.map((s) => ({
        ...s,
        moments: s.moments.filter((m) => m.id !== id),
      })),
    );
    setSelectedId(null);
    startSaving(async () => {
      await deleteMomentById({ listingId: listing.id, momentId: id });
    });
  }

  function handleReorder(sceneId: string, momentId: string, dir: "up" | "down") {
    setScenes((prev) =>
      prev.map((s) => {
        if (s.id !== sceneId) return s;
        const moments = [...s.moments];
        const idx = moments.findIndex((m) => m.id === momentId);
        const swap = dir === "up" ? idx - 1 : idx + 1;
        if (idx === -1 || swap < 0 || swap >= moments.length) return s;
        [moments[idx], moments[swap]] = [moments[swap], moments[idx]];
        return { ...s, moments };
      }),
    );
    startSaving(async () => {
      await reorderMoment({ listingId: listing.id, sceneId, momentId, dir });
    });
  }

  function handleMovePhoto(
    momentId: string,
    toSceneId: string,
    beforeMomentId: string | null,
  ) {
    const fromScene = scenes.find((s) =>
      s.moments.some((m) => m.id === momentId),
    );
    if (!fromScene) return;
    const moved = fromScene.moments.find((m) => m.id === momentId);
    if (!moved) return;
    // No-op: dropped onto itself.
    if (beforeMomentId === momentId) return;

    const next = scenes.map((s) => ({ ...s, moments: [...s.moments] }));
    const src = next.find((s) => s.id === fromScene.id)!;
    src.moments = src.moments.filter((m) => m.id !== momentId);
    const tgt = next.find((s) => s.id === toSceneId)!;
    let idx = beforeMomentId
      ? tgt.moments.findIndex((m) => m.id === beforeMomentId)
      : tgt.moments.length;
    if (idx < 0) idx = tgt.moments.length;
    tgt.moments.splice(idx, 0, moved);

    setScenes(next);

    const affected =
      fromScene.id === toSceneId ? [tgt] : [src, tgt];
    const updates = affected.flatMap((s) =>
      s.moments
        .filter((m) => m.id)
        .map((m, i) => ({
          momentId: m.id as string,
          sceneId: s.id,
          position: i,
        })),
    );
    startSaving(async () => {
      await reorderMoments({ listingId: listing.id, updates });
    });
  }

  function handleMoveToScene(toSceneId: string) {
    if (!selectedMoment?.id || !selectedScene || toSceneId === selectedScene.id)
      return;
    const id = selectedMoment.id;
    setScenes((prev) => {
      let moved: Moment | undefined;
      const cleared = prev.map((s) => {
        if (s.id !== selectedScene.id) return s;
        moved = s.moments.find((m) => m.id === id);
        return { ...s, moments: s.moments.filter((m) => m.id !== id) };
      });
      if (!moved) return prev;
      return cleared.map((s) =>
        s.id === toSceneId ? { ...s, moments: [...s.moments, moved!] } : s,
      );
    });
    startSaving(async () => {
      await moveMomentToScene({ listingId: listing.id, momentId: id, toSceneId });
    });
  }

  async function handleUpload(sceneId: string, files: FileList) {
    setUploadingScene(sceneId);
    try {
      let firstId: string | undefined;
      for (const file of Array.from(files)) {
        const up = await uploadListingPhoto(listing.id, file);
        const res = await addMomentFromAsset({
          listingId: listing.id,
          sceneId,
          imagePath: up.publicUrl,
          title: "Untitled",
        });
        if (res.ok && res.momentId && !firstId) firstId = res.momentId;
      }
      if (firstId) setSelectedId(firstId);
    } finally {
      setUploadingScene(null);
      router.refresh();
    }
  }

  function handleAddSection() {
    startSaving(async () => {
      const res = await createSection({ listingId: listing.id });
      if (res.ok) router.refresh();
    });
  }

  function handleRenameSection(sceneId: string, label: string) {
    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, label } : s)),
    );
    startSaving(async () => {
      await renameSection({ listingId: listing.id, sceneId, label });
    });
  }

  function handleReorderSection(sceneId: string, dir: "up" | "down") {
    setScenes((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((s) => s.id === sceneId);
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swap < 0 || swap >= arr.length) return prev;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
    startSaving(async () => {
      await reorderSection({ listingId: listing.id, sceneId, dir });
    });
  }

  function handleDeleteSection(sceneId: string) {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    startSaving(async () => {
      await deleteSection({ listingId: listing.id, sceneId });
    });
  }

  const selectedAsset = selectedMoment?.image
    ? assetByUrl.get(selectedMoment.image)
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <RenderControls
        listingId={listing.id}
        candidateCount={candidateCount}
        renderedCount={renderedCount}
        onComplete={() => router.refresh()}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-[44%]">
          <PhotoGrid
            scenes={scenes}
            selectedId={selectedId}
            uploadingScene={uploadingScene}
            modeOf={modeOf}
            isRendered={isRendered}
            onSelect={setSelectedId}
            onReorder={handleReorder}
            onMovePhoto={handleMovePhoto}
            onUpload={handleUpload}
            onAddSection={handleAddSection}
            onRenameSection={handleRenameSection}
            onReorderSection={handleReorderSection}
            onDeleteSection={handleDeleteSection}
          />
        </div>

        <div className="lg:sticky lg:top-24 lg:flex-1 lg:self-start">
          <PhotoEditorPanel
            moment={selectedMoment}
            asset={selectedAsset}
            mode={selectedMoment ? modeOf(selectedMoment) : "detail"}
            saving={saving}
            scenes={scenes.map((s) => ({ id: s.id, label: s.label }))}
            currentSceneId={selectedScene?.id ?? ""}
            onChangeMode={handleChangeMode}
            onSaveField={handleSaveField}
            onMoveToScene={handleMoveToScene}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
