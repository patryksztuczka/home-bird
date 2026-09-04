import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTRPC } from "../../lib/trpc";

export function useApartmentVisualization(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const list = useQuery(
    trpc.apartmentVisualization.list.queryOptions({ apartmentProjectId: projectId }),
  );
  const latest = list.data?.[0];
  const latestComplete = list.data?.find((visualization) => visualization.status === "complete");
  const image = useQuery(
    trpc.apartmentVisualization.image.queryOptions(
      { id: latestComplete?.id ?? "" },
      { enabled: latestComplete !== undefined, staleTime: Infinity },
    ),
  );

  const refresh = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: trpc.apartmentVisualization.list.queryKey({ apartmentProjectId: projectId }),
      }),
    [projectId, queryClient, trpc],
  );
  const mutation = useMutation(
    trpc.apartmentVisualization.generate.mutationOptions({ onSettled: refresh }),
  );

  return {
    latest,
    image: image.data,
    count: list.data?.filter((visualization) => visualization.status === "complete").length ?? 0,
    pending: mutation.isPending || latest?.status === "pending",
    error:
      (latest?.status === "failed" ? (latest.errorMessage ?? "Generation failed") : undefined) ??
      mutation.error?.message,
    generate: (onSuccess?: () => void) =>
      mutation.mutate(
        { apartmentProjectId: projectId },
        onSuccess === undefined ? undefined : { onSuccess },
      ),
  };
}

export type ApartmentVisualizationState = ReturnType<typeof useApartmentVisualization>;
