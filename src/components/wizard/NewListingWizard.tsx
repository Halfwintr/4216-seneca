"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Star,
  X,
  UploadCloud,
  Box,
  Check,
  Pencil,
  Wand2,
  Layers,
  ChevronDown,
  MapPin,
  Loader2,
  Boxes,
} from "lucide-react";
import {
  createDraftListing,
  saveBasics,
  saveDetails,
  analyzePhotoBatch,
  finalizePhotoGroups,
  updatePhotoClassification,
  buildGuidedQuestionnaire,
  saveGuidedAnswers,
  generateListingContent,
  lookupAddress,
  type BasicsInput,
  type DetailsInput,
  type AnalyzedPhotoCard,
  type AddressSuggestion,
} from "@/app/actions/wizard";
import {
  uploadListingPhoto,
  setHeroAsset,
  removeAsset,
  type UploadedPhoto,
} from "@/lib/supabase/upload";
import {
  getRenderTargets,
  startRenderJob,
  getRenderJob,
} from "@/app/actions/renders";
import type { RenderTarget, RenderJobStatus } from "@/lib/renders/jobs";
import type { GuidedAnswer } from "@/lib/types";
import { CHAPTER_ORDER, chaptersFor } from "@/lib/chapters";

const STEPS = ["Basics", "Details", "Photos", "Review", "Generate", "Renders"];

const LISTING_TYPES = [
  "Residential",
  "Condominium",
  "Townhouse",
  "Multi-Family",
  "Land",
  "Commercial",
  "Farm / Ranch",
];

const OCCUPANCIES = ["Owner occupied", "Tenant occupied", "Vacant"];

const US_STATES: Array<[string, string]> = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const inputClass =
  "w-full rounded-md border border-stone-800 bg-stone-900/40 px-3 py-2 font-sans text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-warm/60 transition-colors";
