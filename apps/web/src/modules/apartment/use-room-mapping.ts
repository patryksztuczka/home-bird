import type { BoundaryPoint, RoomType } from "@home-bird/shared/room-area";
import { roomBoundaryIssue, roomTypeLabels } from "@home-bird/shared/room-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTRPC } from "../../lib/trpc";

/**
 * Room mapping for one project. Saved areas live in the api; only the area being
 * drawn and the points being dragged are held here, because neither is worth a
 * request until the user is done with it.
 */

export type RoomArea = {
  readonly id: string;
  readonly roomType: RoomType;
  /** Empty when the user did not give the room a name of its own. */
  readonly name: string;
  readonly boundary: ReadonlyArray<BoundaryPoint>;
};

/**
 * The area being worked on: `drawing` while its points are being placed, `naming`
 * once it is closed. A draft carries `roomId` when it came from an existing room,
 * so redrawing or renaming keeps everything it is not replacing — and so discarding
 * leaves that room exactly as it was.
 */
export type RoomDraft = {
  readonly kind: "drawing" | "naming";
  readonly roomId: string | undefined;
  readonly roomType: RoomType | undefined;
  readonly name: string;
  readonly points: ReadonlyArray<BoundaryPoint>;
};

export const roomLabel = (room: RoomArea) =>
  room.name === "" ? roomTypeLabels[room.roomType] : room.name;

