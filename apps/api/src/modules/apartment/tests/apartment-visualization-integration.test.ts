import "../../../app.ts";
import { Database } from "@home-bird/database";
import { afterAll, describe, expect, it } from "@effect/vitest";
import { Effect, Layer, ManagedRuntime, Result } from "effect";
import { ApartmentProjectService } from "../apartment-project-service.ts";
import { ApartmentVisualizationService } from "../apartment-visualization-service.ts";
import { ImageStorage } from "../image-storage.ts";
import { RoomAreaService } from "../room-area-service.ts";
import {
  type ApartmentVisualizationRequest,
  VisualizationProvider,
  VisualizationProviderFailure,
} from "../visualization-provider.ts";
import { floorPlanUpload, pngBytes } from "./floor-plan-fixture.ts";

const runtimes: Array<ManagedRuntime.ManagedRuntime<unknown, unknown>> = [];
afterAll(async () => Promise.all(runtimes.map((runtime) => runtime.dispose())));

const square = [
  { x: 0.1, y: 0.1 },
  { x: 0.5, y: 0.1 },
  { x: 0.5, y: 0.5 },
  { x: 0.1, y: 0.5 },
];

const makeRuntime = (
  generateApartment: (
    request: ApartmentVisualizationRequest,
  ) => Effect.Effect<
    { readonly bytes: Uint8Array; readonly contentType: string },
    VisualizationProviderFailure
  >,
) => {
  const infrastructure = Layer.mergeAll(
    Database.layer,
    ImageStorage.testLayer,
    Layer.succeed(VisualizationProvider, { generateApartment }),
  );
  const layer = Layer.mergeAll(
    ApartmentProjectService.layer,
    RoomAreaService.layer,
    ApartmentVisualizationService.layer,
  ).pipe(Layer.provideMerge(infrastructure));
  const runtime = ManagedRuntime.make(layer);
  runtimes.push(runtime as ManagedRuntime.ManagedRuntime<unknown, unknown>);
  return runtime;
};

const mappedProject = Effect.gen(function* () {
  const projects = yield* ApartmentProjectService;
  const rooms = yield* RoomAreaService;
  const project = yield* projects.create({ name: "Warsaw flat", floorPlan: floorPlanUpload });
  const room = yield* rooms.create({
    apartmentProjectId: project.id,
    roomType: "kitchen",
    name: "Galley",
    boundary: square,
  });
  yield* rooms.confirmMapping(project.id);
  return { project, room };
});

describe("ApartmentVisualizationService", () => {
  it("passes the confirmed floor plan and named room mapping to a fake provider", async () => {
    const requests: ApartmentVisualizationRequest[] = [];
    const runtime = makeRuntime((request) => {
      requests.push(request);
      return Effect.succeed({ bytes: pngBytes, contentType: "image/png" });
    });

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const { project, room } = yield* mappedProject;
        const visualizations = yield* ApartmentVisualizationService;
        const generated = yield* visualizations.generate(project.id);
        return {
          generated,
          listed: yield* visualizations.list(project.id),
          image: yield* visualizations.image(generated.id),
          room,
        };
      }),
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]?.floorPlan.fileName).toBe("ground-floor.png");
    expect(requests[0]?.floorPlan.bytes).toEqual(pngBytes);
    expect(requests[0]?.rooms).toEqual([
      expect.objectContaining({
        id: result.room.id,
        roomType: "kitchen",
        name: "Galley",
        boundary: square,
      }),
    ]);
    expect(result.generated.status).toBe("complete");
    expect(result.listed[0]?.id).toBe(result.generated.id);
    expect(result.image.bytes).toEqual(pngBytes);
  });

  it("records a failed attempt without changing the project or room mapping", async () => {
    const runtime = makeRuntime(() =>
      Effect.fail(new VisualizationProviderFailure({ message: "provider unavailable" })),
    );

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const { project, room } = yield* mappedProject;
        const visualizations = yield* ApartmentVisualizationService;
        const failure = yield* Effect.result(visualizations.generate(project.id));
        return {
          failure,
          attempts: yield* visualizations.list(project.id),
          project: yield* ApartmentProjectService.byId(project.id),
          rooms: yield* RoomAreaService.list(project.id),
          room,
        };
      }),
    );

    expect(Result.isFailure(result.failure)).toBe(true);
    expect(result.attempts[0]).toMatchObject({
      status: "failed",
      errorMessage: "The visualization provider did not return an image.",
    });
    expect(result.project.roomMappingConfirmedAt).not.toBeNull();
    expect(result.rooms).toEqual([result.room]);
  });

  it("generates from the floor plan before any rooms are mapped", async () => {
    const requests: ApartmentVisualizationRequest[] = [];
    const runtime = makeRuntime((request) => {
      requests.push(request);
      return Effect.succeed({ bytes: pngBytes, contentType: "image/png" });
    });

    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const project = yield* ApartmentProjectService.create({
          name: "Unmapped flat",
          floorPlan: floorPlanUpload,
        });
        return yield* ApartmentVisualizationService.generate(project.id);
      }),
    );

    expect(result.status).toBe("complete");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.rooms).toEqual([]);
  });
});
