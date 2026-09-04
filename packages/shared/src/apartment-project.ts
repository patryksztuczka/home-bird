import { Encoding, Result, Schema } from "effect";

// Standard Schema (standardschema.dev) versions of domain inputs.
// Usable as tRPC procedure inputs AND react-hook-form resolvers.

/** Raster formats a floor plan may be uploaded in. */
export const FloorPlanContentType = Schema.Literals([
  "image/png",
  "image/jpeg",
  "image/webp",
]).annotate({
  message: "Floor plan must be a PNG, JPEG, or WebP image",
});
export type FloorPlanContentType = typeof FloorPlanContentType.Type;

export const floorPlanContentTypes = FloorPlanContentType.literals;

/** Accepted by a file picker as the `accept` attribute. */
export const floorPlanAccept = floorPlanContentTypes.join(",");

export const MAX_FLOOR_PLAN_BYTES = 10 * 1024 * 1024;

const magicBytes: Record<FloorPlanContentType, ReadonlyArray<ReadonlyArray<number>>> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  // RIFF....WEBP — bytes 4..7 are the file size, so only the two markers are fixed.
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46],
    [0x57, 0x45, 0x42, 0x50],
  ],
};

const magicOffsets: Record<FloorPlanContentType, ReadonlyArray<number>> = {
  "image/png": [0],
  "image/jpeg": [0],
  "image/webp": [0, 8],
};

/**
 * True when `bytes` really begins with the signature of `contentType`.
 * Used on both sides so a renamed `.txt` is refused before it is stored.
 */
export const isReadableAs = (bytes: Uint8Array, contentType: FloorPlanContentType): boolean =>
  magicBytes[contentType].every((signature, index) => {
    const offset = magicOffsets[contentType][index]!;
    return signature.every((byte, position) => bytes[offset + position] === byte);
  });

/** Decodes the base64 payload of a floor plan upload, or `undefined` if it is not base64. */
export const decodeFloorPlanData = (data: string): Uint8Array | undefined =>
  Result.getOrUndefined(Encoding.decodeBase64(data));

const FloorPlanUploadFields = {
  fileName: Schema.String.check(Schema.isNonEmpty({ message: "Floor plan file name is required" })),
  contentType: FloorPlanContentType,
  /** The image itself, base64-encoded so the contract stays plain JSON. */
  data: Schema.String.check(Schema.isNonEmpty({ message: "Floor plan image is required" })),
};

export const FloorPlanUpload = Schema.Struct(FloorPlanUploadFields).check(
  Schema.makeFilter((upload) => {
    const bytes = decodeFloorPlanData(upload.data);
    if (bytes === undefined) {
      return { path: ["data"], issue: "Floor plan image could not be read" };
    }
    if (bytes.length > MAX_FLOOR_PLAN_BYTES) {
      return {
        path: ["data"],
        issue: `Floor plan image must be ${MAX_FLOOR_PLAN_BYTES / (1024 * 1024)} MB or smaller`,
      };
    }
    if (!isReadableAs(bytes, upload.contentType)) {
      return { path: ["data"], issue: "Floor plan image could not be read" };
    }
    return undefined;
  }),
);
export type FloorPlanUpload = typeof FloorPlanUpload.Type;

export const CreateApartmentProjectInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    name: Schema.String.check(
      Schema.isNonEmpty({ message: "Apartment project name is required" }),
      Schema.isMaxLength(120, { message: "Apartment project name is too long" }),
    ),
    floorPlan: FloorPlanUpload.annotateKey({
      messageMissingKey: "A floor plan is required",
    }),
  }),
);
export type CreateApartmentProjectInput = typeof CreateApartmentProjectInput.Type;

export const ApartmentProjectIdInput = Schema.toStandardSchemaV1(
  Schema.Struct({
    id: Schema.NonEmptyString,
  }),
);
export type ApartmentProjectIdInput = typeof ApartmentProjectIdInput.Type;

/** Renders a floor plan fetched over tRPC into something an <img> can display. */
export const floorPlanDataUrl = (image: { readonly contentType: string; readonly data: string }) =>
  `data:${image.contentType};base64,${image.data}`;
