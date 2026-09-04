import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import { InvalidRequest, NotFound } from "../../../http/trpc.ts";
import { ApartmentProjectService } from "../apartment-project-service.ts";
import { ImageStorage } from "../image-storage.ts";
import { floorPlanUpload, pngBase64, pngBytes } from "./floor-plan-fixture.ts";

const testLayer = ApartmentProjectService.testLayer.pipe(
  Layer.provideMerge(ImageStorage.testLayer),
);

describe("ApartmentProjectService", () => {
  it.effect("creates a project with its floor plan", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentProjectService;
      yield* TestClock.adjust("5 seconds");

      const project = yield* service.create({ name: "Warsaw flat", floorPlan: floorPlanUpload });

      expect(project.name).toBe("Warsaw flat");
      expect(project.floorPlan).toEqual({
        fileName: "ground-floor.png",
        contentType: "image/png",
        byteSize: pngBytes.length,
      });
      expect(project.createdAt.getTime()).toBe(5000);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("retains the uploaded floor plan image", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentProjectService;
      const project = yield* service.create({ name: "Warsaw flat", floorPlan: floorPlanUpload });

      const image = yield* service.floorPlanImage(project.id);

      expect(image.contentType).toBe("image/png");
      expect(image.fileName).toBe("ground-floor.png");
      expect(Uint8Array.from(image.bytes)).toEqual(pngBytes);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("refuses a floor plan that is not the image it claims to be", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentProjectService;

      const error = yield* Effect.flip(
        service.create({
          name: "Warsaw flat",
          floorPlan: {
            fileName: "ground-floor.png",
            contentType: "image/png",
            data: Buffer.from("this is not an image").toString("base64"),
          },
        }),
      );

      expect(error).toBeInstanceOf(InvalidRequest);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("reports an unknown project as not found", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentProjectService;

      const error = yield* Effect.flip(service.byId("11111111-1111-1111-1111-111111111111"));

      expect(error).toBeInstanceOf(NotFound);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("lists projects newest first", () =>
    Effect.gen(function* () {
      const service = yield* ApartmentProjectService;
      yield* service.create({ name: "older", floorPlan: floorPlanUpload });
      const newer = yield* service.create({
        name: "newer",
        floorPlan: { ...floorPlanUpload, data: pngBase64 },
      });

      const list = yield* service.list;

      expect(list.map((project) => project.name)).toEqual(["newer", "older"]);
      expect(list[0]!.id).toBe(newer.id);
    }).pipe(Effect.provide(testLayer)),
  );
});
