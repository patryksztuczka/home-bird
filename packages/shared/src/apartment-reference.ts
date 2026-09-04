import { Schema } from "effect";
import {
  imageAccept,
  ImageContentType,
  imageContentTypes,
  decodeImageData,
  isReadableAs,
  MAX_IMAGE_BYTES,
  maxImageMegabytes,
} from "./image-file.ts";

/**
 * References: the images a user attaches to say what the apartment should look
 * like. One image per component, and the same rules run in the browser and the
 * api so a refusal is worded identically wherever it is made.
 */

/** The components an apartment-wide reference may be attached to. Panel order. */
export const ReferenceComponent = Schema.Literals([
  "overall-style",
  "floor",
  "walls",
  "ceiling",
  "doors",
  "windows",
  "lighting",
]).annotate({
  message: "Pick a component to attach the reference to",
});
export type ReferenceComponent = typeof ReferenceComponent.Type;

export const referenceComponents = ReferenceComponent.literals;

export const referenceComponentLabels: Record<ReferenceComponent, string> = {
  "overall-style": "Overall style",
  floor: "Floor",
  walls: "Walls",
  ceiling: "Ceiling",
  doors: "Doors",
  windows: "Windows",
  lighting: "Lighting",
};

/**
 * How a reference is meant to be read when generating. Overall style sets the
 * mood; every other component is a request to reproduce what is in the image.
 */
export type ReferenceUse = "general-inspiration" | "close-visual-match";

export const referenceUse = (component: ReferenceComponent): ReferenceUse =>
  component === "overall-style" ? "general-inspiration" : "close-visual-match";

/** References accept the same formats and ceiling as any other uploaded image. */
export const MAX_REFERENCE_BYTES = MAX_IMAGE_BYTES;
export const referenceContentTypes = imageContentTypes;
export const referenceAccept = imageAccept;

export const ReferenceContentType = ImageContentType.annotate({
  message: "Reference must be a PNG, JPEG, or WebP image",
});

/**
 * Why these bytes cannot be attached, or `undefined` when they can.
 * The returned wording is shown to the user as-is.
 */
export const referenceImageIssue = (
  bytes: Uint8Array,
  contentType: ImageContentType,
): string | undefined => {
  if (bytes.length > MAX_REFERENCE_BYTES) {
    return `Reference image must be ${maxImageMegabytes} MB or smaller`;
  }
  if (!isReadableAs(bytes, contentType)) return "Reference image could not be read";
  return undefined;
};

/**
 * Why this link cannot be used, or `undefined` when it can. Whether the link
 * actually returns an image is only knowable by fetching it — the api says so
 * in its own words once it has tried.
 */
export const referenceUrlIssue = (url: string): string | undefined => {
  const trimmed = url.trim();
  if (trimmed.length === 0) return "A link to the image is required";
  // Matched rather than parsed: this module runs in the browser and the api, and
  // only needs to know the link is an absolute http(s) one. Whether it returns an
  // image is settled by fetching it.
  if (!/^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i.test(trimmed)) {
    return "Enter a link starting with http:// or https://";
  }
  return undefined;
};

// Standard Schema versions of the reference inputs, used verbatim as tRPC
// procedure inputs in the api and as the client's mutation contract.

/** An image the user picked from their own machine, base64 so the contract stays JSON. */
export const ReferenceUploadSource = Schema.Struct({
  kind: Schema.Literal("upload"),
  fileName: Schema.String.check(Schema.isNonEmpty({ message: "Reference file name is required" })),
  contentType: ReferenceContentType,
  data: Schema.String.check(Schema.isNonEmpty({ message: "Reference image is required" })),
}).check(
  Schema.makeFilter((source) => {
    const bytes = decodeImageData(source.data);
    if (bytes === undefined) return { path: ["data"], issue: "Reference image could not be read" };
    const issue = referenceImageIssue(bytes, source.contentType);
    return issue === undefined ? undefined : { path: ["data"], issue };
  }),
);

/** A link the api will fetch once; the bytes are kept, not the link's availability. */
export const ReferenceLinkSource = Schema.Struct({
  kind: Schema.Literal("link"),
  url: Schema.String.check(
    Schema.makeFilter((url) => {
      const issue = referenceUrlIssue(url);
      return issue === undefined ? undefined : { path: [], issue };
    }),
  ),
});

export const ReferenceSource = Schema.Union([ReferenceUploadSource, ReferenceLinkSource]);
export type ReferenceSource = typeof ReferenceSource.Type;

export const AttachApartmentReferenceInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    apartmentProjectId: Schema.NonEmptyString,
    component: ReferenceComponent,
    source: ReferenceSource,
  }),
);
export type AttachApartmentReferenceInput = typeof AttachApartmentReferenceInput.Type;

export const ApartmentReferenceComponentInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    apartmentProjectId: Schema.NonEmptyString,
    component: ReferenceComponent,
  }),
);
export type ApartmentReferenceComponentInput = typeof ApartmentReferenceComponentInput.Type;

export const ApartmentReferencesInput = Schema.toStandardSchemaV1(
  Schema.Struct({ apartmentProjectId: Schema.NonEmptyString }),
);
export type ApartmentReferencesInput = typeof ApartmentReferencesInput.Type;

export const ReferenceIdInput = Schema.toStandardSchemaV1(
  Schema.Struct({ id: Schema.NonEmptyString }),
);
export type ReferenceIdInput = typeof ReferenceIdInput.Type;

/** Renders a reference image fetched over tRPC into something an <img> can display. */
export const referenceDataUrl = (image: { readonly contentType: string; readonly data: string }) =>
  `data:${image.contentType};base64,${image.data}`;
