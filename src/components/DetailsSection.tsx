import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { InquiryForm } from "./InquiryForm";
import type { Listing } from "@/lib/types";

interface Fact {
  label: string;
  value: string;
}

function detailsHeadline(listing: Listing): string {
  if (listing.hero.detailsHeadline) return listing.hero.detailsHeadline;
  const place = listing.hero.neighborhood || listing.city;
  return place ? `Claim your piece of ${place}` : "The details";
}

function FactCell({ label, value }: Fact) {
  return (
    <div className="flex w-[150px] flex-col gap-1 leading-tight">
      <p className="text-[13px] uppercase text-white/60" suppressHydrationWarning>
        {label}
      </p>
      <p className="text-lg text-white md:text-xl" suppressHydrationWarning>
        {value}
      </p>
    </div>
  );
}

export function DetailsSection({ listing }: { listing: Listing }) {
  const { facts, contact, branding } = listing;
  const sceneCount = listing.scenes.length;
  const number = String(sceneCount + 1).padStart(2, "0");
  const bgImage = listing.scenes[0]?.moments[0]?.image;

  const facetList: Fact[] = [
    listing.addressLine ? { label: "Street Address", value: listing.addressLine } : null,
    listing.postalCode ? { label: "Zipcode", value: listing.postalCode } : null,
    facts.beds != null ? { label: "Beds", value: String(facts.beds) } : null,
    facts.baths != null ? { label: "Baths", value: String(facts.baths) } : null,
    facts.sqft ? { label: "Sq Ft", value: facts.sqft } : null,
    facts.yearBuilt != null ? { label: "Built", value: String(facts.yearBuilt) } : null,
  ].filter((f): f is Fact => f != null);

  return (
    <section
      id="details"
      aria-label="Details"
      className="relative flex min-h-screen items-center overflow-hidden bg-[#111]"
    >
      {bgImage && (
        <Image
          src={bgImage}
          alt=""
          fill
          sizes="100vw"
          aria-hidden
          className="scale-110 object-cover opacity-30 blur-2xl"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(17,17,17,0.7) 0%, rgba(17,17,17,0.85) 50%, #111 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-24 md:flex-row md:items-stretch md:gap-14 md:px-10 md:py-28">
        {/* Left — details */}
        <div className="flex flex-1 flex-col gap-6">
          <p
            className="flex items-center gap-1.5 text-[20px] uppercase leading-none"
            suppressHydrationWarning
          >
            <span className="font-semibold text-highlight">{number}.</span>
            <span className="font-normal text-white">Details</span>
          </p>
          <h2
            className="font-sans font-medium uppercase leading-none text-white"
            suppressHydrationWarning
            style={{ fontSize: "clamp(2.25rem, 5vw, 3rem)" }}
          >
            {detailsHeadline(listing)}
          </h2>

          <div className="flex flex-wrap gap-x-3 gap-y-5 pt-2">
            {facetList.map((f) => (
              <FactCell key={f.label} {...f} />
            ))}

            {contact.brokerage && (
              <div className="flex w-full flex-col gap-1.5 leading-tight sm:w-[320px]">
                <p className="text-[13px] uppercase text-white/60" suppressHydrationWarning>
                  Listed By
                </p>
                <div className="flex items-center gap-2.5">
                  {branding.logoPath && (
                    <Image src={branding.logoPath} alt="" width={30} height={30} className="h-[30px] w-[30px]" />
                  )}
                  <span className="text-lg text-white md:text-xl" suppressHydrationWarning>
                    {contact.brokerage}
                  </span>
                </div>
              </div>
            )}

            {contact.mls && (
              <div className="flex w-[150px] flex-col gap-1.5 leading-tight">
                <p className="text-[13px] uppercase text-white/60" suppressHydrationWarning>
                  MLS Listing
                </p>
                {contact.listingUrl ? (
                  <a
                    href={contact.listingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-lg uppercase tracking-wide text-highlight md:text-xl"
                  >
                    {contact.mls}
                    <ExternalLink size={16} strokeWidth={1.5} className="opacity-70" />
                  </a>
                ) : (
                  <span className="text-lg uppercase tracking-wide text-highlight md:text-xl">
                    {contact.mls}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div aria-hidden className="hidden w-px self-stretch bg-white/20 md:block" />

        {/* Right — ask a question */}
        <div className="flex flex-1 flex-col gap-5">
          <h3
            className="font-sans text-2xl font-medium uppercase text-white"
            suppressHydrationWarning
          >
            Ask a Question
          </h3>
          <InquiryForm listingId={listing.id} />
        </div>
      </div>
    </section>
  );
}
