"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { startRenderJob, getRenderJob } from "@/app/actions/renders";
import type { RenderJobStatus } from "@/lib/renders/jobs";

interface RenderControlsProps {
  listingId: string;
  /** Photos currently parked as 3D. */
  candidateCount: number;
  /** 3D photos that already have a baked sequence. */
  renderedCount: number;
  /** Called when a bake job finishes so the parent can refresh server data. */
  onComplete: () => void;
}

export function RenderControls({
  listingId,
  candidateCount,
  renderedCount,
  onComplete,
}: RenderControlsProps) {
  const [job, setJob] = useState<RenderJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function start() {
    setError(null);
    setStarting(true);
    const res = await startRenderJob(listingId);
    setStarting(false);
    if (!res.ok || !res.jobId) {
      setError(res.error ?? "Could not start the render job.");
      return;
    }
    const jobId = res.jobId;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const status = await getRenderJob(jobId);
      if (!status) return;
      setJob(status);
      if (status.state !== "running") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        onComplete();
      }
    }, 2500);
  }

  const running = job?.state === "running" || starting;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-stone-800/80 bg-stone-900/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <Box size={16} className="text-amber-warm-light" />
        <div className="flex flex-col leading-tight">
          <span className="font-sans text-xs text-stone-200">
            3D push-in renders
          </span>
          <span className="font-sans text-[11px] text-stone-500">
            {candidateCount === 0
              ? "No photos parked as 3D yet."
              : `${candidateCount} photo${candidateCount === 1 ? "" : "s"} parked as 3D · ${renderedCount} baked`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {job && (
          <span className="flex items-center gap-1.5 font-sans text-[11px] text-stone-400">
            {job.state === "running" && (
              <>
                <Loader2 size={12} className="animate-spin" />
                {job.current ? `Baking ${job.current}` : "Baking"} ({job.done}/
                {job.total})
              </>
            )}
            {job.state === "done" && (
              <>
                <Sparkles size={12} className="text-emerald-400" /> Renders ready
              </>
            )}
            {job.state === "error" && (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle size={12} /> {job.errors[0] ?? "Render failed"}
              </span>
            )}
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1 font-sans text-[11px] text-amber-400">
            <AlertTriangle size={12} /> {error}
          </span>
        )}
        <button
          type="button"
          onClick={start}
          disabled={running || candidateCount === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-warm/50 px-4 py-1.5 font-sans text-[11px] tracking-[0.1em] text-stone-100 transition-all hover:bg-amber-warm/10 hover:border-amber-warm/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Box size={12} />
          )}
          {running ? "Rendering…" : "Generate 3D"}
        </button>
      </div>
    </div>
  );
}
