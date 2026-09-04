// A boundary point has no identity beyond its place in the ring, so the index is
// the correct key here — reordering points means the shape itself changed.
// oxlint-disable react/no-array-index-key
import type { BoundaryPoint } from "@home-bird/shared/room-area";
import { roomBoundaryIssue, roomTypeLabels } from "@home-bird/shared/room-area";
import { useLayoutEffect, useRef, useState } from "react";
import { type RoomArea, type RoomDraft, roomLabel } from "./use-room-mapping";

/** How close to the first point the cursor must come before a click closes the shape. */
const SNAP_RADIUS = 12;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const centre = (points: readonly BoundaryPoint[]) => ({
  x: points.reduce((total, point) => total + point.x, 0) / points.length,
  y: points.reduce((total, point) => total + point.y, 0) / points.length,
});

const pathOf = (points: readonly BoundaryPoint[], width: number, height: number, close: boolean) =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x * width} ${point.y * height}`)
    .join("") + (close ? "Z" : "");

export function RoomMappingOverlay({
  rooms,
  draft,
  selectedId,
  selectedPoint,
  onPlaceClick,
  onSelectRoom,
  onSelectPoint,
  onMovePoint,
  onInsertPoint,
  onRemovePoint,
  onCommitPoints,
  onClose,
}: {
  rooms: readonly RoomArea[];
  draft: RoomDraft | undefined;
  selectedId: string | undefined;
  selectedPoint: number | undefined;
  onPlaceClick: (point: BoundaryPoint) => void;
  onSelectRoom: (id: string) => void;
  onSelectPoint: (index: number | undefined) => void;
  onMovePoint: (index: number, point: BoundaryPoint) => void;
  onInsertPoint: (index: number, point: BoundaryPoint) => void;
  onRemovePoint: (index: number) => void;
  onCommitPoints: () => void;
  onClose: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  // The plan is stored as fractions of the image, so every redraw needs the image's
  // current size — that is what keeps areas on their walls when the editor resizes.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [cursor, setCursor] = useState<BoundaryPoint>();
  const [dragging, setDragging] = useState<number>();

  useLayoutEffect(() => {
    const element = svg.current;
    if (element === null) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box !== undefined) setSize({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const drawing = draft?.kind === "drawing";
  const editablePoints =
    draft?.kind === "naming"
      ? draft.points
      : draft === undefined
        ? rooms.find((room) => room.id === selectedId)?.boundary
        : undefined;

  const toBoundary = (event: { clientX: number; clientY: number }): BoundaryPoint => {
    const rect = svg.current?.getBoundingClientRect();
    if (rect === undefined || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    };
  };

  const first = draft?.points[0];
  const snapping =
    drawing &&
    first !== undefined &&
    cursor !== undefined &&
    draft.points.length >= 3 &&
    Math.hypot((first.x - cursor.x) * width, (first.y - cursor.y) * height) <= SNAP_RADIUS;

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${width} ${height}`}
      className={`absolute inset-0 size-full select-none ${drawing ? "cursor-crosshair" : ""}`}
      onPointerMove={(event) => setCursor(toBoundary(event))}
      onPointerLeave={() => setCursor(undefined)}
      onClick={(event) => {
        if (!drawing) return;
        if (snapping) onClose();
        else onPlaceClick(toBoundary(event));
      }}
    >
      <title>Room areas</title>

      {/* The room a draft came from is hidden: the draft is standing in for it. */}
      {rooms
        .filter((room) => room.id !== draft?.roomId)
        .map((room) => {
          const invalid = roomBoundaryIssue(room.boundary) !== undefined;
          const selected = room.id === selectedId;
          const label = centre(room.boundary);
          return (
            <g key={room.id}>
              <path
                d={pathOf(room.boundary, width, height, true)}
                className={
                  invalid
                    ? "fill-danger/12 stroke-danger"
                    : selected
                      ? "fill-accent/16 stroke-accent"
                      : "fill-accent/9 stroke-accent/55 hover:fill-accent/14"
                }
                strokeWidth={selected || invalid ? 2.5 : 2}
                strokeLinejoin="round"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelectRoom(room.id);
                }}
              />
              <text
                x={label.x * width}
                y={label.y * height}
                textAnchor="middle"
                className={`pointer-events-none text-[15px] font-semibold ${invalid ? "fill-danger" : "fill-accent"}`}
              >
                {roomLabel(room)}
              </text>
              {room.name !== "" && (
                <text
                  x={label.x * width}
                  y={label.y * height + 20}
                  textAnchor="middle"
                  className="pointer-events-none fill-accent-ink text-[12px]"
                >
                  {roomTypeLabels[room.roomType]}
                </text>
              )}
            </g>
          );
        })}

      {draft?.kind === "naming" && (
        <path
          d={pathOf(draft.points, width, height, true)}
          className={
            roomBoundaryIssue(draft.points) === undefined
              ? "fill-accent/16 stroke-accent"
              : "fill-danger/12 stroke-danger"
          }
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      )}

      {drawing && draft.points.length > 0 && (
        <>
          <path
            d={pathOf(draft.points, width, height, false)}
            fill="none"
            className="stroke-accent"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {cursor !== undefined && (
            <line
              x1={draft.points.at(-1)!.x * width}
              y1={draft.points.at(-1)!.y * height}
              x2={(snapping && first !== undefined ? first.x : cursor.x) * width}
              y2={(snapping && first !== undefined ? first.y : cursor.y) * height}
              className="stroke-accent/75"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
          {snapping && first !== undefined && (
            <circle
              cx={first.x * width}
              cy={first.y * height}
              r={11}
              className="fill-accent/12 stroke-accent"
              strokeWidth={1.5}
            />
          )}
          {draft.points.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={point.x * width}
              cy={point.y * height}
              r={5}
              className={index === 0 ? "fill-accent stroke-accent" : "fill-surface stroke-accent"}
              strokeWidth={2.5}
            />
          ))}
        </>
      )}

      {editablePoints !== undefined &&
        editablePoints.map((point, index) => {
          const next = editablePoints[(index + 1) % editablePoints.length]!;
          return (
            <circle
              key={`add-${index}`}
              cx={((point.x + next.x) / 2) * width}
              cy={((point.y + next.y) / 2) * height}
              r={4}
              className="cursor-copy fill-surface stroke-accent/50"
              strokeWidth={1.5}
              onPointerDown={(event) => {
                event.stopPropagation();
                onInsertPoint(index, { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 });
                onCommitPoints();
              }}
            />
          );
        })}

      {editablePoints?.map((point, index) => (
        <rect
          key={`point-${index}`}
          x={point.x * width - 4.5}
          y={point.y * height - 4.5}
          width={9}
          height={9}
          rx={1.5}
          className={`cursor-grab ${index === selectedPoint ? "fill-accent stroke-accent" : "fill-surface stroke-accent"}`}
          strokeWidth={2.5}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(index);
            onSelectPoint(index);
          }}
          onPointerMove={(event) => {
            if (dragging === index) onMovePoint(index, toBoundary(event));
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setDragging(undefined);
            onCommitPoints();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onRemovePoint(index);
            onCommitPoints();
          }}
        />
      ))}
    </svg>
  );
}
