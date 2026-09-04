import { referenceDataUrl } from "@home-bird/shared/apartment-reference";
import {
  roomReferenceComponentLabels,
  type RoomReferenceComponent,
} from "@home-bird/shared/room-reference";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import { PlusIcon } from "./icons";
import type { ResolvedRoomReference, RoomReferences } from "./use-room-references";

const commonComponents = new Set<RoomReferenceComponent>([
  "overall-style",
  "floor",
  "walls",
  "ceiling",
  "doors",
  "windows",
  "lighting",
]);
const sectionLabel = "text-label font-semibold tracking-[0.08em] uppercase";

function RoomReferenceThumb({ entry }: { entry: ResolvedRoomReference }) {
  const trpc = useTRPC();
  const id = entry.reference?.id ?? "";
  const apartmentImage = useQuery(
    trpc.apartmentReference.image.queryOptions(
      { id },
      { enabled: entry.source === "apartment", staleTime: Infinity },
    ),
  );
  const roomImage = useQuery(
    trpc.roomReference.image.queryOptions(
      { id },
      { enabled: entry.source === "room", staleTime: Infinity },
    ),
  );
  const image = entry.source === "room" ? roomImage.data : apartmentImage.data;

  if (entry.reference === null) {
    return (
      <span className="flex size-13 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-hairline-strong bg-surface-sunk text-muted">
        <PlusIcon />
      </span>
    );
  }
  return (
    <span className="size-13 shrink-0 overflow-hidden rounded-[10px] border border-hairline bg-surface-sunk">
      {image && (
        <img
          src={referenceDataUrl(image)}
          alt={`${roomReferenceComponentLabels[entry.component]} reference`}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}

function RoomReferenceRow({
  entry,
  references,
}: {
  entry: ResolvedRoomReference;
  references: RoomReferences;
}) {
  const label = roomReferenceComponentLabels[entry.component];
  const roomReference = entry.source === "room";
  return (
    <li className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-[120ms] ease-settle hover:bg-surface-sunk">
      <RoomReferenceThumb entry={entry} />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        <span
          className={`truncate text-meta ${entry.source === "room" ? "text-accent" : entry.source === "apartment" ? "text-muted" : "text-hairline-strong"}`}
          title={entry.reference?.sourceUrl ?? undefined}
        >
          {entry.source === "room"
            ? `This room · ${entry.reference?.fileName}`
            : entry.source === "apartment"
              ? `Inherited · ${entry.reference?.fileName}`
              : "Not set"}
        </span>
      </span>

      {roomReference ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => references.startAttaching(entry.component)}
            aria-label={`Replace ${label} reference for ${references.roomLabel}`}
            className="flex size-[30px] items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
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
            onClick={() => references.remove(entry.component)}
            aria-label={`Remove ${label} override from ${references.roomLabel}`}
            className="flex size-[30px] items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-danger"
          >
            <span className="rotate-45">
              <PlusIcon />
            </span>
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => references.startAttaching(entry.component)}
          className="shrink-0 rounded-lg border border-hairline px-[11px] py-[6px] text-meta font-semibold text-ink hover:border-hairline-strong"
        >
          {entry.source === "apartment" ? "Override" : "Add"}
        </button>
      )}
    </li>
  );
}

export function RoomReferencePanel({ references }: { references: RoomReferences }) {
  const common = references.entries.filter((entry) => commonComponents.has(entry.component));
  const details = references.entries.filter((entry) => !commonComponents.has(entry.component));
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pt-4">
      <div className="flex items-baseline justify-between px-2.5 pb-1">
        <h2 className={`${sectionLabel} text-ink`}>{references.roomLabel} references</h2>
        <span className="text-label font-medium text-accent">
          {references.resolvedCount} resolved · {references.attachedCount} room refs
        </span>
      </div>
      <h3 className={`${sectionLabel} px-2.5 pt-2.5 pb-1 text-muted`}>Common</h3>
      <ul className="flex flex-col">
        {common.map((entry) => (
          <RoomReferenceRow key={entry.component} entry={entry} references={references} />
        ))}
      </ul>
      {details.length > 0 && (
        <>
          <h3 className={`${sectionLabel} px-2.5 pt-2.5 pb-1 text-muted`}>
            {references.roomLabel} details
          </h3>
          <ul className="flex flex-col">
            {details.map((entry) => (
              <RoomReferenceRow key={entry.component} entry={entry} references={references} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
