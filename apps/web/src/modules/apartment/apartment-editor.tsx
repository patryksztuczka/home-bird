import { floorPlanDataUrl } from "@home-bird/shared/apartment-project";
import { Button } from "@home-bird/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "../../lib/trpc";
import { ChevronLeft, InfoIcon, MinusIcon, PlanIcon, PlusIcon, SparkleIcon } from "./icons";

/** The apartment-wide components every scope offers. Room-only fields come later. */
const commonComponents = [
  "Overall style",
  "Floor",
  "Walls",
  "Ceiling",
  "Doors",
  "Windows",
  "Lighting",
] as const;

const zoomSteps = [50, 75, 100, 125, 150, 200];

/**
 * The project workspace: the floor plan is the canvas, and the side panel holds
 * the controls for whatever scope is selected.
 */
export function ApartmentEditor({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const project = useQuery(trpc.apartmentProject.byId.queryOptions({ id: projectId }));
  // A stored floor plan never changes, so it is fetched once and kept.
  const floorPlan = useQuery(
    trpc.apartmentProject.floorPlanImage.queryOptions(
      { id: projectId },
      { staleTime: Infinity, gcTime: Infinity },
    ),
  );
  const [zoom, setZoom] = useState(100);

  const stepZoom = (direction: -1 | 1) => {
    const index = zoomSteps.indexOf(zoom);
    const next = zoomSteps[Math.min(zoomSteps.length - 1, Math.max(0, index + direction))];
    setZoom(next ?? 100);
  };

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <header className="flex h-15 shrink-0 items-center gap-4 border-b border-hairline bg-surface pr-5 pl-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to all projects"
          className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-hairline text-ink transition-colors duration-[120ms] ease-settle hover:border-hairline-strong"
        >
          <ChevronLeft />
        </button>

        <div className="flex items-baseline gap-2.5">
          <h1 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
            {project.data?.name ?? "Apartment project"}
          </h1>
          {project.data && (
            <span className="text-meta text-muted">{project.data.floorPlan.fileName}</span>
          )}
        </div>

        <span className="flex items-center gap-[7px] rounded-full border border-hairline bg-surface-sunk py-[5px] pr-[11px] pl-[9px]">
          <span className="size-1.5 shrink-0 rounded-full bg-muted" />
          <span className="text-label font-medium text-muted">No rooms mapped yet</span>
        </span>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex items-center gap-0.5 rounded-lg border border-hairline bg-surface p-[3px]">
            <button
              type="button"
              onClick={() => stepZoom(-1)}
              disabled={zoom === zoomSteps[0]}
              aria-label="Zoom out"
              className="flex h-[26px] w-7 items-center justify-center rounded-sm text-ink transition-colors duration-[120ms] ease-settle hover:bg-surface-sunk disabled:text-hairline-strong disabled:hover:bg-transparent"
            >
              <MinusIcon />
            </button>
            <span className="w-[46px] text-center text-meta font-medium text-ink tabular-nums">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => stepZoom(1)}
              disabled={zoom === zoomSteps.at(-1)}
              aria-label="Zoom in"
              className="flex h-[26px] w-7 items-center justify-center rounded-sm text-ink transition-colors duration-[120ms] ease-settle hover:bg-surface-sunk disabled:text-hairline-strong disabled:hover:bg-transparent"
            >
              <PlusIcon />
            </button>
          </div>

          <Button
            variant="quiet"
            disabled
            title="Map every room before generating"
            className="text-sm"
          >
            <SparkleIcon />
            Generate
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main
          aria-label="Floor plan"
          className="flex flex-1 items-center justify-center overflow-auto bg-canvas p-12"
        >
          {(project.isPending || floorPlan.isPending) && (
            <p className="text-sm text-muted">Loading floor plan…</p>
          )}
          {(project.isError || floorPlan.isError) && (
            <p role="alert" className="text-sm text-danger">
              We could not open this project.
            </p>
          )}
          {project.data && floorPlan.data && (
            <div
              style={{ transform: `scale(${zoom / 100})` }}
              className="shrink-0 rounded-sm bg-surface p-9 shadow-sheet transition-transform duration-[320ms] ease-settle"
            >
              <img
                src={floorPlanDataUrl(floorPlan.data)}
                alt={`Floor plan for ${project.data.name}`}
                className="block max-h-[70vh] w-auto max-w-[740px] object-contain"
              />
            </div>
          )}
        </main>

        <aside
          aria-label="Project controls"
          className="flex w-[340px] shrink-0 flex-col border-l border-hairline bg-surface"
        >
          <div className="flex flex-col gap-3.5 border-b border-hairline px-5 pt-[22px] pb-[18px]">
            <span className="text-label font-semibold tracking-[0.08em] text-muted uppercase">
              Applying to
            </span>
            <div className="flex items-center gap-3 rounded-[11px] border border-accent-edge bg-accent-wash px-3.5 py-3">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-accent text-white">
                <PlanIcon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-semibold text-ink">Whole apartment</span>
                <span className="text-[12.5px] text-accent-ink">Defaults for every room</span>
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-5 pt-5">
            <div className="flex items-baseline gap-2 pb-3">
              <h2 className="text-label font-semibold tracking-[0.08em] text-ink uppercase">
                References
              </h2>
              <span className="text-label text-muted">not available yet</span>
            </div>

            <ul className="flex flex-col">
              {commonComponents.map((component) => (
                <li
                  key={component}
                  className="flex items-center gap-3 px-1 py-[9px] opacity-55"
                  aria-disabled
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-hairline-strong bg-surface-sunk text-muted">
                    <PlusIcon />
                  </span>
                  <span className="min-w-0 flex-1 text-[14.5px] font-medium text-ink">
                    {component}
                  </span>
                  <span className="w-13 shrink-0 text-right text-meta text-muted">Add</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3 border-t border-hairline bg-surface-sunk px-5 pt-[18px] pb-5">
            <div className="flex items-start gap-2.5">
              <InfoIcon className="mt-0.5 shrink-0 text-muted" />
              <p className="flex-1 text-meta leading-[1.5] text-muted">
                Drawing room areas and attaching references are still to come. Your floor plan is
                saved and will be waiting.
              </p>
            </div>
            <Button disabled className="w-full">
              Start mapping rooms
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
