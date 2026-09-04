import { Encoding, Result, Schema } from "effect";

/**
 * What makes a byte string a readable image, in one place.
 *
 * Floor plans and references both accept the same raster formats and the same
 * size ceiling, and both are checked in the browser and again in the api. The
 * rules live here so there is a single answer to "can this be read", and each
 * context words its own refusal around it.
 */

/** Raster formats an uploaded image may be in. */
export const ImageContentType = Schema.Literals(["image/png", "image/jpeg", "image/webp"]);
export type ImageContentType = typeof ImageContentType.Type;

export const imageContentTypes = ImageContentType.literals;

/** Accepted by a file picker as the `accept` attribute. */
export const imageAccept = imageContentTypes.join(",");

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const maxImageMegabytes = MAX_IMAGE_BYTES / (1024 * 1024);

const magicBytes: Record<ImageContentType, ReadonlyArray<ReadonlyArray<number>>> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  // RIFF....WEBP — bytes 4..7 are the file size, so only the two markers are fixed.
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46],
    [0x57, 0x45, 0x42, 0x50],
  ],
};

const magicOffsets: Record<ImageContentType, ReadonlyArray<number>> = {
  "image/png": [0],
  "image/jpeg": [0],
  "image/webp": [0, 8],
};

/**
 * True when `bytes` really begins with the signature of `contentType`.
 * Used on both sides so a renamed `.txt` is refused before it is stored.
 */
export const isReadableAs = (bytes: Uint8Array, contentType: ImageContentType): boolean =>
  magicBytes[contentType].every((signature, index) => {
    const offset = magicOffsets[contentType][index]!;
    return signature.every((byte, position) => bytes[offset + position] === byte);
  });

/** Decodes a base64 image payload, or `undefined` if it is not base64. */
export const decodeImageData = (data: string): Uint8Array | undefined =>
  Result.getOrUndefined(Encoding.decodeBase64(data));

export const isSupportedImageContentType = (type: string): type is ImageContentType =>
  (imageContentTypes as ReadonlyArray<string>).includes(type);
