import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { InvalidRequest, NotFound } from "../../../http/trpc.ts";
import { RoomAreaService } from "../room-area-service.ts";

const projectId = "3b0f1f2c-2b2a-4a1e-9f4a-1c2d3e4f5a6b";

const square = [
  { x: 0.1, y: 0.1 },
  { x: 0.5, y: 0.1 },
  { x: 0.5, y: 0.5 },
  { x: 0.1, y: 0.5 },
];

const bowTie = [
  { x: 0.1, y: 0.1 },
  { x: 0.5, y: 0.5 },
  { x: 0.5, y: 0.1 },
  { x: 0.1, y: 0.5 },
];

const area = (overrides: Record<string, unknown> = {}) => ({
  apartmentProjectId: projectId,
  roomType: "bedroom" as const,
  name: "",
  boundary: square,
  ...overrides,
});

describe("RoomAreaService", () => {
  it.effect("maps a room and lists it under its project", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;
      yield* TestClock.adjust("5 seconds");

      const created = yield* service.create(area({ roomType: "kitchen", name: "  Galley  " }));

      expect(created.roomType).toBe("kitchen");
      // A custom name is stored trimmed; empty means the room goes by its type.
      expect(created.name).toBe("Galley");
      expect(created.boundary).toEqual(square);
      expect(created.createdAt.getTime()).toBe(5000);
      expect(yield* service.list(projectId)).toEqual([created]);
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );

  it.effect("refuses a boundary that crosses itself", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;

      const error = yield* Effect.flip(service.create(area({ boundary: bowTie })));

      expect(error).toBeInstanceOf(InvalidRequest);
      expect((error as InvalidRequest).message).toBe("The boundary crosses itself");
      expect(yield* service.list(projectId)).toEqual([]);
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );

  it.effect("corrects a room's type, name, and boundary", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;
      const created = yield* service.create(area());
      const wider = [...square.slice(0, 2), { x: 0.5, y: 0.7 }, { x: 0.1, y: 0.7 }];

      const updated = yield* service.update({
        id: created.id,
        roomType: "office",
        name: "Study",
        boundary: wider,
      });

      expect(updated.id).toBe(created.id);
      expect(updated.roomType).toBe("office");
      expect(updated.name).toBe("Study");
      expect(updated.boundary).toEqual(wider);
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );

  it.effect("refuses to correct a room into an invalid shape", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;
      const created = yield* service.create(area());

      const error = yield* Effect.flip(
        service.update({ id: created.id, roomType: "bedroom", name: "", boundary: bowTie }),
      );

      expect(error).toBeInstanceOf(InvalidRequest);
      // The stored room is untouched by the refused correction.
      expect((yield* service.list(projectId))[0]?.boundary).toEqual(square);
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );

  it.effect("deletes a room", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;
      const created = yield* service.create(area());

      yield* service.remove(created.id);

      expect(yield* service.list(projectId)).toEqual([]);
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );

  it.effect("reports an unknown room rather than silently doing nothing", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;

      const error = yield* Effect.flip(service.remove("2a1b3c4d-5e6f-4a1b-8c9d-0e1f2a3b4c5d"));

      expect(error).toBeInstanceOf(NotFound);
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );

  it.effect("will not call an unmapped apartment complete", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;

      const error = yield* Effect.flip(service.confirmMapping(projectId));

      expect(error).toBeInstanceOf(InvalidRequest);
      expect((error as InvalidRequest).message).toBe(
        "Draw an area around every room before confirming",
      );
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );

  it.effect("confirms mapping once a room is mapped", () =>
    Effect.gen(function* () {
      const service = yield* RoomAreaService;
      yield* service.create(area());
      yield* TestClock.adjust("8 seconds");

      const confirmedAt = yield* service.confirmMapping(projectId);

      expect(confirmedAt.getTime()).toBe(8000);
    }).pipe(Effect.provide(RoomAreaService.testLayer)),
  );
});
