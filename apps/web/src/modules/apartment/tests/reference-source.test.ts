import { describe, expect, it } from "vitest";
import { pngBase64 } from "../../../../../api/src/modules/apartment/tests/floor-plan-fixture.ts";
import { readReferenceFile, readReferenceLink } from "../reference-source.ts";

const pngFile = (name = "oak.png", type = "image/png") =>
  new File([Uint8Array.from(Buffer.from(pngBase64, "base64"))], name, { type });

describe("picking a reference file", () => {
  it("turns a picked image into the source the api takes", async () => {
    const selection = await readReferenceFile(pngFile());

    expect(selection.source).toEqual({
      kind: "upload",
      fileName: "oak.png",
      contentType: "image/png",
      data: pngBase64,
    });
    // The preview is built from the bytes we already hold — no host is contacted.
    expect(selection.previewUrl).toBe(`data:image/png;base64,${pngBase64}`);
  });

  it("refuses a file type that is not a supported image", async () => {
    await expect(readReferenceFile(pngFile("plan.tiff", "image/tiff"))).rejects.toThrow(
      "Reference must be a PNG, JPEG, or WebP image",
    );
  });

  it("refuses a file whose bytes are not the image it claims to be", async () => {
    const fake = new File([new TextEncoder().encode("plain text")], "oak.png", {
      type: "image/png",
    });

    await expect(readReferenceFile(fake)).rejects.toThrow("Reference image could not be read");
  });
});

describe("typing a reference link", () => {
  it("turns a direct link into the source the api takes", () => {
    expect(readReferenceLink("  https://cdn.example.com/oak.jpg  ")).toEqual({
      kind: "link",
      url: "https://cdn.example.com/oak.jpg",
    });
  });

  it("refuses anything that is not an http link", () => {
    expect(() => readReferenceLink("pinterest.com/pin/1")).toThrow(
      "Enter a link starting with http:// or https://",
    );
  });
});
