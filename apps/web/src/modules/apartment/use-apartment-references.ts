import type {
  ReferenceComponent,
  ReferenceSource,
  ReferenceUse,
} from "@home-bird/shared/apartment-reference";
import { referenceComponents } from "@home-bird/shared/apartment-reference";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTRPC } from "../../lib/trpc";

/**
 * The apartment's references: one image per component, standing as the default
 * for every room. Attached images live in the api — what is held here is only
 * what the user is in the middle of doing.
 */

export interface ApartmentReference {
  readonly id: string;
  readonly component: ReferenceComponent;
  readonly use: ReferenceUse;
  readonly fileName: string;
  readonly byteSize: number;
  readonly sourceUrl: string | null;
}

/** The component the attach dialog is open for, and what it has been given so far. */
export interface AttachDraft {
  readonly component: ReferenceComponent;
  /** The reference already on this component, so the dialog can confirm the replacement. */
  readonly replacing: ApartmentReference | undefined;
}

export interface ApartmentReferences {
  readonly references: ReadonlyArray<ApartmentReference>;
  readonly byComponent: (component: ReferenceComponent) => ApartmentReference | undefined;
  readonly attachedCount: number;
  readonly componentCount: number;
  readonly draft: AttachDraft | undefined;
  readonly startAttaching: (component: ReferenceComponent) => void;
  readonly cancelAttaching: () => void;
  readonly attach: (source: ReferenceSource) => void;
  readonly attaching: boolean;
  readonly attachError: string | undefined;
  readonly clearAttachError: () => void;
  readonly remove: (component: ReferenceComponent) => void;
  /** The component removed a moment ago, so the panel can say so. */
  readonly justRemoved: ReferenceComponent | undefined;
  readonly dismissRemoved: () => void;
}

export function useApartmentReferences(projectId: string): ApartmentReferences {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const list = useQuery(
    trpc.apartmentReference.list.queryOptions({ apartmentProjectId: projectId }),
  );
  const [draft, setDraft] = useState<AttachDraft>();
  const [attachError, setAttachError] = useState<string>();
  const [justRemoved, setJustRemoved] = useState<ReferenceComponent>();

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: trpc.apartmentReference.list.queryKey({ apartmentProjectId: projectId }),
    });
  }, [projectId, queryClient, trpc]);

  const attachReference = useMutation(
    trpc.apartmentReference.attach.mutationOptions({
      onSuccess: () => {
        refresh();
        setDraft(undefined);
        setAttachError(undefined);
      },
      // A refused attach leaves every existing reference exactly as it was, so the
      // dialog stays open with the reason rather than closing on the user.
      onError: (error) => setAttachError(error.message),
    }),
  );

  const removeReference = useMutation(
    trpc.apartmentReference.remove.mutationOptions({
      onSuccess: (removed) => {
        refresh();
        setJustRemoved(removed.component as ReferenceComponent);
      },
    }),
  );

  const references = useMemo<ReadonlyArray<ApartmentReference>>(
    () => (list.data ?? []) as ReadonlyArray<ApartmentReference>,
    [list.data],
  );

  const byComponent = useCallback(
    (component: ReferenceComponent) =>
      references.find((reference) => reference.component === component),
    [references],
  );

  const startAttaching = useCallback(
    (component: ReferenceComponent) => {
      setAttachError(undefined);
      setJustRemoved(undefined);
      setDraft({ component, replacing: byComponent(component) });
    },
    [byComponent],
  );

  const attach = useCallback(
    (source: ReferenceSource) => {
      if (draft === undefined) return;
      setAttachError(undefined);
      attachReference.mutate({
        apartmentProjectId: projectId,
        component: draft.component,
        source,
      });
    },
    [attachReference, draft, projectId],
  );

  const remove = useCallback(
    (component: ReferenceComponent) => {
      removeReference.mutate({ apartmentProjectId: projectId, component });
    },
    [projectId, removeReference],
  );

  return {
    references,
    byComponent,
    attachedCount: references.length,
    componentCount: referenceComponents.length,
    draft,
    startAttaching,
    cancelAttaching: useCallback(() => {
      setDraft(undefined);
      setAttachError(undefined);
    }, []),
    attach,
    attaching: attachReference.isPending,
    attachError,
    clearAttachError: useCallback(() => setAttachError(undefined), []),
    remove,
    justRemoved,
    dismissRemoved: useCallback(() => setJustRemoved(undefined), []),
  };
}
