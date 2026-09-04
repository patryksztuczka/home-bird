/** A real 1×1 PNG, so tests exercise the same signature check as production. */
export const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC";

export const pngBytes = Uint8Array.from(Buffer.from(pngBase64, "base64"));

export const floorPlanUpload = {
  fileName: "ground-floor.png",
  contentType: "image/png",
  data: pngBase64,
} as const;
