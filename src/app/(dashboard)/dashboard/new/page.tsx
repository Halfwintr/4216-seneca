import Link from "next/link";
import { NewListingWizard } from "@/components/wizard/NewListingWizard";

export default function NewListingPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="text-[10px] tracking-[0.18em] uppercase font-sans text-stone-500 hover:text-stone-300"
        >
          ← All listings
        </Link>
        <h1 className="font-serif font-light italic text-stone-50 text-2xl">
          New listing
        </h1>
        <p className="font-sans font-light text-xs text-stone-500">
          A guided walkthrough — we&rsquo;ll build the cinematic story for you.
        </p>
      </div>

      <NewListingWizard />
    </div>
  );
}
