import {
  type FloorPlanContentType,
  type FloorPlanUpload,
  floorPlanContentTypes,
  MAX_FLOOR_PLAN_BYTES,
} from "@home-bird/shared/apartment-project";

export const maxFloorPlanMegabytes = MAX_FLOOR_PLAN_BYTES / (1024 * 1024);

const isSupported = (type: string): type is FloorPlanContentType =>
  (floorPlanContentTypes as ReadonlyArray<string>).includes(type);

const toBase64 = (bytes: Uint8Array) => {
  // Chunked so a 10 MB plan doesn't blow the argument limit of fromCharCode.
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

/** Decodes the image to confirm the browser can actually read it, and measures it. */
const measure = (previewUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight }),
    );
    image.addEventListener("error", () => reject(new Error("undecodable")));
    image.src = previewUrl;
  });

export interface FloorPlanSelection {
  readonly upload: FloorPlanUpload;
  readonly previewUrl: string;
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Turns a picked file into the shape the shared schema validates, plus what the
 * preview needs. Rejects here are the ones the schema cannot see from a base64
 * string alone — a file the browser itself refuses to decode.
 */
export const readFloorPlanFile = async (file: File): Promise<FloorPlanSelection> => {
  if (!isSupported(file.type)) {
    throw new Error("Floor plan must be a PNG, JPEG, or WebP image");
  }
  if (file.size > MAX_FLOOR_PLAN_BYTES) {
    throw new Error(`Floor plan image must be ${maxFloorPlanMegabytes} MB or smaller`);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new Error("Floor plan image could not be read");
  }

  const previewUrl = URL.createObjectURL(file);
  let size: { width: number; height: number };
  try {
    size = await measure(previewUrl);
  } catch {
    URL.revokeObjectURL(previewUrl);
    throw new Error("Floor plan image could not be read");
  }

  return {
    upload: { fileName: file.name, contentType: file.type, data: toBase64(bytes) },
    previewUrl,
    byteSize: file.size,
    ...size,
  };
};

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
