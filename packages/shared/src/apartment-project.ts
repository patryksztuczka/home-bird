import { Schema } from "effect";
import {
  decodeImageData,
  imageAccept,
  ImageContentType,
  imageContentTypes,
  isReadableAs,
  MAX_IMAGE_BYTES,
  maxImageMegabytes,
} from "./image-file.ts";

// Standard Schema (standardschema.dev) versions of domain inputs.
// Usable as tRPC procedure inputs AND react-hook-form resolvers.

/** Raster formats a floor plan may be uploaded in. */
export const FloorPlanContentType = ImageContentType.annotate({
  message: "Floor plan must be a PNG, JPEG, or WebP image",
});
export type FloorPlanContentType = typeof FloorPlanContentType.Type;

export const floorPlanContentTypes = imageContentTypes;

/** Accepted by a file picker as the `accept` attribute. */
export const floorPlanAccept = imageAccept;

export const MAX_FLOOR_PLAN_BYTES = MAX_IMAGE_BYTES;

export { isReadableAs };

/** Decodes the base64 payload of a floor plan upload, or `undefined` if it is not base64. */
export const decodeFloorPlanData = decodeImageData;

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
        issue: `Floor plan image must be ${maxImageMegabytes} MB or smaller`,
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
