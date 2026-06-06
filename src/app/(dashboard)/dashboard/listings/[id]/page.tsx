import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOwnedListingById,
  getListingLeads,
  getOwnedListingAssets,
} from "@/lib/listings";
import {
  updateListingDetails,
  togglePublish,
  deleteListing,
} from "@/app/actions/listings";
import { EditorTabs } from "@/components/EditorTabs";
import { ListingStudio } from "@/components/studio/ListingStudio";

// ─── Field primitives ─────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-transparent border border-stone-800 rounded-md px-3 py-2 font-sans font-light text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-warm/60 transition-colors";
const labelClass =
  "text-[9px] tracking-[0.2em] uppercase font-sans text-stone-500";

function Text({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function Area({
  name,
  label,
  defaultValue,
  rows = 3,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        placeholder={placeholder}
        className={`${inputClass} resize-none`}
      />
    </label>
  );
}

function SaveButton({ children = "Save" }: { children?: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-full border border-amber-warm/50 px-5 py-2 font-sans font-light text-xs tracking-[0.12em] text-stone-100 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80"
    >
      {children}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ListingEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getOwnedListingById(id);
  if (!listing) notFound();

  const [leads, assets] = await Promise.all([
    getListingLeads(listing.id),
    getOwnedListingAssets(listing.id),
  ]);
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "lovethatforyou.app";
  const isPublished = listing.status === "published";
  const extraRows = [
    ...(listing.facts.extra ?? []),
    { label: "", value: "" },
    { label: "", value: "" },
  ];

  const propertyDetails = (
    <form action={updateListingDetails} className="flex flex-col gap-6">
      <input type="hidden" name="listingId" value={listing.id} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Text name="slug" label="Slug (subdomain)" defaultValue={listing.slug} />
        <Text name="listingType" label="Listing type" defaultValue={listing.listingType} placeholder="Residential" />
        <Text name="addressLine" label="Address" defaultValue={listing.addressLine} />
        <Text name="occupancy" label="Occupancy" defaultValue={listing.occupancy} />
        <Text name="city" label="City" defaultValue={listing.city} />
        <Text name="state" label="State" defaultValue={listing.state} />
        <Text name="postalCode" label="Postal code" defaultValue={listing.postalCode} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Text name="heroTitle" label="Hero / SEO title" defaultValue={listing.hero.title} />
        <Text name="heroSubtitle" label="Hero subtitle" defaultValue={listing.hero.subtitle} />
      </div>
      <Area name="heroIntro" label="Intro narrative" defaultValue={listing.hero.introNarrative} />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Text name="beds" label="Beds" defaultValue={listing.facts.beds} />
        <Text name="baths" label="Baths" defaultValue={listing.facts.baths} />
        <Text name="sqft" label="Sq Ft" defaultValue={listing.facts.sqft} />
        <Text name="yearBuilt" label="Year built" defaultValue={listing.facts.yearBuilt} />
        <Text name="lotSize" label="Lot size" defaultValue={listing.facts.lotSize} />
      </div>

      <Area
        name="features"
        label="Features (one per line)"
        defaultValue={(listing.facts.features ?? []).join("\n")}
        rows={5}
      />

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Extra detail rows (label / value)</span>
        {extraRows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <input name="extraLabel" defaultValue={row.label} placeholder="Label" className={inputClass} />
            <input name="extraValue" defaultValue={row.value} placeholder="Value" className={inputClass} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Text name="agentName" label="Agent name" defaultValue={listing.contact.agentName} />
        <Text name="brokerage" label="Brokerage" defaultValue={listing.contact.brokerage} />
        <Text name="phone" label="Phone" defaultValue={listing.contact.phone} />
        <Text name="sms" label="SMS" defaultValue={listing.contact.sms} />
        <Text name="email" label="Email" defaultValue={listing.contact.email} />
        <Text name="listingUrl" label="Listing URL" defaultValue={listing.contact.listingUrl} />
        <Text name="mls" label="MLS #" defaultValue={listing.contact.mls} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Text name="ogTitle" label="OG title" defaultValue={listing.seo.ogTitle} />
        <Text name="ogImage" label="OG image URL" defaultValue={listing.seo.ogImage} />
      </div>
      <Area name="metaDescription" label="Meta description" defaultValue={listing.seo.metaDescription} rows={2} />
      <Area name="ogDescription" label="OG description" defaultValue={listing.seo.ogDescription} rows={2} />

      <div>
        <SaveButton>Save details</SaveButton>
      </div>
    </form>
  );

  const leadsList =
    leads.length === 0 ? (
      <p className="font-sans font-light text-sm text-stone-500">
        No inquiries yet. They&rsquo;ll appear here as visitors reach out.
      </p>
    ) : (
      <div className="flex flex-col divide-y divide-stone-800/70">
        {leads.map((lead) => (
          <div key={lead.id} className="py-3 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="font-sans text-sm text-stone-200">
                {lead.name || "Anonymous"}
              </span>
              <span className="font-sans font-light text-[11px] text-stone-600">
                {new Date(lead.created_at).toLocaleString()}
              </span>
            </div>
            <span className="font-sans font-light text-xs text-amber-warm/80">
              {lead.contact}
            </span>
            {lead.message && (
              <p className="font-sans font-light text-sm text-stone-400 leading-relaxed">
                {lead.message}
              </p>
            )}
          </div>
        ))}
      </div>
    );

  const dangerZone = (
    <form action={deleteListing} className="flex items-center justify-between gap-4">
      <input type="hidden" name="listingId" value={listing.id} />
      <p className="font-sans font-light text-sm text-stone-500">
        Permanently delete this listing and all of its scenes, moments, and leads.
      </p>
      <button
        type="submit"
        className="rounded-full border border-red-500/40 px-5 py-2 font-sans font-light text-xs tracking-[0.12em] text-red-300/90 transition-colors hover:bg-red-500/10 hover:border-red-500/70"
      >
        Delete listing
      </button>
    </form>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="text-[10px] tracking-[0.18em] uppercase font-sans text-stone-500 hover:text-stone-300">
            ← All listings
          </Link>
          <h1 className="font-serif font-light italic text-stone-50 text-2xl">
            {listing.hero.title || listing.addressLine || listing.slug}
          </h1>
          <p className="font-sans font-light text-xs text-stone-500">
            {isPublished ? (
              <a href={`/l/${listing.slug}`} className="text-amber-warm/80 hover:text-amber-warm">
                {listing.slug}.{baseDomain}
              </a>
            ) : (
              <span>Draft · not yet public</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/l/${listing.slug}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-stone-800 px-4 py-2 font-sans font-light text-xs tracking-[0.1em] text-stone-300 hover:border-stone-600"
          >
            Preview
          </a>
          <form action={togglePublish}>
            <input type="hidden" name="listingId" value={listing.id} />
            <input type="hidden" name="next" value={isPublished ? "draft" : "published"} />
            <button
              type="submit"
              className="rounded-full border border-amber-warm/50 px-5 py-2 font-sans font-light text-xs tracking-[0.12em] text-stone-100 transition-all duration-300 hover:bg-amber-warm/10 hover:border-amber-warm/80"
            >
              {isPublished ? "Unpublish" : "Publish"}
            </button>
          </form>
        </div>
      </div>

      <EditorTabs
        defaultId="photos"
        tabs={[
          {
            id: "photos",
            label: "Photos",
            content: <ListingStudio listing={listing} assets={assets} />,
          },
          {
            id: "details",
            label: "Property details",
            content: propertyDetails,
          },
          {
            id: "leads",
            label: `Leads (${leads.length})`,
            content: leadsList,
          },
          {
            id: "danger",
            label: "Danger zone",
            content: dangerZone,
          },
        ]}
      />
    </div>
  );
}
