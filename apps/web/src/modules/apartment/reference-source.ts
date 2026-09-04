import {
  type ReferenceSource,
  referenceDataUrl,
  referenceImageIssue,
  referenceUrlIssue,
} from "@home-bird/shared/apartment-reference";
import { isSupportedImageContentType } from "@home-bird/shared/image-file";

const toBase64 = (bytes: Uint8Array) => {
  // Chunked so a 10 MB image doesn't blow the argument limit of fromCharCode.
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

export interface ReferenceSelection {
  readonly source: ReferenceSource;
  /** Built from the bytes in hand, so showing a preview contacts nobody. */
  readonly previewUrl: string;
  readonly byteSize: number;
}

/**
 * Turns a picked file into the source the api takes, refusing in the same words
 * the api would so the user hears one answer wherever the check happens.
 */
export const readReferenceFile = async (file: File): Promise<ReferenceSelection> => {
  if (!isSupportedImageContentType(file.type)) {
    throw new Error("Reference must be a PNG, JPEG, or WebP image");
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new Error("Reference image could not be read");
  }

  const issue = referenceImageIssue(bytes, file.type);
  if (issue !== undefined) throw new Error(issue);

  const data = toBase64(bytes);
  return {
    source: { kind: "upload", fileName: file.name, contentType: file.type, data },
    previewUrl: referenceDataUrl({ contentType: file.type, data }),
    byteSize: bytes.length,
  };
};

/**
 * Turns a typed link into the source the api takes. Only the shape is checked
 * here — whether the link really returns an image is the api's answer to give,
 * once it has fetched it.
 */
export const readReferenceLink = (url: string): ReferenceSource => {
  const issue = referenceUrlIssue(url);
  if (issue !== undefined) throw new Error(issue);
  return { kind: "link", url: url.trim() };
};
