import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  type CreateApartmentProjectInput,
  CreateApartmentProjectInput as CreateApartmentProjectSchema,
  floorPlanAccept,
} from "@home-bird/shared/apartment-project";
import { Button, FieldError, FieldLabel, Input } from "@home-bird/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTRPC } from "../../lib/trpc";
import { AlertIcon, ArrowRight, PlanIconLarge, UploadIcon } from "./icons";
import {
  formatBytes,
  type FloorPlanSelection,
  maxFloorPlanMegabytes,
  readFloorPlanFile,
} from "./floor-plan-file";

export function CreateApartmentProjectForm({
  onCreated,
}: {
  onCreated: (projectId: string) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const nameId = useId();
  const floorPlanId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [selection, setSelection] = useState<FloorPlanSelection>();
  const [isDragging, setIsDragging] = useState(false);

  // The preview holds an object URL; release it when it is replaced or unmounted.
  useEffect(
    () => () => {
      if (selection) {
        URL.revokeObjectURL(selection.previewUrl);
      }
    },
    [selection],
  );

  const form = useForm<CreateApartmentProjectInput>({
    resolver: standardSchemaResolver(CreateApartmentProjectSchema),
    defaultValues: { name: "" },
  });

  const createProject = useMutation(
    trpc.apartmentProject.create.mutationOptions({
      onSuccess: (project) => {
        void queryClient.invalidateQueries({ queryKey: trpc.apartmentProject.list.queryKey() });
        onCreated(project.id);
      },
      onError: (error) => form.setError("root", { message: error.message }),
    }),
  );

  const nameError = form.formState.errors.name;
  const floorPlanError =
    form.formState.errors.floorPlan?.message ??
    form.formState.errors.floorPlan?.data?.message ??
    form.formState.errors.floorPlan?.contentType?.message ??
    form.formState.errors.floorPlan?.fileName?.message;

  const pickFloorPlan = async (file: File | undefined) => {
    if (file === undefined) {
      return;
    }
    form.clearErrors("floorPlan");
    try {
      const next = await readFloorPlanFile(file);
      setSelection(next);
      form.setValue("floorPlan", next.upload, { shouldValidate: true });
    } catch (error) {
      setSelection(undefined);
      form.resetField("floorPlan");
      form.setError("floorPlan", {
        message: error instanceof Error ? error.message : "Floor plan image could not be read",
      });
    }
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => createProject.mutate(values))}
      className="flex w-[520px] shrink-0 flex-col rounded-xl bg-surface shadow-raised"
    >
      <header className="flex flex-col gap-1.5 border-b border-hairline px-9 pt-8 pb-6">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
          New apartment project
        </h1>
        <p className="text-sm leading-[1.55] text-muted">
          A floor plan is required — nothing is generated from invented geometry.
        </p>
      </header>

      <div className="flex flex-col gap-6 px-9 pt-7 pb-8">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor={nameId}>Project name</FieldLabel>
          <Input
            id={nameId}
            {...form.register("name")}
            placeholder="Warsaw flat"
            aria-invalid={nameError !== undefined}
            aria-describedby={nameError ? `${nameId}-error` : undefined}
          />
          {nameError && <FieldError id={`${nameId}-error`}>{nameError.message}</FieldError>}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel
            htmlFor={floorPlanId}
            hint={
              <span className="text-label font-medium tracking-[0.08em] text-accent uppercase">
                Required
              </span>
            }
          >
            Floor plan
          </FieldLabel>

          <input
            ref={fileInput}
            id={floorPlanId}
            type="file"
            accept={floorPlanAccept}
            className="sr-only"
            aria-invalid={floorPlanError !== undefined}
            aria-describedby={floorPlanError ? `${floorPlanId}-error` : undefined}
            onChange={(event) => void pickFloorPlan(event.target.files?.[0])}
          />

          <FloorPlanControl
            selection={selection}
            isDragging={isDragging}
            hasError={floorPlanError !== undefined}
            onBrowse={() => fileInput.current?.click()}
            onDraggingChange={setIsDragging}
            onDrop={(file) => void pickFloorPlan(file)}
          />

          {floorPlanError && <FieldError id={`${floorPlanId}-error`}>{floorPlanError}</FieldError>}
        </div>

        {form.formState.errors.root && (
          <FieldError>{form.formState.errors.root.message}</FieldError>
        )}

        <div className="flex items-center gap-4 pt-0.5">
          <p className="flex-1 text-meta leading-[1.5] text-muted">
            You can map rooms right after this.
          </p>
          <Button type="submit" disabled={createProject.isPending}>
            {createProject.isPending ? "Creating…" : "Create project"}
            <ArrowRight />
          </Button>
        </div>
      </div>
    </form>
  );
}

function FloorPlanControl({
  selection,
  isDragging,
  hasError,
  onBrowse,
  onDraggingChange,
  onDrop,
}: {
  selection: FloorPlanSelection | undefined;
  isDragging: boolean;
  hasError: boolean;
  onBrowse: () => void;
  onDraggingChange: (dragging: boolean) => void;
  onDrop: (file: File | undefined) => void;
}) {
  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      onDraggingChange(true);
    },
    onDragLeave: () => onDraggingChange(false),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      onDraggingChange(false);
      onDrop(event.dataTransfer.files[0]);
    },
  };

  if (selection) {
    return (
      <div
        {...dropHandlers}
        className="flex items-center gap-3.5 rounded-lg border border-hairline bg-surface p-3.5 shadow-[0_2px_6px_-2px_rgb(15_26_21/0.10)] transition-colors duration-200 ease-settle"
      >
        <img
          src={selection.previewUrl}
          alt=""
          className="size-16 shrink-0 rounded-[9px] border border-hairline bg-surface object-contain"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14.5px] font-semibold text-ink">
            {selection.upload.fileName}
          </span>
          <span className="text-meta text-muted">
            {selection.upload.contentType.replace("image/", "").toUpperCase()} ·{" "}
            {formatBytes(selection.byteSize)} · {selection.width} × {selection.height}
          </span>
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="w-16 shrink-0 text-right text-meta font-medium text-accent transition-colors duration-[120ms] ease-settle hover:text-accent-hover"
        >
          Replace
        </button>
      </div>
    );
  }

  const tone = hasError
    ? "border-danger bg-danger-wash"
    : isDragging
      ? "border-accent bg-accent-wash"
      : "border-hairline-strong bg-surface-sunk hover:border-accent/50";

  return (
    <button
      type="button"
      onClick={onBrowse}
      {...dropHandlers}
      className={`flex w-full flex-col items-center gap-3.5 rounded-lg border-[1.5px] border-dashed px-6 py-[34px] transition-colors duration-[120ms] ease-settle ${tone}`}
    >
      {hasError ? (
        <AlertIcon className="text-danger" />
      ) : isDragging ? (
        <UploadIcon className="text-accent" />
      ) : (
        <PlanIconLarge className="text-accent" />
      )}
      {isDragging ? (
        <span className="text-[15px] font-semibold text-accent">Release to attach</span>
      ) : (
        <span className="flex flex-col items-center gap-1.5">
          <span className="text-[15px] font-medium text-ink">Drop your floor plan here</span>
          <span className="text-meta text-muted">
            or <span className="font-semibold text-accent">browse files</span> · PNG, JPEG, WebP up
            to {maxFloorPlanMegabytes} MB
          </span>
        </span>
      )}
    </button>
  );
}
