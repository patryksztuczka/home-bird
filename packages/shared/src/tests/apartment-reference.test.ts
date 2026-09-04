import { describe, expect, it } from "vitest";
import {
  referenceComponentLabels,
  referenceComponents,
  referenceUse,
  MAX_REFERENCE_BYTES,
  referenceImageIssue,
  referenceUrlIssue,
} from "../apartment-reference.ts";

describe("reference components", () => {
  it("offers the seven apartment-wide components in panel order", () => {
    expect(referenceComponents).toEqual([
      "overall-style",
      "floor",
      "walls",
      "ceiling",
      "doors",
      "windows",
      "lighting",
    ]);
    expect(referenceComponentLabels.floor).toBe("Floor");
    expect(referenceComponentLabels["overall-style"]).toBe("Overall style");
  });

  it("takes overall style as inspiration and every other component as a close match", () => {
    expect(referenceUse("overall-style")).toBe("general-inspiration");
    expect(referenceUse("floor")).toBe("close-visual-match");
    expect(referenceUse("lighting")).toBe("close-visual-match");
  });
});

describe("reference image rules", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);

  it("accepts a real PNG", () => {
    expect(referenceImageIssue(png, "image/png")).toBeUndefined();
  });

  it("refuses bytes that are not the image type they claim to be", () => {
    expect(referenceImageIssue(Uint8Array.from([0x49, 0x49, 0x2a]), "image/png")).toBe(
      "Reference image could not be read",
    );
  });

  it("refuses an image over the size limit", () => {
    const oversized = new Uint8Array(MAX_REFERENCE_BYTES + 1);
    oversized.set(png.subarray(0, 8));
    expect(referenceImageIssue(oversized, "image/png")).toBe(
      "Reference image must be 10 MB or smaller",
    );
  });
});

describe("reference link rules", () => {
  it("accepts a direct https image link", () => {
    expect(referenceUrlIssue("https://cdn.example.com/refs/oak.jpg")).toBeUndefined();
  });

  it("refuses anything that is not an http link", () => {
    expect(referenceUrlIssue("cdn.example.com/oak.jpg")).toBe(
      "Enter a link starting with http:// or https://",
    );
    expect(referenceUrlIssue("ftp://example.com/oak.jpg")).toBe(
      "Enter a link starting with http:// or https://",
    );
    expect(referenceUrlIssue("  ")).toBe("A link to the image is required");
  });
});
