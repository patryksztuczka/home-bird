import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import { InvalidRequest, NotFound } from "../../../http/trpc.ts";
import { ApartmentReferenceService } from "../apartment-reference-service.ts";
import { ImageFetcher } from "../image-fetcher.ts";
import { ImageStorage } from "../image-storage.ts";
import { pngBase64, pngBytes } from "./floor-plan-fixture.ts";

const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a]);

const linkUrl = "https://cdn.example.com/refs/oak-herringbone.jpg";

const reachable = ImageFetcher.serving(
  new Map([[linkUrl, { bytes: jpegBytes, contentType: "image/jpeg" }]]),
);

const withFetcher = (fetcher: Layer.Layer<ImageFetcher>) =>
  ApartmentReferenceService.testLayer.pipe(
    Layer.provideMerge(Layer.mergeAll(ImageStorage.testLayer, fetcher)),
  );

const projectId = "3b0f1f2c-2b2a-4a1e-9f4a-1c2d3e4f5a6b";

const upload = (overrides: Record<string, unknown> = {}) =>
  ({
    kind: "upload",
    fileName: "oak-herringbone.jpg",
    contentType: "image/png",
    data: pngBase64,
    ...overrides,
  }) as const;

const testLayer = ApartmentReferenceService.testLayer.pipe(
  Layer.provideMerge(Layer.mergeAll(ImageStorage.testLayer, ImageFetcher.testLayer)),
);

describe("ApartmentReferenceService", () => {
  it.effect("attaches a local image to a component and lists it under its project", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;
      yield* TestClock.adjust("5 seconds");

      const attached = yield* service.attach({
        apartmentProjectId: projectId,
        component: "floor",
        source: upload(),
      });

      expect(attached.component).toBe("floor");
      // Overall style is inspiration; every other component asks for a close match.
      expect(attached.use).toBe("close-visual-match");
      expect(attached.fileName).toBe("oak-herringbone.jpg");
      expect(attached.byteSize).toBe(pngBytes.length);
      expect(attached.sourceUrl).toBeNull();
      expect(attached.createdAt.getTime()).toBe(5000);
      expect(yield* service.list(projectId)).toEqual([attached]);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("retains the attached image so it can be previewed", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;
      const attached = yield* service.attach({
        apartmentProjectId: projectId,
        component: "walls",
        source: upload({ fileName: "lime-plaster.png" }),
      });

      const image = yield* service.image(attached.id);

      expect(image.fileName).toBe("lime-plaster.png");
      expect(image.contentType).toBe("image/png");
      expect(Uint8Array.from(image.bytes)).toEqual(pngBytes);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("replaces the image on a component without touching the others", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;
      const floor = yield* service.attach({
        apartmentProjectId: projectId,
        component: "floor",
        source: upload(),
      });
      const walls = yield* service.attach({
        apartmentProjectId: projectId,
        component: "walls",
        source: upload({ fileName: "lime-plaster.png" }),
      });

      const replaced = yield* service.attach({
        apartmentProjectId: projectId,
        component: "floor",
        source: upload({ fileName: "oak-herringbone-2.png" }),
      });

      // A component holds one reference: the count stays put and the id is kept.
      expect(replaced.id).toBe(floor.id);
      expect(replaced.fileName).toBe("oak-herringbone-2.png");
      const remaining = yield* service.list(projectId);
      expect(remaining).toHaveLength(2);
      expect(remaining).toContainEqual(walls);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("removes one reference and leaves every other component alone", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;
      yield* service.attach({
        apartmentProjectId: projectId,
        component: "doors",
        source: upload(),
      });
      const lighting = yield* service.attach({
        apartmentProjectId: projectId,
        component: "lighting",
        source: upload({ fileName: "brass-pendant.png" }),
      });

      const removed = yield* service.remove(projectId, "doors");

      expect(removed).toEqual({ component: "doors" });
      expect(yield* service.list(projectId)).toEqual([lighting]);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("says so when asked to remove a component that has no reference", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;

      const error = yield* Effect.flip(service.remove(projectId, "ceiling"));

      expect(error).toBeInstanceOf(NotFound);
      expect((error as NotFound).message).toBe("No reference attached to ceiling");
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("keeps the image behind a link, not the link's availability", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;

      const attached = yield* service.attach({
        apartmentProjectId: projectId,
        component: "overall-style",
        source: { kind: "link", url: linkUrl },
      });

      expect(attached.use).toBe("general-inspiration");
      expect(attached.sourceUrl).toBe(linkUrl);
      // The name comes from the link, so an attached reference always has one to show.
      expect(attached.fileName).toBe("oak-herringbone.jpg");
      expect(attached.contentType).toBe("image/jpeg");
      const image = yield* service.image(attached.id);
      expect(Uint8Array.from(image.bytes)).toEqual(jpegBytes);
    }).pipe(Effect.provide(withFetcher(reachable))),
  );

  it.effect("refuses a link that does not give back an image, keeping what is there", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;
      const floor = yield* service.attach({
        apartmentProjectId: projectId,
        component: "floor",
        source: upload(),
      });

      const error = yield* Effect.flip(
        service.attach({
          apartmentProjectId: projectId,
          component: "walls",
          source: { kind: "link", url: "https://pinterest.com/pin/482103/" },
        }),
      );

      expect(error).toBeInstanceOf(InvalidRequest);
      expect((error as InvalidRequest).message).toBe(
        "That link is not a direct image — it must point straight at a PNG, JPEG, or WebP file",
      );
      expect(yield* service.list(projectId)).toEqual([floor]);
    }).pipe(Effect.provide(withFetcher(reachable))),
  );

  it.effect("refuses bytes that are not the image they claim to be", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentReferenceService;

      const error = yield* Effect.flip(
        service.attach({
          apartmentProjectId: projectId,
          component: "ceiling",
          source: upload({ data: Buffer.from("not an image").toString("base64") }),
        }),
      );

      expect(error).toBeInstanceOf(InvalidRequest);
      expect((error as InvalidRequest).message).toBe("Reference image could not be read");
      expect(yield* service.list(projectId)).toEqual([]);
    }).pipe(Effect.provide(testLayer)),
  );
});
