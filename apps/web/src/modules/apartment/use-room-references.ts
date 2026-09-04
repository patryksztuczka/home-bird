import type { ReferenceSource, ReferenceUse } from "@home-bird/shared/apartment-reference";
import type { RoomReferenceComponent } from "@home-bird/shared/room-reference";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTRPC } from "../../lib/trpc";

export interface RoomReference {
  readonly id: string;
  readonly component: RoomReferenceComponent;
  readonly use: ReferenceUse;
  readonly fileName: string;
  readonly byteSize: number;
  readonly sourceUrl: string | null;
}

export interface ResolvedRoomReference {
  readonly component: RoomReferenceComponent;
  readonly source: "apartment" | "room" | "unset";
  readonly reference: RoomReference | null;
}

export interface RoomAttachDraft {
  readonly component: RoomReferenceComponent;
  readonly replacing: RoomReference | undefined;
  readonly inherited: RoomReference | undefined;
}

export interface RoomReferences {
  readonly roomAreaId: string | undefined;
  readonly roomLabel: string;
  readonly entries: ReadonlyArray<ResolvedRoomReference>;
  readonly byComponent: (component: RoomReferenceComponent) => ResolvedRoomReference | undefined;
  readonly attachedCount: number;
  readonly resolvedCount: number;
  readonly draft: RoomAttachDraft | undefined;
  readonly startAttaching: (component: RoomReferenceComponent) => void;
  readonly cancelAttaching: () => void;
  readonly attach: (source: ReferenceSource) => void;
  readonly attaching: boolean;
  readonly attachError: string | undefined;
  readonly clearAttachError: () => void;
  readonly remove: (component: RoomReferenceComponent) => void;
  readonly justRemoved: RoomReferenceComponent | undefined;
}

export function useRoomReferences(
  roomAreaId: string | undefined,
  roomLabel: string,
): RoomReferences {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useQuery(
    trpc.roomReference.resolved.queryOptions(
      { roomAreaId: roomAreaId ?? "" },
      { enabled: roomAreaId !== undefined },
    ),
  );
  const [draft, setDraft] = useState<RoomAttachDraft>();
  const [attachError, setAttachError] = useState<string>();
  const [justRemoved, setJustRemoved] = useState<RoomReferenceComponent>();

  const refresh = useCallback(() => {
    if (roomAreaId === undefined) return;
    void queryClient.invalidateQueries({
      queryKey: trpc.roomReference.resolved.queryKey({ roomAreaId }),
    });
  }, [queryClient, roomAreaId, trpc]);

  const attachMutation = useMutation(
    trpc.roomReference.attach.mutationOptions({
      onSuccess: () => {
        refresh();
        setDraft(undefined);
        setAttachError(undefined);
      },
      onError: (error) => setAttachError(error.message),
    }),
  );
  const removeMutation = useMutation(
    trpc.roomReference.remove.mutationOptions({
      onSuccess: (removed) => {
        refresh();
        setJustRemoved(removed.component as RoomReferenceComponent);
      },
    }),
  );

  const entries = useMemo(
    () => (list.data ?? []) as ReadonlyArray<ResolvedRoomReference>,
    [list.data],
  );
  const byComponent = useCallback(
    (component: RoomReferenceComponent) => entries.find((entry) => entry.component === component),
    [entries],
  );
  const startAttaching = useCallback(
    (component: RoomReferenceComponent) => {
      const entry = byComponent(component);
      setJustRemoved(undefined);
      setAttachError(undefined);
      setDraft({
        component,
        replacing: entry?.source === "room" ? (entry.reference ?? undefined) : undefined,
        inherited: entry?.source === "apartment" ? (entry.reference ?? undefined) : undefined,
      });
    },
    [byComponent],
  );

  return {
    roomAreaId,
    roomLabel,
    entries,
    byComponent,
    attachedCount: entries.filter((entry) => entry.source === "room").length,
    resolvedCount: entries.filter((entry) => entry.source !== "unset").length,
    draft,
    startAttaching,
    cancelAttaching: useCallback(() => {
      setDraft(undefined);
      setAttachError(undefined);
    }, []),
    attach: useCallback(
      (source: ReferenceSource) => {
        if (draft === undefined || roomAreaId === undefined) return;
        attachMutation.mutate({ roomAreaId, component: draft.component, source });
      },
      [attachMutation, draft, roomAreaId],
    ),
    attaching: attachMutation.isPending,
    attachError,
    clearAttachError: useCallback(() => setAttachError(undefined), []),
    remove: useCallback(
      (component: RoomReferenceComponent) => {
        if (roomAreaId !== undefined) removeMutation.mutate({ roomAreaId, component });
      },
      [removeMutation, roomAreaId],
    ),
    justRemoved,
  };
}
