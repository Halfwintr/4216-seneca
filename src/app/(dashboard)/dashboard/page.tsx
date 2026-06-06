import Link from "next/link";
import Image from "next/image";
import { getOwnerListingSummaries } from "@/lib/listings";

export default async function DashboardPage() {
  const listings = await getOwnerListingSummaries();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif font-light italic text-stone-50 text-3xl">
            Your listings
          </h1>
          <p className="font-sans font-light text-sm text-stone-500">
            {listings.length} {listings.length === 1 ? "property" : "properties"}
          </p>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-800 p-16 flex flex-col items-center gap-4 text-center">
          <p className="font-serif font-light italic text-stone-300 text-xl">
            No listings yet
          </p>
          <p className="font-sans font-light text-sm text-stone-500 max-w-sm">
            Create your first property story and start turning listing photos
            into an immersive experience.
          </p>
          <Link
            href="/dashboard/new"
            className="mt-2 rounded-full border border-amber-warm/50 px-6 py-2.5 font-sans font-light text-xs tracking-[0.12em] text-stone-100 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80"
          >
            Create a listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/listings/${l.id}`}
              className="group flex flex-col rounded-xl border border-stone-800/80 overflow-hidden bg-stone-900/30 transition-colors hover:border-stone-700"
            >
              <div className="relative aspect-[4/3] bg-stone-900">
                {l.heroImage ? (
                  <Image
                    src={l.heroImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-700 font-sans text-xs uppercase tracking-[0.2em]">
                    No image
                  </div>
                )}
                <span
                  className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[9px] tracking-[0.18em] uppercase font-sans ${
                    l.status === "published"
                      ? "bg-amber-warm/20 text-amber-warm-light border border-amber-warm/40"
                      : "bg-stone-950/70 text-stone-400 border border-stone-700"
                  }`}
                >
                  {l.status}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 p-4">
                <h2 className="font-serif font-light italic text-stone-100 text-lg leading-tight">
                  {l.title}
                </h2>
                <p className="font-sans font-light text-xs text-stone-500">
                  {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] tracking-[0.14em] uppercase font-sans text-stone-600">
                  <span>{l.leadCount} {l.leadCount === 1 ? "lead" : "leads"}</span>
                  <span className="text-amber-warm/70 group-hover:text-amber-warm">
                    Edit →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
