import { sealParts, type Listing } from "@/lib/types";

interface SealProps {
  listing: Listing;
  /** "default" for the desktop rail, "compact" for mobile. */
  size?: "default" | "compact";
}

/**
 * The property address seal: a bordered box with the street number + street
 * name, and a neighborhood / city-state subtitle beneath it. Pure text/CSS,
 * derived from listing data.
 */
export function Seal({ listing, size = "default" }: SealProps) {
  const { number, street, neighborhood, cityState } = sealParts(listing);
  const compact = size === "compact";
  const displayStreet = street.replace(/\bAvenue\b/i, "Ave");
  const sealBoxClass = compact
    ? "flex flex-col items-center border-2 border-white px-3 py-2.5 leading-none"
    : "flex w-[124px] flex-col items-center px-3 py-2.5 leading-none outline outline-2 -outline-offset-2 outline-white";
  const streetClass = compact
    ? "whitespace-nowrap font-sans font-medium text-[12px] tracking-wide"
    : "whitespace-nowrap font-sans font-medium text-[14px] leading-[14px] tracking-wide";
  const subtitleClass = compact
    ? "font-sans font-normal text-[10px] leading-[12px] normal-case text-white"
    : "font-sans font-normal text-[12px] leading-[14.4px] normal-case text-white";
  const outerClass = compact
    ? "flex flex-col items-center gap-2 text-center text-white uppercase"
    : "flex flex-col items-center gap-3 p-2.5 text-center text-white uppercase";

  return (
    <div
      className={outerClass}
      suppressHydrationWarning
    >
      <div className={sealBoxClass}>
        <span
          className="font-sans font-semibold tracking-tight"
          style={{
            fontSize: compact ? "30px" : "36px",
            lineHeight: compact ? "30px" : "36px",
            letterSpacing: compact ? "-0.06em" : "-0.05em",
          }}
          suppressHydrationWarning
        >
          {number}
        </span>
        {street && (
          <span
            className={streetClass}
            suppressHydrationWarning
          >
            {displayStreet}
          </span>
        )}
      </div>
      {(neighborhood || cityState) && (
        <div className={subtitleClass}>
          {neighborhood && <p suppressHydrationWarning>{neighborhood}</p>}
          {cityState && <p suppressHydrationWarning>{cityState}</p>}
        </div>
      )}
    </div>
  );
}
