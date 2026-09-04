import type { ReferenceComponent } from "@home-bird/shared/apartment-reference";
import {
  referenceComponentLabels,
  referenceComponents,
  referenceDataUrl,
} from "@home-bird/shared/apartment-reference";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import { PlusIcon } from "./icons";
import type { ApartmentReference, ApartmentReferences } from "./use-apartment-references";

const sectionLabel = "text-label font-semibold tracking-[0.08em] uppercase";

/**
 * The attached image, fetched over the same tRPC contract as everything else —
 * so a linked reference is shown from what we stored, never from its host.
 */
function ReferenceThumb({ reference }: { reference: ApartmentReference | undefined }) {
  const trpc = useTRPC();
  const image = useQuery(
    trpc.apartmentReference.image.queryOptions(
      { id: reference?.id ?? "" },
      { enabled: reference !== undefined, staleTime: Infinity },
    ),
  );

  if (reference === undefined) {
    return (
      <span className="flex size-13 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-hairline-strong bg-surface-sunk text-muted">
        <PlusIcon />
      </span>
    );
  }

  return (
    <span className="size-13 shrink-0 overflow-hidden rounded-[10px] border border-hairline bg-surface-sunk">
      {image.data && (
        <img
          src={referenceDataUrl(image.data)}
          alt={`${referenceComponentLabels[reference.component]} reference`}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}

function ReferenceRow({
  component,
  references,
}: {
  component: ReferenceComponent;
  references: ApartmentReferences;
}) {
  const reference = references.byComponent(component);
  const label = referenceComponentLabels[component];

  return (
    <li className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-[120ms] ease-settle hover:bg-surface-sunk">
      <ReferenceThumb reference={reference} />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        <span
          className={`truncate text-meta ${reference ? "text-muted" : "text-hairline-strong"}`}
          title={reference?.sourceUrl ?? undefined}
        >
          {reference?.fileName ?? "Not set"}
        </span>
      </span>

      {reference ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => references.startAttaching(component)}
            aria-label={`Replace ${label} reference`}
            className="flex size-[30px] items-center justify-center rounded-lg text-muted transition-colors duration-[120ms] ease-settle hover:bg-surface hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13 2v3h-3"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => references.remove(component)}
            aria-label={`Remove ${label} reference`}
            className="flex size-[30px] items-center justify-center rounded-lg text-muted transition-colors duration-[120ms] ease-settle hover:bg-surface hover:text-danger"
          >
            <span className="rotate-45">
              <PlusIcon />
            </span>
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => references.startAttaching(component)}
          className="shrink-0 rounded-lg border border-hairline px-[11px] py-[6px] text-meta font-semibold text-ink transition-colors duration-[120ms] ease-settle hover:border-hairline-strong"
        >
          Add
        </button>
      )}
    </li>
  );
}

const inspiration = referenceComponents.filter((component) => component === "overall-style");
const closeMatch = referenceComponents.filter((component) => component !== "overall-style");

/**
 * The apartment-wide references. Grouped by how each is read when generating —
 * overall style sets the mood, everything else is a request to reproduce what
 * is in the image — so the distinction is stated once rather than per row.
 */
export function ApartmentReferencePanel({ references }: { references: ApartmentReferences }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pt-4">
      <div className="flex items-baseline justify-between px-2.5 pb-1">
        <h2 className={`${sectionLabel} text-ink`}>Apartment references</h2>
        <span
          className={`text-label font-medium ${
            references.attachedCount > 0 ? "text-accent" : "text-muted"
          }`}
        >
          {references.attachedCount} of {references.componentCount}
        </span>
      </div>

      <h3 className={`${sectionLabel} px-2.5 pt-2.5 pb-1 text-muted`}>
        Used as general inspiration
      </h3>
      <ul className="flex flex-col">
        {inspiration.map((component) => (
          <ReferenceRow key={component} component={component} references={references} />
        ))}
      </ul>

      <h3 className={`${sectionLabel} px-2.5 pt-2.5 pb-1 text-muted`}>Matched closely</h3>
      <ul className="flex flex-col">
        {closeMatch.map((component) => (
          <ReferenceRow key={component} component={component} references={references} />
        ))}
      </ul>
    </div>
  );
}
