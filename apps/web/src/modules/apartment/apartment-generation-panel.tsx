import { Button } from "@home-bird/ui";
import { CheckIcon, InfoIcon, LoaderIcon, RefreshIcon, SparkleIcon } from "./icons";
import type { ApartmentVisualizationState } from "./use-apartment-visualization";

export function ApartmentGenerationPanel({
  roomCount,
  visualization,
}: {
  roomCount: number;
  visualization: ApartmentVisualizationState;
}) {
  const complete = visualization.latest?.status === "complete";
  const failed = visualization.error !== undefined && !visualization.pending;
  const heading = visualization.pending
    ? "Building your apartment concept"
    : failed
      ? "We couldn't create the visualization"
      : complete
        ? "Your apartment concept is ready"
        : "Create your empty apartment";
  const description = visualization.pending
    ? "We're turning the confirmed floor plan and room map into an empty isometric view."
    : failed
      ? "The generation failed. Your floor plan and any room mapping are still saved."
      : complete
        ? "Generate another concept from the floor plan whenever you want a new result."
        : "Turn the floor plan into an isometric concept image. Room mapping and references are optional.";

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-col gap-6 p-6">
        <span className="text-label font-semibold tracking-[0.1em] text-muted uppercase">
          Visualization
        </span>
        <h2 className="font-display text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-ink">
          {heading}
        </h2>
        <p className="text-sm leading-[1.5] text-muted">{description}</p>

        <div className="flex flex-col gap-3.5 rounded-xl bg-surface-sunk p-4">
          <span className="text-[11px] font-bold tracking-[0.09em] text-muted uppercase">
            What we'll create
          </span>
          {["Empty rooms", "White walls, neutral floors", "No invented furniture"].map((item) => (
            <span key={item} className="flex items-center gap-2.5 text-[13px] font-medium text-ink">
              <CheckIcon className="shrink-0 text-accent" />
              {item}
            </span>
          ))}
        </div>

        <div className="flex items-start gap-2.5">
          <InfoIcon className="mt-0.5 shrink-0 text-muted" />
          <p className="text-xs leading-[1.45] text-muted">
            This will be a plausible concept image, not an editable 3D model or measured design.
          </p>
        </div>

        {failed && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-[10px] border border-[#e8b6ad] bg-[#fff1ee] p-3.5 text-danger-ink"
          >
            <span className="text-[13px] font-bold">Generation failed</span>
            <span className="text-xs leading-[1.45]">
              {visualization.error}. Try again when you're ready.
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-hairline p-6">
        <span className="text-xs text-muted">
          {visualization.pending
            ? "Generation in progress"
            : failed
              ? "Last attempt failed · project unchanged"
              : complete
                ? `${visualization.count} visualization${visualization.count === 1 ? "" : "s"} available`
                : roomCount === 0
                  ? "Floor plan only · mapping optional"
                  : `Floor plan + ${roomCount} mapped room${roomCount === 1 ? "" : "s"}`}
        </span>
        <Button
          onClick={() => visualization.generate()}
          disabled={visualization.pending}
          className="w-full py-[13px]"
        >
          {visualization.pending ? (
            <LoaderIcon className="animate-spin" />
          ) : failed || complete ? (
            <RefreshIcon />
          ) : (
            <SparkleIcon />
          )}
          {visualization.pending
            ? "Generating..."
            : failed
              ? "Try again"
              : complete
                ? "Generate again"
                : "Generate empty apartment"}
        </Button>
      </div>
    </div>
  );
}
