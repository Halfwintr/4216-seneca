"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getJob,
  listRenderTargets,
  startJob,
  type RenderJobStatus,
  type RenderTarget,
} from "@/lib/renders/jobs";

async function requireOwner(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data } = await supabase
    .from("listings")
    .select("id, owner_id")
    .eq("id", listingId)
    .single<{ id: string; owner_id: string }>();
  if (!data || data.owner_id !== user.id) throw new Error("Listing not found");
}

/** Lists the 3D-candidate photos that will be rendered for this listing. */
export async function getRenderTargets(
  listingId: string,
): Promise<{ ok: boolean; error?: string; targets?: RenderTarget[] }> {
  try {
    await requireOwner(listingId);
    const targets = await listRenderTargets(listingId);
    return { ok: true, targets };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

/** Kicks off the local bake pipeline; returns a job id to poll. */
export async function startRenderJob(
  listingId: string,
): Promise<{ ok: boolean; error?: string; jobId?: string }> {
  try {
    await requireOwner(listingId);
    const jobId = startJob(listingId);
    return { ok: true, jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function getRenderJob(jobId: string): Promise<RenderJobStatus | null> {
  return getJob(jobId);
}
