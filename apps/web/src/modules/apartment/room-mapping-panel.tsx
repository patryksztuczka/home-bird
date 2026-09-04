import { roomBoundaryIssue, roomTypeLabels, roomTypes } from "@home-bird/shared/room-area";
import { Button, Input } from "@home-bird/ui";
import { InfoIcon, PlusIcon } from "./icons";
import { type RoomArea, type RoomMapping, roomLabel } from "./use-room-mapping";

const sectionLabel = "text-label font-semibold tracking-[0.08em] uppercase";

function AreaGlyph({ tone }: { tone: "mapped" | "draft" | "invalid" }) {
  const shell =
    tone === "draft"
      ? "border border-dashed border-accent"
      : tone === "invalid"
        ? "bg-danger-wash"
        : "bg-accent-wash";
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${shell}`}
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d={tone === "draft" ? "M2.5 3.5H13.5V12.5" : "M2.5 3.5H13.5V12.5H2.5Z"}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinejoin="round"
          className={tone === "invalid" ? "text-danger" : "text-accent"}
        />
      </svg>
    </span>
  );
}

function KeyHint({ keys, children }: { keys: string; children: string }) {
  return (
    <span className="flex items-center gap-[7px]">
      <kbd className="rounded border border-accent-edge bg-surface px-1.5 py-[3px] text-[11px] font-semibold tracking-[0.04em] text-accent">
        {keys}
      </kbd>
      <span className="text-label text-accent-ink">{children}</span>
    </span>
  );
}

function DrawingBanner({ points, redrawing }: { points: number; redrawing: boolean }) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-hairline bg-accent-wash px-5 pt-[22px] pb-[18px]">
      <div className="flex items-center gap-2.5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3 3.5 13 6.5 8.6 8.6 6.5 13 3 3.5Z"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinejoin="round"
            className="text-accent"
          />
        </svg>
        <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {redrawing ? "Drawing this room again" : "Drawing a new area"}
        </span>
        {points > 0 && <span className="ml-auto text-label text-accent-ink">{points} points</span>}
      </div>
      <p className="text-meta leading-[1.5] text-accent-ink">
        Click to place a point. Click the first point again to close the shape.
      </p>
      <div className="flex items-center gap-3.5 pt-1">
        <KeyHint keys="ESC">cancel</KeyHint>
        <KeyHint keys="⌫">undo last point</KeyHint>
      </div>
    </div>
  );
}

function NamingCard({ mapping }: { mapping: RoomMapping }) {
  const draft = mapping.draft;
  if (draft?.kind !== "naming") return null;

  const chosen = draft.roomType;
  const issue = mapping.draftIssue;
  const label = chosen === undefined ? "this room" : `“${roomTypeLabels[chosen]}”`;

  return (
    <div className="flex flex-col gap-5 border-b border-hairline bg-surface px-5 pt-[22px] pb-5">
      <div className="flex flex-col gap-1">
        <span className={`${sectionLabel} text-accent`}>
          {draft.roomId === undefined ? "New area" : "Edit area"}
        </span>
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
          What kind of room is this?
        </h2>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className={`${sectionLabel} pb-2.5 text-muted`}>Room type · required</legend>
        <div className="flex flex-wrap gap-1.5">
          {roomTypes.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={type === chosen}
              onClick={() => mapping.setDraftType(type)}
              className={`rounded-full border px-3 py-[7px] text-[13.5px] transition-colors duration-[120ms] ease-settle ${
                type === chosen
                  ? "border-accent bg-accent font-semibold text-white"
                  : "border-hairline font-medium text-ink hover:border-hairline-strong"
              }`}
            >
              {roomTypeLabels[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="room-name" className={`${sectionLabel} text-muted`}>
          Name · optional
        </label>
        <Input
          id="room-name"
          value={draft.name}
          onChange={(event) => mapping.setDraftName(event.target.value)}
          placeholder="Guest bedroom"
          className="px-3 py-2.5 text-[14.5px]"
        />
        <span className="text-[12.5px] text-muted">
          Leave empty and the room is listed as {label}.
        </span>
      </div>

      {issue !== undefined && (
        <p role="alert" className="text-meta text-danger">
          {issue}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={mapping.saveDraft}
          disabled={chosen === undefined || issue !== undefined}
          className="h-10 flex-1 px-0 py-0 text-[14.5px]"
        >
          Save area
        </Button>
        <Button variant="secondary" onClick={mapping.discardDraft} className="h-10 py-0">
          Discard
        </Button>
      </div>
    </div>
  );
}

function SelectedRoomCard({ mapping, room }: { mapping: RoomMapping; room: RoomArea }) {
  const issue = roomBoundaryIssue(room.boundary);

  return (
    <div className="flex flex-col gap-4 border-b border-hairline bg-surface px-5 pt-[22px] pb-5">
      <div className="flex flex-col gap-1">
        <span className={`${sectionLabel} text-accent`}>Selected room</span>
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
          {roomLabel(room)}
        </h2>
        <span className="text-meta text-muted">
          {room.name === "" ? "" : `${roomTypeLabels[room.roomType]} · `}
          {room.boundary.length} points
        </span>
      </div>

      <p className="text-meta leading-[1.5] text-muted">
        Drag a point to move it, click a hollow point to add one, double-click a point to remove it.
      </p>

      {issue !== undefined && (
        <p role="alert" className="rounded-md bg-danger-wash px-3 py-2.5 text-meta text-danger">
          {issue}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => mapping.editRoom(room.id)}
          className="h-9 flex-1 px-0 py-0 text-sm"
        >
          Rename
        </Button>
        <Button
          variant="secondary"
          onClick={() => mapping.redrawRoom(room.id)}
          className="h-9 flex-1 px-0 py-0 text-sm"
        >
          Redraw
        </Button>
        <Button
          variant="secondary"
          onClick={() => mapping.deleteRoom(room.id)}
          className="h-9 px-3 py-0 text-sm text-danger hover:border-danger"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function RoomRow({
  room,
  selected,
  onSelect,
}: {
  room: RoomArea;
  selected: boolean;
  onSelect: () => void;
}) {
  const issue = roomBoundaryIssue(room.boundary);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={`flex w-full items-center gap-3 rounded-[10px] px-2 py-[9px] text-left transition-colors duration-[120ms] ease-settle ${
          selected ? "bg-accent-wash" : "hover:bg-surface-sunk"
        }`}
      >
        <AreaGlyph tone={issue === undefined ? "mapped" : "invalid"} />
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[14.5px] font-semibold text-ink">{roomLabel(room)}</span>
          <span className={`text-[12.5px] ${issue === undefined ? "text-muted" : "text-danger"}`}>
            {issue ??
              (room.name === ""
                ? `${room.boundary.length} points`
                : `${roomTypeLabels[room.roomType]} · ${room.boundary.length} points`)}
          </span>
        </span>
        <span className="flex size-6 shrink-0 items-center justify-center text-hairline-strong">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M5 2.5 9.5 7 5 11.5"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </li>
  );
}

/** The side panel while the apartment is being mapped. */
export function RoomMappingPanel({ mapping }: { mapping: RoomMapping }) {
  const selected = mapping.rooms.find((room) => room.id === mapping.selectedId);
  const drawing = mapping.draft?.kind === "drawing";
  const naming = mapping.draft?.kind === "naming";

  const blocker =
    mapping.draft !== undefined
      ? "Finish this area before confirming."
      : mapping.rooms.length === 0
        ? "Draw an area around every room before confirming."
        : mapping.invalidRooms.length > 0
          ? `${mapping.invalidRooms.length} area${mapping.invalidRooms.length === 1 ? "" : "s"} still need fixing.`
          : "Confirm once every interior area is mapped. Generation unlocks after that.";

  return (
    <>
      {drawing && (
        <DrawingBanner
          points={mapping.draft?.points.length ?? 0}
          redrawing={mapping.draft?.roomId !== undefined}
        />
      )}
      {naming && <NamingCard mapping={mapping} />}
      {!drawing && !naming && selected !== undefined && (
        <SelectedRoomCard mapping={mapping} room={selected} />
      )}
      {!drawing && !naming && selected === undefined && (
        <div className="flex flex-col gap-3 border-b border-hairline bg-surface px-5 pt-[22px] pb-[18px]">
          <span className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Map the interior
          </span>
          <p className="text-meta leading-[1.5] text-muted">
            Draw an area around each room, then give it a type. Pick a room below to correct it.
          </p>
          <Button
            variant="secondary"
            onClick={mapping.startDrawing}
            className="h-10 justify-center py-0 text-[14.5px]"
          >
            <PlusIcon />
            Draw a room
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-5">
        <div className="flex items-baseline gap-2 pb-3.5">
          <h2 className={`${sectionLabel} text-ink`}>Rooms</h2>
          <span className="text-label text-muted">
            {mapping.rooms.length === 0 ? "none yet" : `${mapping.rooms.length} mapped`}
          </span>
        </div>

        <ul className="flex flex-col gap-0.5">
          {mapping.rooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              selected={room.id === mapping.selectedId}
              onSelect={() => mapping.selectRoom(room.id)}
            />
          ))}
          {drawing && mapping.draft?.roomId === undefined && (
            <li className="flex items-center gap-3 rounded-[10px] border border-dashed border-accent-edge bg-accent-wash/50 px-2 py-[9px]">
              <AreaGlyph tone="draft" />
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="text-[14.5px] font-semibold text-accent">Untitled area</span>
                <span className="text-[12.5px] text-accent-ink">
                  {mapping.draft?.points.length ?? 0} points · not closed yet
                </span>
              </span>
              <span className="size-6 shrink-0" />
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-3 border-t border-hairline bg-surface-sunk px-5 pt-[18px] pb-5">
        {mapping.writeError === undefined ? (
          <div className="flex items-start gap-2.5">
            <InfoIcon className="mt-0.5 shrink-0 text-muted" />
            <p className="flex-1 text-meta leading-[1.5] text-muted">{blocker}</p>
          </div>
        ) : (
          <p role="alert" className="rounded-md bg-danger-wash px-3 py-2.5 text-meta text-danger">
            {mapping.writeError}
          </p>
        )}
        <Button
          onClick={mapping.confirmMapping}
          disabled={!mapping.canConfirm}
          className="w-full py-[11px]"
        >
          Mapping complete
        </Button>
      </div>
    </>
  );
}
