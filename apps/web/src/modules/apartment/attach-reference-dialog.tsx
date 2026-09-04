import {
  referenceAccept,
  referenceComponentLabels,
  referenceUse,
} from "@home-bird/shared/apartment-reference";
import { maxImageMegabytes } from "@home-bird/shared/image-file";
import { Button, Input } from "@home-bird/ui";
import { useEffect, useRef, useState } from "react";
import { AlertIcon, PlusIcon } from "./icons";
import { readReferenceFile, readReferenceLink, type ReferenceSelection } from "./reference-source";
import type { ApartmentReferences } from "./use-apartment-references";

const tabs = [
  { id: "upload", label: "Local image" },
  { id: "link", label: "Image link" },
] as const;

type Tab = (typeof tabs)[number]["id"];

/**
 * Attaching one reference. A component holds a single image, so when it already
 * has one this dialog shows what is being given up before it asks for the new one.
 */
export function AttachReferenceDialog({ references }: { references: ApartmentReferences }) {
  const draft = references.draft;
  const [tab, setTab] = useState<Tab>("upload");
  const [selection, setSelection] = useState<ReferenceSelection>();
  const [link, setLink] = useState("");
  const [localError, setLocalError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  const component = draft?.component;

  useEffect(() => {
    if (draft === undefined) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") references.cancelAttaching();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [draft, references]);

  if (draft === undefined || component === undefined) return null;

  const label = referenceComponentLabels[component];
  const use = referenceUse(component);
  const error = localError ?? references.attachError;

  const pick = async (file: File | undefined) => {
    if (file === undefined) return;
    setLocalError(undefined);
    references.clearAttachError();
    try {
      setSelection(await readReferenceFile(file));
    } catch (cause) {
      setSelection(undefined);
      setLocalError(cause instanceof Error ? cause.message : "Reference image could not be read");
    }
  };

  const submit = () => {
    if (tab === "upload") {
      if (selection === undefined) return;
      references.attach(selection.source);
      return;
    }
    setLocalError(undefined);
    try {
      references.attach(readReferenceLink(link));
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "That link cannot be used");
    }
  };

  const ready = tab === "upload" ? selection !== undefined : link.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-20 flex items-start justify-center bg-ink/35 px-6 pt-[14vh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) references.cancelAttaching();
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={`Add ${label.toLowerCase()} reference`}
        className="flex w-full max-w-[600px] flex-col rounded-[20px] bg-surface shadow-lifted"
      >
        <div className="flex items-start gap-4 px-6 pt-6 pb-[18px]">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">
              {draft.replacing ? `Replace the ${label} reference?` : `Add a ${label} reference`}
            </h2>
            <p className="text-meta text-muted">
              Applies to the whole apartment ·{" "}
              {use === "general-inspiration"
                ? "used as general inspiration"
                : "matched closely in every room"}
            </p>
          </div>
          <button
            type="button"
            onClick={references.cancelAttaching}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-[120ms] ease-settle hover:bg-surface-sunk hover:text-ink"
          >
            <span className="rotate-45">
              <PlusIcon />
            </span>
          </button>
        </div>

        {draft.replacing && (
          <p className="mx-6 mb-[18px] rounded-xl bg-surface-sunk px-4 py-3 text-meta leading-[1.5] text-muted">
            Each component holds one reference. Attaching a new image removes{" "}
            <span className="font-medium text-ink">{draft.replacing.fileName}</span>, and every room
            following the apartment default will use the new one.
          </p>
        )}

        <div className="flex gap-6 border-b border-hairline px-6">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setTab(entry.id);
                setLocalError(undefined);
                references.clearAttachError();
              }}
              className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors duration-[120ms] ease-settle ${
                tab === entry.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 px-6 py-6">
          {tab === "upload" ? (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={referenceAccept}
                className="hidden"
                onChange={(event) => {
                  void pick(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void pick(event.dataTransfer.files[0]);
                }}
                className={`flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors duration-[120ms] ease-settle ${
                  localError
                    ? "border-danger bg-danger-wash"
                    : "border-hairline-strong bg-surface-sunk hover:border-accent"
                }`}
              >
                {selection ? (
                  <>
                    <img
                      src={selection.previewUrl}
                      alt=""
                      className="max-h-[120px] rounded-lg object-contain"
                    />
                    <span className="text-[15px] font-semibold text-ink">
                      {selection.source.kind === "upload" ? selection.source.fileName : ""}
                    </span>
                    <span className="text-meta text-muted">Click to choose a different image</span>
                  </>
                ) : (
                  <>
                    <span className={localError ? "text-danger" : "text-accent"}>
                      <PlusIcon />
                    </span>
                    <span
                      className={`text-base font-semibold ${localError ? "text-danger" : "text-ink"}`}
                    >
                      {localError ?? "Drop an image here"}
                    </span>
                    <span className="text-meta text-muted">
                      JPG, PNG or WEBP · up to {maxImageMegabytes} MB
                    </span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="reference-link" className="text-meta font-semibold text-ink">
                Direct image URL
              </label>
              <Input
                id="reference-link"
                value={link}
                onChange={(event) => {
                  setLink(event.target.value);
                  setLocalError(undefined);
                  references.clearAttachError();
                }}
                placeholder="https://cdn.example.com/refs/oak-herringbone.jpg"
                aria-invalid={error !== undefined}
              />
              <p className="text-meta leading-[1.5] text-muted">
                The link must point straight at an image file, not at a page containing one.
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-danger-wash px-4 py-3 text-meta leading-[1.5] text-danger"
            >
              <AlertIcon className="mt-px shrink-0" />
              <span>
                {error}
                <span className="mt-1 block text-muted">
                  Nothing was changed — the references you already attached are still in place.
                </span>
              </span>
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="secondary" onClick={references.cancelAttaching}>
            {draft.replacing ? "Keep current" : "Cancel"}
          </Button>
          <Button onClick={submit} disabled={!ready || references.attaching}>
            {references.attaching
              ? "Attaching…"
              : draft.replacing
                ? "Replace image"
                : "Attach reference"}
          </Button>
        </div>
      </div>
    </div>
  );
}