export function useRoomMapping(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const project = useQuery(trpc.apartmentProject.byId.queryOptions({ id: projectId }));
  const saved = useQuery(trpc.roomArea.list.queryOptions({ apartmentProjectId: projectId }));

  const [mapping, setMapping] = useState(false);
  const [draft, setDraft] = useState<RoomDraft>();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedPoint, setSelectedPoint] = useState<number>();
  // Dragging a point on a saved room would be a request per pointer move, so the
  // edit is held here and written once the user lets go.
  const [pendingBoundary, setPendingBoundary] = useState<ReadonlyArray<BoundaryPoint>>();

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.roomArea.list.queryKey({ apartmentProjectId: projectId }),
    });
    // Every write withdraws the mapping confirmation, so the project is stale too.
    void queryClient.invalidateQueries({
      queryKey: trpc.apartmentProject.byId.queryKey({ id: projectId }),
    });
  }, [projectId, queryClient, trpc]);

  const createArea = useMutation(trpc.roomArea.create.mutationOptions({ onSuccess: refresh }));
  const updateArea = useMutation(trpc.roomArea.update.mutationOptions({ onSuccess: refresh }));
  const removeArea = useMutation(trpc.roomArea.remove.mutationOptions({ onSuccess: refresh }));
  const confirm = useMutation(trpc.roomArea.confirmMapping.mutationOptions({ onSuccess: refresh }));
  const reopen = useMutation(trpc.roomArea.reopenMapping.mutationOptions({ onSuccess: refresh }));

  const rooms = useMemo<ReadonlyArray<RoomArea>>(() => {
    const stored = saved.data ?? [];
    if (pendingBoundary === undefined || selectedId === undefined) return stored;
    return stored.map((room) =>
      room.id === selectedId ? { ...room, boundary: pendingBoundary } : room,
    );
  }, [saved.data, pendingBoundary, selectedId]);

  const confirmed = project.data?.roomMappingConfirmedAt != null;

  /** The points the user is currently working on, drafted or saved. */
  const editedPoints = draft?.points ?? rooms.find((room) => room.id === selectedId)?.boundary;

  const clearSelection = useCallback(() => {
    setSelectedId(undefined);
    setSelectedPoint(undefined);
    setPendingBoundary(undefined);
  }, []);

  const startDrawing = useCallback(() => {
    clearSelection();
    setDraft({ kind: "drawing", roomId: undefined, roomType: undefined, name: "", points: [] });
  }, [clearSelection]);

  const startMapping = useCallback(() => {
    setMapping(true);
    startDrawing();
  }, [startDrawing]);

  const selectRoom = useCallback((id: string) => {
    setDraft(undefined);
    setPendingBoundary(undefined);
    setSelectedId(id);
    setSelectedPoint(undefined);
  }, []);

  const addPoint = useCallback((point: BoundaryPoint) => {
    setDraft((current) =>
      current?.kind === "drawing" ? { ...current, points: [...current.points, point] } : current,
    );
  }, []);

  const undoPoint = useCallback(() => {
    setDraft((current) =>
      current?.kind === "drawing" ? { ...current, points: current.points.slice(0, -1) } : current,
    );
  }, []);

  /** Closes the shape being drawn and moves on to naming it. */
  const closeDraft = useCallback(() => {
    setDraft((current) =>
      current?.kind === "drawing" && current.points.length >= 3
        ? { ...current, kind: "naming" }
        : current,
    );
  }, []);

  const discardDraft = useCallback(() => {
    setDraft(undefined);
    setSelectedPoint(undefined);
  }, []);

  const setDraftType = useCallback((roomType: RoomType) => {
    setDraft((current) => (current === undefined ? current : { ...current, roomType }));
  }, []);

  const setDraftName = useCallback((name: string) => {
    setDraft((current) => (current === undefined ? current : { ...current, name }));
  }, []);

  /** Saves the drafted area, replacing the room it came from. */
  const saveDraft = useCallback(() => {
    if (draft?.kind !== "naming" || draft.roomType === undefined) return;
    if (roomBoundaryIssue(draft.points) !== undefined) return;

    const fields = {
      roomType: draft.roomType,
      name: draft.name.trim(),
      boundary: [...draft.points],
    };
    if (draft.roomId === undefined) {
      createArea.mutate({ apartmentProjectId: projectId, ...fields });
    } else {
      updateArea.mutate({ id: draft.roomId, ...fields });
    }
    setDraft(undefined);
    setSelectedPoint(undefined);
  }, [createArea, draft, projectId, updateArea]);

  const roomById = useCallback((id: string) => rooms.find((room) => room.id === id), [rooms]);

  /** Reopens a saved room for a new type, name, or boundary. */
  const editRoom = useCallback(
    (id: string) => {
      const room = roomById(id);
      if (room === undefined) return;
      setSelectedId(id);
      setSelectedPoint(undefined);
      setPendingBoundary(undefined);
      setDraft({
        kind: "naming",
        roomId: id,
        roomType: room.roomType,
        name: room.name,
        points: room.boundary,
      });
    },
    [roomById],
  );

  /** Starts a saved room's boundary again, keeping the type and name it already has. */
  const redrawRoom = useCallback(
    (id: string) => {
      const room = roomById(id);
      if (room === undefined) return;
      setSelectedId(id);
      setSelectedPoint(undefined);
      setPendingBoundary(undefined);
      setDraft({
        kind: "drawing",
        roomId: id,
        roomType: room.roomType,
        name: room.name,
        points: [],
      });
    },
    [roomById],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      removeArea.mutate({ id });
      clearSelection();
      setDraft(undefined);
    },
    [clearSelection, removeArea],
  );

  // Point edits land on the draft when there is one, so Discard really does put the
  // room back; otherwise they are held against the selected room until it is written.
  const applyToEdited = useCallback(
    (change: (points: ReadonlyArray<BoundaryPoint>) => ReadonlyArray<BoundaryPoint>) => {
      if (draft !== undefined) {
        setDraft({ ...draft, points: change(draft.points) });
        return;
      }
      const current = editedPoints;
      if (current !== undefined) setPendingBoundary(change(current));
    },
    [draft, editedPoints],
  );

  const movePoint = useCallback(
    (index: number, point: BoundaryPoint) =>
      applyToEdited((points) => points.map((existing, at) => (at === index ? point : existing))),
    [applyToEdited],
  );

  const insertPoint = useCallback(
    (index: number, point: BoundaryPoint) => {
      applyToEdited((points) => [...points.slice(0, index + 1), point, ...points.slice(index + 1)]);
      setSelectedPoint(index + 1);
    },
    [applyToEdited],
  );

  const removePoint = useCallback(
    (index: number) => {
      if ((editedPoints?.length ?? 0) <= 3) return;
      applyToEdited((points) => points.filter((_, at) => at !== index));
      setSelectedPoint(undefined);
    },
    [applyToEdited, editedPoints],
  );

  /**
   * Writes a boundary the user just finished dragging. A shape they have made
   * invalid is kept on screen rather than sent, so they can carry on correcting it.
   */
  const commitPoints = useCallback(() => {
    if (draft !== undefined || pendingBoundary === undefined || selectedId === undefined) return;
    if (roomBoundaryIssue(pendingBoundary) !== undefined) return;
    const room = rooms.find((each) => each.id === selectedId);
    if (room === undefined) return;
    updateArea.mutate({
      id: selectedId,
      roomType: room.roomType,
      name: room.name,
      boundary: [...pendingBoundary],
    });
    setPendingBoundary(undefined);
  }, [draft, pendingBoundary, rooms, selectedId, updateArea]);

  const invalidRooms = rooms.filter((room) => roomBoundaryIssue(room.boundary) !== undefined);
  const writing =
    createArea.isPending || updateArea.isPending || removeArea.isPending || confirm.isPending;
  const canConfirm =
    mapping && rooms.length > 0 && invalidRooms.length === 0 && draft === undefined && !writing;

  const confirmMapping = useCallback(() => {
    confirm.mutate(
      { id: projectId },
      {
        onSuccess: () => {
          setMapping(false);
          setDraft(undefined);
          clearSelection();
        },
      },
    );
  }, [clearSelection, confirm, projectId]);

  const reopenMapping = useCallback(() => {
    setMapping(true);
    reopen.mutate({ id: projectId });
  }, [projectId, reopen]);

  return {
    mapping,
    rooms,
    draft,
    selectedId,
    selectedPoint,
    confirmed,
    canConfirm,
    invalidRooms,
    writing,
    /** The last write the api refused, if any. */
    writeError:
      createArea.error?.message ??
      updateArea.error?.message ??
      removeArea.error?.message ??
      confirm.error?.message,
    /** Why the area being drafted cannot be saved yet, or `undefined`. */
    draftIssue: draft === undefined ? undefined : roomBoundaryIssue(draft.points),
    startMapping,
    startDrawing,
    addPoint,
    undoPoint,
    closeDraft,
    discardDraft,
    setDraftType,
    setDraftName,
    saveDraft,
    selectRoom,
    clearSelection,
    setSelectedPoint,
    editRoom,
    redrawRoom,
    deleteRoom,
    movePoint,
    insertPoint,
    removePoint,
    commitPoints,
    confirmMapping,
    reopenMapping,
  };
}

export type RoomMapping = ReturnType<typeof useRoomMapping>;
