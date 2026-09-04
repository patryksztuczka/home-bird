import { referenceComponentLabels } from "@home-bird/shared/apartment-reference";
import { roomReferenceComponentLabels } from "@home-bird/shared/room-reference";
import { floorPlanDataUrl } from "@home-bird/shared/apartment-project";
import { Button } from "@home-bird/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTRPC } from "../../lib/trpc";
import { ApartmentReferencePanel } from "./apartment-reference-panel";
import { AttachReferenceDialog } from "./attach-reference-dialog";
import { ChevronLeft, InfoIcon, MinusIcon, PlanIcon, PlusIcon, SparkleIcon } from "./icons";
import { useApartmentReferences } from "./use-apartment-references";
import { RoomMappingOverlay } from "./room-mapping-overlay";
import { RoomMappingPanel } from "./room-mapping-panel";
import { RoomReferencePanel } from "./room-reference-panel";
import { useRoomMapping, roomLabel } from "./use-room-mapping";
import { useRoomReferences } from "./use-room-references";

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
  const mapping = useRoomMapping(projectId);
  const references = useApartmentReferences(projectId);
  const selectedRoom = mapping.rooms.find((room) => room.id === mapping.selectedId);
  const selectedRoomLabel = selectedRoom === undefined ? "" : roomLabel(selectedRoom);
  const roomReferences = useRoomReferences(selectedRoom?.id, selectedRoomLabel);

  const stepZoom = (direction: -1 | 1) => {
    const index = zoomSteps.indexOf(zoom);
    const next = zoomSteps[Math.min(zoomSteps.length - 1, Math.max(0, index + direction))];
    setZoom(next ?? 100);
  };

  // Drawing is a keyboard-and-mouse job: the shortcuts are on the window so they
  // work wherever the pointer is over the plan.
  useEffect(() => {
    if (!mapping.mapping) return;
    const handle = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if (event.key === "Escape") {
        if (mapping.draft === undefined) mapping.clearSelection();
        else mapping.discardDraft();
        return;
      }
      if (event.key === "Enter" && mapping.draft?.kind === "drawing") {
        event.preventDefault();
        mapping.closeDraft();
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        if (mapping.draft?.kind === "drawing") {
          event.preventDefault();
          mapping.undoPoint();
        } else if (mapping.selectedPoint !== undefined) {
          event.preventDefault();
          mapping.removePoint(mapping.selectedPoint);
        }
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [mapping]);

  const status = mapping.confirmed
    ? { text: "Mapping complete", tone: "accent" as const }
    : mapping.mapping
      ? {
          text: `${mapping.rooms.length} mapped${
            mapping.draft?.kind === "drawing"
              ? " · drawing"
              : mapping.draft?.kind === "naming"
                ? " · 1 unsaved"
                : ""
          }`,
          tone: "accent" as const,
        }
      : mapping.rooms.length === 0
        ? { text: "No rooms mapped yet", tone: "muted" as const }
        : { text: `${mapping.rooms.length} mapped · not confirmed`, tone: "muted" as const };

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <AttachReferenceDialog
        key={
          roomReferences.draft
            ? `room-${roomReferences.roomAreaId}-${roomReferences.draft.component}`
            : (references.draft?.component ?? "none")
        }
        references={roomReferences.draft ? roomReferences : references}
      />
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

        <span
          className={`flex items-center gap-[7px] rounded-full border py-[5px] pr-[11px] pl-[9px] ${
            status.tone === "accent"
              ? "border-accent-edge bg-accent-wash"
              : "border-hairline bg-surface-sunk"
          }`}
        >
          <span
            className={`size-1.5 shrink-0 rounded-full ${status.tone === "accent" ? "bg-accent" : "bg-muted"}`}
          />
          <span
            className={`text-label font-medium ${status.tone === "accent" ? "text-accent" : "text-muted"}`}
          >
            {status.text}
          </span>
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
            variant={mapping.confirmed ? "primary" : "quiet"}
            disabled={!mapping.confirmed}
            title={mapping.confirmed ? undefined : "Map every room before generating"}
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
              <div className="relative">
                <img
                  src={floorPlanDataUrl(floorPlan.data)}
                  alt={`Floor plan for ${project.data.name}`}
                  className="block max-h-[70vh] w-auto max-w-[740px] object-contain"
                />
                {(mapping.mapping || mapping.rooms.length > 0) && (
                  <RoomMappingOverlay
                    rooms={mapping.rooms}
                    draft={mapping.draft}
                    selectedId={mapping.selectedId}
                    selectedPoint={mapping.selectedPoint}
                    onPlaceClick={mapping.addPoint}
                    onSelectRoom={mapping.selectRoom}
                    onSelectPoint={mapping.setSelectedPoint}
                    onMovePoint={mapping.movePoint}
                    onInsertPoint={mapping.insertPoint}
                    onRemovePoint={mapping.removePoint}
                    onCommitPoints={mapping.commitPoints}
                    onClose={mapping.closeDraft}
                  />
                )}
              </div>
            </div>
          )}
        </main>

        <aside
          aria-label="Project controls"
          className="flex w-[340px] shrink-0 flex-col border-l border-hairline bg-surface"
        >
          {mapping.mapping ? (
            <RoomMappingPanel mapping={mapping} />
          ) : (
            <>
              <div className="flex flex-col gap-3.5 border-b border-hairline px-5 pt-[22px] pb-[18px]">
                <span className="text-label font-semibold tracking-[0.08em] text-muted uppercase">
                  Applying to
                </span>
                {selectedRoom ? (
                  <>
                    <div className="flex rounded-lg border border-hairline bg-surface-sunk p-1 text-meta font-semibold">
                      <button
                        type="button"
                        onClick={mapping.clearSelection}
                        className="flex-1 rounded-md px-2 py-2 text-muted hover:text-ink"
                      >
                        Whole apartment
                      </button>
                      <span className="flex-1 rounded-md bg-surface px-2 py-2 text-center text-accent shadow-sm">
                        Single room
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-[11px] border border-accent-edge bg-accent-wash px-3.5 py-3">
                      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-accent text-white">
                        <PlanIcon />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] font-semibold text-ink">
                          {selectedRoomLabel}
                        </span>
                        <span className="text-[12.5px] text-accent-ink">Room-only references</span>
                      </span>
                    </div>
                    <p className="text-meta leading-[1.5] text-muted">
                      {selectedRoomLabel} references apply only here. Apartment references fill any
                      gaps.
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-3 rounded-[11px] border border-accent-edge bg-accent-wash px-3.5 py-3">
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-accent text-white">
                      <PlanIcon />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-semibold text-ink">Whole apartment</span>
                      <span className="text-[12.5px] text-accent-ink">Defaults for every room</span>
                    </span>
                  </div>
                )}
                {!selectedRoom && (
                  <p className="text-meta leading-[1.5] text-muted">
                    These references apply to every room unless a room overrides them.
                  </p>
                )}
              </div>

              {selectedRoom ? (
                <RoomReferencePanel references={roomReferences} />
              ) : (
                <ApartmentReferencePanel references={references} />
              )}

              <div className="flex flex-col gap-3 border-t border-hairline bg-surface-sunk px-5 pt-[18px] pb-5">
                <div className="flex items-start gap-2.5">
                  <InfoIcon className="mt-0.5 shrink-0 text-muted" />
                  <p className="flex-1 text-meta leading-[1.5] text-muted">
                    {selectedRoom && roomReferences.justRemoved
                      ? `${roomReferenceComponentLabels[roomReferences.justRemoved]} override removed. The apartment default is active here again.`
                      : !selectedRoom && references.justRemoved
                        ? `${referenceComponentLabels[references.justRemoved]} reference removed. Every other reference is unchanged.`
                        : "Add a local image or a direct image link. Each component holds one reference."}
                  </p>
                </div>
                {selectedRoom ? (
                  <Button onClick={mapping.clearSelection} className="w-full py-[11px]">
                    Done with {selectedRoomLabel}
                  </Button>
                ) : (
                  <Button
                    variant={mapping.confirmed ? "secondary" : "primary"}
                    onClick={mapping.confirmed ? mapping.reopenMapping : mapping.startMapping}
                    className="w-full py-[11px]"
                  >
                    {mapping.confirmed ? "Edit room mapping" : "Start mapping rooms"}
                  </Button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