const labelClass = "text-[10px] uppercase tracking-[0.18em] text-stone-500";

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-none`}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} appearance-none pr-9 ${value ? "" : "text-stone-600"}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-stone-100">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
        />
      </div>
    </label>
  );
}

function AddressAutocomplete({
  value,
  onText,
  onPick,
}: {
  value: string;
  onText: (v: string) => void;
  onPick: (s: AddressSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const justPicked = useRef(false);

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    const t = setTimeout(async () => {
      if (q.length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const r = await lookupAddress(q);
        setSuggestions(r);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <label className="relative flex flex-col gap-1.5">
      <span className={labelClass}>Address — start typing to search</span>
      <div className="relative">
        <MapPin
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"
        />
        <input
          type="text"
          value={value}
          placeholder="24 Albany Post Rd, Balmville, NY"
          onChange={(e) => {
            onText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`${inputClass} pl-9 pr-9`}
          autoComplete="off"
        />
        {loading && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-500"
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border border-stone-700 bg-stone-900 shadow-xl">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  justPicked.current = true;
                  onPick(s);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-stone-800"
              >
                <MapPin size={13} className="mt-0.5 shrink-0 text-stone-500" />
                <span className="font-sans text-xs leading-snug text-stone-300">
                  {s.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

function AnalyzeProgress({
  progress,
  grouping,
  fallbackTotal,
}: {
  progress: { current: number; total: number } | null;
  grouping: boolean;
  fallbackTotal: number;
}) {
  const total = progress?.total || fallbackTotal || 1;
  const current = grouping ? total : progress?.current ?? 0;
  const pct = Math.max(6, Math.round((current / total) * 100));

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-center gap-2 font-sans text-sm text-stone-300">
        <Loader2 size={16} className="animate-spin text-amber-warm" />
        {grouping
          ? "Grouping & ordering your photos…"
          : `Analyzing ${Math.min(current, total)} of ${total} photo${total === 1 ? "" : "s"}…`}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
        <div
          className="h-full rounded-full bg-amber-warm transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-sans text-[11px] text-stone-600">
        Reading each photo with AI — describing the room, classifying wide vs.
        detail shots, and flagging 3D-render candidates.
      </p>
    </div>
  );
}

export function NewListingWizard() {
  const [step, setStep] = useState(0);
  const [listingId, setListingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [basics, setBasics] = useState<BasicsInput>({ listingType: "Residential" });
  const [details, setDetails] = useState<DetailsInput>({});
  const [featuresText, setFeaturesText] = useState("");

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedPhotoCard[] | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [grouping, setGrouping] = useState(false);

  const [building, setBuilding] = useState(false);
  const [guided, setGuided] = useState<GuidedAnswer[]>([]);
  const [qIndex, setQIndex] = useState(0);

  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const [renderTargets, setRenderTargets] = useState<RenderTarget[] | null>(null);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderJob, setRenderJob] = useState<RenderJobStatus | null>(null);
  const [renderStarting, setRenderStarting] = useState(false);

  const setBasic = (k: keyof BasicsInput, v: string) =>
    setBasics((b) => ({ ...b, [k]: v }));
  const setDetail = (k: keyof DetailsInput, v: string) =>
    setDetails((d) => ({ ...d, [k]: v }));

  const onPickAddress = (s: AddressSuggestion) =>
    setBasics((b) => ({
      ...b,
      addressLine: s.addressLine || b.addressLine,
      city: s.city || b.city,
      state: s.state || b.state,
      postalCode: s.postalCode || b.postalCode,
      neighborhood: b.neighborhood || s.neighborhood,
    }));

  // Photos regrouped for display: by group order, then sort order within group.
  const grouped = useMemo(() => {
    if (!analyzed) return [];
    const map = new Map<string, { label: string; order: number; items: AnalyzedPhotoCard[] }>();
    for (const c of analyzed) {
      if (!map.has(c.groupKey)) {
        map.set(c.groupKey, { label: c.groupLabel, order: c.groupOrder, items: [] });
      }
      map.get(c.groupKey)!.items.push(c);
    }
    return [...map.values()]
      .sort((a, b) => a.order - b.order)
      .map((g) => ({
        ...g,
        items: g.items.sort((a, b) => a.sortOrder - b.sortOrder),
      }));
  }, [analyzed]);

  // Canonical chapters (neighborhood relabeled) plus any custom chapter the AI
  // coined for this listing — the options available when reassigning a photo.
  const groupOptions = useMemo(() => {
    const base = chaptersFor(basics.neighborhood).map((c) => ({ key: c.key, label: c.label }));
    const seen = new Set(base.map((b) => b.key));
    if (analyzed) {
      for (const c of analyzed) {
        if (!seen.has(c.groupKey)) {
          seen.add(c.groupKey);
          base.push({ key: c.groupKey, label: c.groupLabel });
        }
      }
    }
    return base;
  }, [basics.neighborhood, analyzed]);

  function patchCard(assetId: string, patch: Partial<AnalyzedPhotoCard>) {
    setAnalyzed((a) => (a ? a.map((c) => (c.assetId === assetId ? { ...c, ...patch } : c)) : a));
  }

  async function toggleShot(card: AnalyzedPhotoCard) {
    if (!listingId) return;
    const shotType = card.shotType === "wide" ? "detail" : "wide";
    patchCard(card.assetId, { shotType });
    await updatePhotoClassification(listingId, card.assetId, { shotType });
  }

  async function toggle3d(card: AnalyzedPhotoCard) {
    if (!listingId) return;
    const renderCandidate = !card.renderCandidate;
    patchCard(card.assetId, { renderCandidate });
    await updatePhotoClassification(listingId, card.assetId, { renderCandidate });
  }

  async function moveToGroup(card: AnalyzedPhotoCard, key: string) {
    if (!listingId || !analyzed) return;

    if (key === "__new__") {
      const label = window.prompt("New chapter name (e.g. The Pool House)")?.trim();
      if (!label) return;
      const existing = new Set(analyzed.map((c) => c.groupKey));
      let newKey =
        label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "chapter";
      while (existing.has(newKey)) newKey = `${newKey}-2`;
      const order = analyzed.reduce((m, c) => Math.max(m, c.groupOrder), 0) + 1;
      const patch = { groupKey: newKey, groupLabel: label, groupOrder: order, sortOrder: 0 };
      patchCard(card.assetId, patch);
      await updatePhotoClassification(listingId, card.assetId, patch);
      return;
    }

    const target = groupOptions.find((g) => g.key === key);
    if (!target || target.key === card.groupKey) return;
    const inGroup = analyzed.filter((c) => c.groupKey === target.key);
    const order =
      target.key in CHAPTER_ORDER
        ? CHAPTER_ORDER[target.key]
        : inGroup[0]?.groupOrder ?? analyzed.reduce((m, c) => Math.max(m, c.groupOrder), 0) + 1;
    const maxSort = inGroup.reduce((m, c) => Math.max(m, c.sortOrder), -1);
    const patch = {
      groupKey: target.key,
      groupLabel: target.label,
      groupOrder: order,
      sortOrder: maxSort + 1,
    };
    patchCard(card.assetId, patch);
    await updatePhotoClassification(listingId, card.assetId, patch);
  }

  async function handleNext() {
    setError(null);
    try {
      if (step === 0) {
        if (!basics.addressLine?.trim()) {
          setError("A street address is required.");
          return;
        }
        if (!listingId) {
          const { id } = await createDraftListing(basics);
          setListingId(id);
        } else {
          await saveBasics(listingId, basics);
        }
      } else if (step === 1 && listingId) {
        await saveDetails(listingId, {
          ...details,
          features: featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
        });
      } else if (step === 2) {
        if (photos.length === 0) {
          setError("Upload at least one photo.");
          return;
        }
        if (!analyzed) {
          setError("Analyze your photos with AI before continuing.");
          return;
        }
        // Build (or rebuild) the pre-answered questionnaire from the analysis.
        await runBuildQuestionnaire();
        return; // runBuildQuestionnaire advances on success
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !listingId) return;
    setError(null);
    setUploading(true);
    setAnalyzed(null); // new photos invalidate prior analysis
    try {
      for (const file of Array.from(files)) {
        const isHero = photos.length === 0;
        const uploaded = await uploadListingPhoto(listingId, file, isHero);
        setPhotos((p) => [...p, uploaded]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function makeHero(assetId: string) {
    if (!listingId) return;
    await setHeroAsset(listingId, assetId);
    setPhotos((p) => p.map((x) => ({ ...x, isHero: x.assetId === assetId })));
  }

  async function deletePhoto(assetId: string) {
    await removeAsset(assetId);
    setPhotos((p) => p.filter((x) => x.assetId !== assetId));
    setAnalyzed((a) => (a ? a.filter((x) => x.assetId !== assetId) : a));
  }

  const BATCH_SIZE = 4;

  async function runAnalyze() {
    if (!listingId) return;
    setError(null);
    setAnalyzed(null);
    setAnalyzing(true);
    setGrouping(false);
    setProgress({ current: 0, total: photos.length });
    try {
      let offset = 0;
      let total = photos.length;
      let done = false;
      // Analyze in small batches so requests stay small and progress is visible.
      while (!done) {
        const res = await analyzePhotoBatch(listingId, offset, BATCH_SIZE);
        if (!res.ok) {
          setError(res.error ?? "Photo analysis failed.");
          setAnalyzing(false);
          setProgress(null);
          return;
        }
        total = res.total;
        offset = Math.min(offset + BATCH_SIZE, total);
        setProgress({ current: offset, total });
        if (offset >= total) done = true;
      }

      // Final, single grouping pass over everything.
      setGrouping(true);
      const fin = await finalizePhotoGroups(listingId);
      if (fin.ok && fin.photos) setAnalyzed(fin.photos);
      else setError(fin.error ?? "Could not group photos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo analysis failed.");
    } finally {
      setAnalyzing(false);
      setGrouping(false);
      setProgress(null);
    }
  }

  async function runBuildQuestionnaire() {
    if (!listingId) return;
    setBuilding(true);
    const res = await buildGuidedQuestionnaire(listingId);
    setBuilding(false);
    if (res.ok && res.answers) {
      setGuided(res.answers);
      setQIndex(0);
      setStep(3);
    } else {
      setError(res.error ?? "Could not build the questionnaire.");
    }
  }

  function setAnswer(id: string, value: string) {
    setGuided((g) => g.map((q) => (q.id === id ? { ...q, answer: value } : q)));
  }

  async function approveAndAdvance() {
    setGuided((g) =>
      g.map((q, i) => (i === qIndex ? { ...q, approved: true } : q)),
    );
    if (qIndex < guided.length - 1) {
      setQIndex((i) => i + 1);
    } else if (listingId) {
      // Last question — persist and move to Generate.
      const finalized = guided.map((q, i) =>
        i === qIndex ? { ...q, approved: true } : q,
      );
      await saveGuidedAnswers(listingId, finalized);
      setStep(4);
    }
  }

  function handleGenerate() {
    if (!listingId) return;
    setError(null);
    setGenerating(true);
    startTransition(async () => {
      const res = await generateListingContent(listingId);
      setGenerating(false);
      if (res.ok) setDone(true);
      else setError(res.error ?? "Generation failed.");
    });
  }

  // Load the 3D-render candidates when entering the Renders step.
  useEffect(() => {
    if (step !== 5 || !listingId || renderTargets !== null) return;
    getRenderTargets(listingId).then((r) => {
      if (r.ok && r.targets) setRenderTargets(r.targets);
      else if (r.error) setError(r.error);
    });
  }, [step, listingId, renderTargets]);

  // Poll the bake job while it runs.
  useEffect(() => {
    if (!renderJobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const s = await getRenderJob(renderJobId);
      if (!active) return;
      if (s) setRenderJob(s);
      if (!s || s.state === "running") timer = setTimeout(tick, 4000);
    };
    timer = setTimeout(tick, 1500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [renderJobId]);

  async function startRenders() {
    if (!listingId) return;
    setError(null);
    setRenderStarting(true);
    const r = await startRenderJob(listingId);
    setRenderStarting(false);
    if (r.ok && r.jobId) {
      setRenderJob({
        id: r.jobId,
        listingId,
        state: "running",
        total: renderTargets?.length ?? 0,
        done: 0,
        current: null,
        errors: [],
      });
      setRenderJobId(r.jobId);
    } else {
      setError(r.error ?? "Could not start 3D renders.");
    }
  }

  const renderDone = renderJob?.state === "done";
  const renderFailed = renderJob?.state === "error";
  const rendering = renderJob?.state === "running";

  const currentQ = guided[qIndex];

  return (
    <div className="flex flex-col gap-8">
      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((label, i) => {
          const active = i === step;
          const complete = i < step;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  active
                    ? "bg-amber-warm text-stone-950"
                    : complete
                      ? "bg-amber-warm/20 text-amber-warm-light"
                      : "border border-stone-700 text-stone-500"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-[11px] uppercase tracking-[0.14em] ${
                  active ? "text-stone-100" : "text-stone-500"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-stone-800" />}
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border border-stone-800/80 bg-stone-900/20 p-6">
        {/* Step 0 — Basics */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-serif font-light italic text-stone-100 text-xl">The basics</h2>

            <AddressAutocomplete
              value={basics.addressLine ?? ""}
              onText={(v) => setBasic("addressLine", v)}
              onPick={onPickAddress}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="City" value={basics.city ?? ""} onChange={(v) => setBasic("city", v)} />
              <Select
                label="State"
                value={basics.state ?? ""}
                onChange={(v) => setBasic("state", v)}
                placeholder="State"
                options={US_STATES.map(([abbr, name]) => ({ value: abbr, label: name }))}
              />
              <Field label="Postal code" value={basics.postalCode ?? ""} onChange={(v) => setBasic("postalCode", v)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Listing type"
                value={basics.listingType ?? ""}
                onChange={(v) => setBasic("listingType", v)}
                options={LISTING_TYPES.map((t) => ({ value: t, label: t }))}
              />
              <Select
                label="Occupancy"
                value={basics.occupancy ?? ""}
                onChange={(v) => setBasic("occupancy", v)}
                options={OCCUPANCIES.map((t) => ({ value: t, label: t }))}
              />
              <Field label="Neighborhood" value={basics.neighborhood ?? ""} onChange={(v) => setBasic("neighborhood", v)} placeholder="Saint Elmo" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Agent name" value={basics.agentName ?? ""} onChange={(v) => setBasic("agentName", v)} />
              <Field label="Brokerage" value={basics.brokerage ?? ""} onChange={(v) => setBasic("brokerage", v)} />
              <Field label="Phone" value={basics.phone ?? ""} onChange={(v) => setBasic("phone", v)} />
              <Field label="SMS" value={basics.sms ?? ""} onChange={(v) => setBasic("sms", v)} />
              <Field label="Email" value={basics.email ?? ""} onChange={(v) => setBasic("email", v)} />
              <Field label="MLS #" value={basics.mls ?? ""} onChange={(v) => setBasic("mls", v)} />
            </div>
          </div>
        )}

        {/* Step 1 — Details */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-serif font-light italic text-stone-100 text-xl">Property details</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Field label="Beds" value={details.beds ?? ""} onChange={(v) => setDetail("beds", v)} />
              <Field label="Baths" value={details.baths ?? ""} onChange={(v) => setDetail("baths", v)} />
              <Field label="Sq Ft" value={details.sqft ?? ""} onChange={(v) => setDetail("sqft", v)} />
              <Field label="Year built" value={details.yearBuilt ?? ""} onChange={(v) => setDetail("yearBuilt", v)} />
              <Field label="Lot size" value={details.lotSize ?? ""} onChange={(v) => setDetail("lotSize", v)} />
            </div>
            <Area label="Features (one per line)" value={featuresText} onChange={setFeaturesText} rows={5} placeholder={"Original hardwood floors\n10-foot ceilings\nGas fireplace"} />
          </div>
        )}

        {/* Step 2 — Photos */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <h2 className="font-serif font-light italic text-stone-100 text-xl">Photos</h2>
            <p className="font-sans text-sm text-stone-500">
              Upload all of your listing photos at once. AI will describe each one,
              detect the room, group them by space, and flag wide shots that could
              become 3D renders versus detail shots for the carousel.
            </p>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-700 py-10 text-stone-400 transition-colors hover:border-amber-warm/50 hover:text-stone-200">
              <UploadCloud size={24} strokeWidth={1.5} />
              <span className="font-sans text-sm">
                {uploading ? "Uploading…" : "Click to upload photos"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>

            {/* Raw uploads (pre-analysis) */}
            {photos.length > 0 && !analyzed && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {photos.map((p) => (
                    <div key={p.assetId} className="group relative aspect-[4/3] overflow-hidden rounded-md bg-stone-900">
                      <Image src={p.publicUrl} alt="" fill sizes="200px" className="object-cover" />
                      {p.isHero && (
                        <span className="absolute left-1.5 top-1.5 rounded bg-amber-warm/90 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-stone-950">
                          Hero
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={() => makeHero(p.assetId)} className="flex items-center gap-1 text-[10px] text-stone-200 hover:text-amber-warm-light">
                          <Star size={12} /> Hero
                        </button>
                        <button type="button" onClick={() => deletePhoto(p.assetId)} className="flex items-center gap-1 text-[10px] text-stone-300 hover:text-red-300">
                          <X size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {analyzing ? (
                  <AnalyzeProgress
                    progress={progress}
                    grouping={grouping}
                    fallbackTotal={photos.length}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={runAnalyze}
                    disabled={uploading}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-warm/60 px-6 py-2.5 font-sans text-sm tracking-[0.1em] text-stone-100 transition-all hover:bg-amber-warm/10 disabled:opacity-50"
                  >
                    <Wand2 size={16} />
                    Analyze photos with AI
                  </button>
                )}
              </>
            )}

            {/* Analyzed + grouped */}
            {analyzed && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-sans text-sm text-amber-warm-light">
                    <Check size={15} /> Analyzed into {grouped.length} group
                    {grouped.length === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    onClick={runAnalyze}
                    disabled={analyzing}
                    className="font-sans text-xs text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline disabled:opacity-50"
                  >
                    {analyzing ? "Re-analyzing…" : "Re-analyze"}
                  </button>
                </div>

                {grouped.map((g) => (
                  <div key={g.label} className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-stone-500" />
                      <h3 className="font-sans text-xs uppercase tracking-[0.16em] text-stone-300">
                        {g.label}
                      </h3>
                      <span className="text-[10px] text-stone-600">
                        {g.items.length} photo{g.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {g.items.map((c) => (
                        <div key={c.assetId} className="flex flex-col gap-1.5">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-stone-900">
                            <Image src={c.url} alt={c.roomType} fill sizes="200px" className="object-cover" />
                            <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => toggleShot(c)}
                                title="Toggle wide / detail"
                                className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide transition-colors ${
                                  c.shotType === "wide"
                                    ? "bg-sky-500/80 text-stone-950 hover:bg-sky-400"
                                    : "bg-stone-700/90 text-stone-200 hover:bg-stone-600"
                                }`}
                              >
                                {c.shotType === "wide" ? "Wide" : "Detail"}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggle3d(c)}
                                title="Toggle 3D-render candidate"
                                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide transition-colors ${
                                  c.renderCandidate
                                    ? "bg-amber-warm/90 text-stone-950 hover:bg-amber-warm"
                                    : "border border-stone-600/80 bg-black/40 text-stone-400 hover:text-stone-200"
                                }`}
                              >
                                <Box size={9} /> 3D
                              </button>
                            </div>
                          </div>
                          <p className="font-sans text-[11px] leading-tight text-stone-400">
                            <span className="text-stone-200">{c.roomType}</span>
                            {c.caption ? ` — ${c.caption}` : ""}
                          </p>
                          <div className="relative">
                            <select
                              value={c.groupKey}
                              onChange={(e) => moveToGroup(c, e.target.value)}
                              title="Move to a different room / space"
                              className="w-full appearance-none rounded border border-stone-800 bg-stone-900/60 py-1 pl-2 pr-6 font-sans text-[10px] text-stone-300 focus:border-amber-warm/60 focus:outline-none"
                            >
                              {groupOptions.map((o) => (
                                <option key={o.key} value={o.key}>
                                  {o.label}
                                </option>
                              ))}
                              <option value="__new__">＋ New chapter…</option>
                            </select>
                            <ChevronDown
                              size={12}
                              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Review (pre-answered questionnaire) */}
        {step === 3 && currentQ && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-light italic text-stone-100 text-xl">
                Review the story details
              </h2>
              <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-stone-500">
                {qIndex + 1} / {guided.length}
              </span>
            </div>
            <p className="font-sans text-sm text-stone-500">
              We pre-answered these from your photos. Agree to move on, or edit any
              answer to make it yours.
            </p>

            {/* progress bar */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-stone-800">
              <div
                className="h-full rounded-full bg-amber-warm transition-all"
                style={{ width: `${((qIndex + 1) / guided.length) * 100}%` }}
              />
            </div>

            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-5">
              <p className="mb-3 font-serif text-lg font-light text-stone-100">
                {currentQ.question}
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-amber-warm-light/80">
                  <Sparkles size={11} /> AI suggested answer
                </span>
                <textarea
                  value={currentQ.answer}
                  rows={4}
                  onChange={(e) => setAnswer(currentQ.id, e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </label>
              <p className="mt-2 flex items-center gap-1.5 font-sans text-[11px] text-stone-600">
                <Pencil size={11} /> Edit the text above if anything is off, then continue.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (qIndex === 0) setStep(2);
                  else setQIndex((i) => i - 1);
                }}
                className="rounded-full border border-stone-800 px-5 py-2 font-sans text-xs tracking-[0.1em] text-stone-400 transition-colors hover:border-stone-600"
              >
                Back
              </button>
              <button
                type="button"
                onClick={approveAndAdvance}
                className="inline-flex items-center gap-2 rounded-full border border-amber-warm/60 px-6 py-2 font-sans text-xs tracking-[0.12em] text-stone-100 transition-all hover:bg-amber-warm/10"
              >
                <Check size={15} />
                {qIndex < guided.length - 1 ? "Looks good — next" : "Looks good — finish"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Generate */}
        {step === 4 && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            {!done ? (
              <>
                <Sparkles size={28} strokeWidth={1.5} className="text-amber-warm" />
                <h2 className="font-serif font-light italic text-stone-100 text-2xl">
                  Generate your property story
                </h2>
                <p className="max-w-md font-sans text-sm text-stone-500">
                  We&rsquo;ll weave your confirmed answers and {photos.length} grouped
                  photo{photos.length === 1 ? "" : "s"} into scenes, narrative copy,
                  captions, and SEO — with images placed in order, by space. You can
                  edit everything afterward.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || pending}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-warm/60 px-7 py-3 font-sans text-sm tracking-[0.12em] text-stone-100 transition-all hover:bg-amber-warm/10 disabled:opacity-50"
                >
                  {generating ? "Generating your story…" : "Generate with AI"}
                </button>
              </>
            ) : (
              <>
                <Sparkles size={28} strokeWidth={1.5} className="text-amber-warm" />
                <h2 className="font-serif font-light italic text-stone-100 text-2xl">
                  Your story is ready.
                </h2>
                <p className="max-w-md font-sans text-sm text-stone-500">
                  Scenes, narrative, captions, and SEO have been generated and your
                  photos placed in order by space. Next, turn your wide-angle shots
                  into cinematic 3D zoom-ins.
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-warm/60 px-7 py-3 font-sans text-sm tracking-[0.12em] text-stone-100 transition-all hover:bg-amber-warm/10"
                  >
                    <Boxes size={16} /> Add 3D renders
                  </button>
                  <Link
                    href={`/dashboard/listings/${listingId}`}
                    className="font-sans text-xs tracking-[0.1em] text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline"
                  >
                    Skip to editor
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5 — 3D Renders */}
        {step === 5 && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <Boxes size={20} className="text-amber-warm" />
              <h2 className="font-serif font-light italic text-stone-100 text-xl">
                3D renders
              </h2>
            </div>

            {renderDone ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <Check size={26} className="text-amber-warm" />
                <h3 className="font-serif font-light italic text-stone-100 text-xl">
                  Renders complete.
                </h3>
                <p className="max-w-md font-sans text-sm text-stone-500">
                  {renderJob && renderJob.total - renderJob.errors.length > 0
                    ? `${renderJob.total - renderJob.errors.length} scene${
                        renderJob.total - renderJob.errors.length === 1 ? "" : "s"
                      } now zoom in 3D. `
                    : ""}
                  Open the editor to review and publish.
                </p>
                {renderJob && renderJob.errors.length > 0 && (
                  <ul className="max-w-md text-left font-sans text-[11px] text-red-400/70">
                    {renderJob.errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/dashboard/listings/${listingId}`}
                  className="mt-1 inline-flex items-center gap-2 rounded-full border border-amber-warm/60 px-7 py-3 font-sans text-sm tracking-[0.12em] text-stone-100 transition-all hover:bg-amber-warm/10"
                >
                  Open in editor
                </Link>
              </div>
            ) : (
              <>
                <p className="font-sans text-sm text-stone-500">
                  We&rsquo;ll turn each wide-angle shot flagged for 3D into a Gaussian
                  splat and bake a scroll-driven zoom-in. This runs on your machine and
                  can take a few minutes per photo — keep this tab open.
                </p>

                {renderTargets === null ? (
                  <p className="flex items-center gap-2 font-sans text-sm text-stone-500">
                    <Loader2 size={15} className="animate-spin" /> Finding 3D candidates…
                  </p>
                ) : renderTargets.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="font-sans text-sm text-stone-400">
                      No wide-angle shots were flagged for 3D on this listing. You can
                      mark photos as 3D in the Photos step, or finish here.
                    </p>
                    <Link
                      href={`/dashboard/listings/${listingId}`}
                      className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-warm/60 px-7 py-3 font-sans text-sm tracking-[0.12em] text-stone-100 transition-all hover:bg-amber-warm/10"
                    >
                      Open in editor
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                      {renderTargets.map((t) => (
                        <div key={t.assetId} className="flex flex-col gap-1">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-stone-900">
                            <Image src={t.url} alt={t.room} fill sizes="160px" className="object-cover" />
                            <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-amber-warm/90 px-1 py-0.5 text-[8px] uppercase tracking-wide text-stone-950">
                              <Box size={8} /> 3D
                            </span>
                          </div>
                          <p className="truncate font-sans text-[10px] text-stone-400">{t.room}</p>
                        </div>
                      ))}
                    </div>

                    {rendering && renderJob ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-sans text-sm text-stone-300">
                          <Loader2 size={16} className="animate-spin text-amber-warm" />
                          Baking {Math.min(renderJob.done + 1, renderJob.total)} of{" "}
                          {renderJob.total}
                          {renderJob.current ? ` — ${renderJob.current}` : ""}…
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                          <div
                            className="h-full rounded-full bg-amber-warm transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                6,
                                Math.round((renderJob.done / Math.max(renderJob.total, 1)) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="font-sans text-[11px] text-stone-600">
                          SHARP → Gaussian splat → 60-frame zoom, then uploaded. This is
                          slow; you can leave it running.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={startRenders}
                          disabled={renderStarting}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-warm/60 px-7 py-3 font-sans text-sm tracking-[0.12em] text-stone-100 transition-all hover:bg-amber-warm/10 disabled:opacity-50"
                        >
                          <Boxes size={16} />
                          {renderStarting
                            ? "Starting…"
                            : renderFailed
                              ? "Retry 3D renders"
                              : `Generate 3D renders (${renderTargets.length})`}
                        </button>
                        <Link
                          href={`/dashboard/listings/${listingId}`}
                          className="font-sans text-xs tracking-[0.1em] text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline"
                        >
                          Skip to editor
                        </Link>
                      </div>
                    )}

                    {renderFailed && renderJob && (
                      <ul className="max-w-md font-sans text-[11px] text-red-400/70">
                        {renderJob.errors.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {error && <p className="mt-5 font-sans text-xs text-red-400/80">{error}</p>}
      </section>

      {/* Footer nav — only on the early steps; Review/Generate/Renders have their own controls */}
      {step <= 2 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="rounded-full border border-stone-800 px-5 py-2 font-sans text-xs tracking-[0.1em] text-stone-400 transition-colors hover:border-stone-600 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={pending || uploading || analyzing || building}
            className="rounded-full border border-amber-warm/50 px-6 py-2 font-sans text-xs tracking-[0.12em] text-stone-100 transition-all hover:bg-amber-warm/10 hover:border-amber-warm/80 disabled:opacity-50"
          >
            {building ? "Preparing questions…" : pending ? "Saving…" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
