import { afterAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { app } from "../../../app.ts";
import { runtime } from "../../../runtime.ts";
import { floorPlanUpload, pngBase64 } from "./floor-plan-fixture.ts";

afterAll(() => runtime.dispose());

const json = <A>(res: Response) => Effect.promise(() => res.json() as Promise<A>);

const trpcQuery = (path: string, input: unknown) =>
  Effect.promise(async () =>
    app.request(`/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`),
  );

const trpcMutation = (path: string, body: unknown) =>
  Effect.promise(async () =>
    app.request(`/trpc/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const data = <A>(res: Response) =>
  Effect.map(json<{ result: { data: A } }>(res), (body) => body.result.data);

const uploadSource = (fileName: string) => ({
  kind: "upload" as const,
  fileName,
  contentType: "image/png" as const,
  data: pngBase64,
});

const newProjectAndRoom = Effect.gen(function* () {
  const project = yield* data<{ id: string }>(
    yield* trpcMutation("apartmentProject.create", {
      name: "Warsaw flat",
      floorPlan: floorPlanUpload,
    }),
  );
  const room = yield* data<{ id: string }>(
    yield* trpcMutation("roomArea.create", {
      apartmentProjectId: project.id,
      roomType: "kitchen",
      name: "Kitchen",
      boundary: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.1 },
        { x: 0.5, y: 0.5 },
        { x: 0.1, y: 0.5 },
      ],
    }),
  );
  return { projectId: project.id, roomId: room.id };
});

interface ResolvedReference {
  readonly component: string;
  readonly source: "apartment" | "room" | "unset";
  readonly reference: { readonly id: string; readonly fileName: string } | null;
}

describe("room reference api", () => {
  it.effect("inherits an apartment reference when the room has no override", () =>
    Effect.gen(function* () {
      const { projectId, roomId } = yield* newProjectAndRoom;
      const apartmentFloor = yield* data<{ id: string }>(
        yield* trpcMutation("apartmentReference.attach", {
          apartmentProjectId: projectId,
          component: "floor",
          source: uploadSource("oak-herringbone.png"),
        }),
      );

      const resolved = yield* data<ReadonlyArray<ResolvedReference>>(
        yield* trpcQuery("roomReference.resolved", { roomAreaId: roomId }),
      );

      expect(resolved.map((entry) => entry.component)).toEqual([
        "overall-style",
        "floor",
        "walls",
        "ceiling",
        "doors",
        "windows",
        "lighting",
        "furniture",
        "cabinets",
        "countertops",
        "appliances",
        "other",
      ]);
      expect(resolved.find((entry) => entry.component === "floor")).toEqual({
        component: "floor",
        source: "apartment",
        reference: expect.objectContaining({
          id: apartmentFloor.id,
          fileName: "oak-herringbone.png",
        }),
      });
    }),
  );

  it.effect("a room reference overrides the apartment default without changing it", () =>
    Effect.gen(function* () {
      const { projectId, roomId } = yield* newProjectAndRoom;
      yield* trpcMutation("apartmentReference.attach", {
        apartmentProjectId: projectId,
        component: "floor",
        source: uploadSource("oak-herringbone.png"),
      });

      const roomFloor = yield* data<{ id: string }>(
        yield* trpcMutation("roomReference.attach", {
          roomAreaId: roomId,
          component: "floor",
          source: uploadSource("checkerboard.png"),
        }),
      );
      const resolved = yield* data<ReadonlyArray<ResolvedReference>>(
        yield* trpcQuery("roomReference.resolved", { roomAreaId: roomId }),
      );
      expect(resolved.find((entry) => entry.component === "floor")).toEqual({
        component: "floor",
        source: "room",
        reference: expect.objectContaining({ id: roomFloor.id, fileName: "checkerboard.png" }),
      });

      const apartment = yield* data<ReadonlyArray<{ component: string; fileName: string }>>(
        yield* trpcQuery("apartmentReference.list", { apartmentProjectId: projectId }),
      );
      expect(apartment.find((entry) => entry.component === "floor")?.fileName).toBe(
        "oak-herringbone.png",
      );
    }),
  );

  it.effect("removing a room override restores the apartment default", () =>
    Effect.gen(function* () {
      const { projectId, roomId } = yield* newProjectAndRoom;
      yield* trpcMutation("apartmentReference.attach", {
        apartmentProjectId: projectId,
        component: "walls",
        source: uploadSource("lime-plaster.png"),
      });
      yield* trpcMutation("roomReference.attach", {
        roomAreaId: roomId,
        component: "walls",
        source: uploadSource("blue-paint.png"),
      });

      yield* trpcMutation("roomReference.remove", { roomAreaId: roomId, component: "walls" });
      const resolved = yield* data<ReadonlyArray<ResolvedReference>>(
        yield* trpcQuery("roomReference.resolved", { roomAreaId: roomId }),
      );

      expect(resolved.find((entry) => entry.component === "walls")).toEqual({
        component: "walls",
        source: "apartment",
        reference: expect.objectContaining({ fileName: "lime-plaster.png" }),
      });
    }),
  );

  it.effect("keeps overrides isolated to the room they belong to", () =>
    Effect.gen(function* () {
      const { projectId, roomId } = yield* newProjectAndRoom;
      const secondRoom = yield* data<{ id: string }>(
        yield* trpcMutation("roomArea.create", {
          apartmentProjectId: projectId,
          roomType: "living-room",
          name: "Living room",
          boundary: [
            { x: 0.5, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.5 },
            { x: 0.5, y: 0.5 },
          ],
        }),
      );
      yield* trpcMutation("apartmentReference.attach", {
        apartmentProjectId: projectId,
        component: "lighting",
        source: uploadSource("brass-pendant.png"),
      });
      yield* trpcMutation("roomReference.attach", {
        roomAreaId: roomId,
        component: "lighting",
        source: uploadSource("kitchen-pendants.png"),
      });

      const kitchen = yield* data<ReadonlyArray<ResolvedReference>>(
        yield* trpcQuery("roomReference.resolved", { roomAreaId: roomId }),
      );
      const livingRoom = yield* data<ReadonlyArray<ResolvedReference>>(
        yield* trpcQuery("roomReference.resolved", { roomAreaId: secondRoom.id }),
      );

      expect(kitchen.find((entry) => entry.component === "lighting")?.reference?.fileName).toBe(
        "kitchen-pendants.png",
      );
      expect(livingRoom.find((entry) => entry.component === "lighting")).toEqual({
        component: "lighting",
        source: "apartment",
        reference: expect.objectContaining({ fileName: "brass-pendant.png" }),
      });
    }),
  );

  it.effect("returns the room reference image and replaces one image per component", () =>
    Effect.gen(function* () {
      const { roomId } = yield* newProjectAndRoom;
      const first = yield* data<{ id: string }>(
        yield* trpcMutation("roomReference.attach", {
          roomAreaId: roomId,
          component: "cabinets",
          source: uploadSource("oak-cabinets.png"),
        }),
      );
      const replacement = yield* data<{ id: string; fileName: string }>(
        yield* trpcMutation("roomReference.attach", {
          roomAreaId: roomId,
          component: "cabinets",
          source: uploadSource("sage-cabinets.png"),
        }),
      );

      expect(replacement).toEqual(
        expect.objectContaining({ id: first.id, fileName: "sage-cabinets.png" }),
      );
      const image = yield* data<{ fileName: string; contentType: string; data: string }>(
        yield* trpcQuery("roomReference.image", { id: replacement.id }),
      );
      expect(image).toEqual({
        fileName: "sage-cabinets.png",
        contentType: "image/png",
        data: pngBase64,
      });
    }),
  );
});
