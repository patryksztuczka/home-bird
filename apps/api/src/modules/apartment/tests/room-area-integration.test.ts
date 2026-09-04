import { afterAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { app } from "../../../app.ts";
import { runtime } from "../../../runtime.ts";
import { floorPlanUpload } from "./floor-plan-fixture.ts";

afterAll(() => runtime.dispose());

const json = <A>(res: Response) => Effect.promise(() => res.json() as Promise<A>);

const trpcQuery = (path: string, input?: unknown) =>
  Effect.promise(async () =>
    app.request(
      input === undefined
        ? `/trpc/${path}`
        : `/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`,
    ),
  );

const trpcMutation = (path: string, body: unknown) =>
  Effect.promise(async () =>
    app.request(`/trpc/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

interface RoomAreaPayload {
  readonly id: string;
  readonly roomType: string;
  readonly name: string;
  readonly boundary: Array<{ readonly x: number; readonly y: number }>;
}

interface ProjectPayload {
  readonly id: string;
  readonly roomMappingConfirmedAt: string | null;
}

const errorMessage = (res: Response) =>
  Effect.map(json<{ error: { message: string } }>(res), (body) => body.error.message);

const data = <A>(res: Response) =>
  Effect.map(json<{ result: { data: A } }>(res), (b) => b.result.data);

const square = [
  { x: 0.1, y: 0.1 },
  { x: 0.5, y: 0.1 },
  { x: 0.5, y: 0.5 },
  { x: 0.1, y: 0.5 },
];

const bowTie = [
  { x: 0.6, y: 0.6 },
  { x: 0.9, y: 0.9 },
  { x: 0.9, y: 0.6 },
  { x: 0.6, y: 0.9 },
];

const newProject = Effect.gen(function* () {
  const res = yield* trpcMutation("apartmentProject.create", {
    name: "Mapped flat",
    floorPlan: floorPlanUpload,
  });
  expect(res.status).toBe(200);
  return yield* data<ProjectPayload>(res);
});

const mapRoom = (apartmentProjectId: string, overrides: Record<string, unknown> = {}) =>
  Effect.gen(function* () {
    const res = yield* trpcMutation("roomArea.create", {
      apartmentProjectId,
      roomType: "bedroom",
      name: "",
      boundary: square,
      ...overrides,
    });
    expect(res.status).toBe(200);
    return yield* data<RoomAreaPayload>(res);
  });

const projectById = (id: string) =>
  Effect.flatMap(trpcQuery("apartmentProject.byId", { id }), data<ProjectPayload>);

const roomsOf = (apartmentProjectId: string) =>
  Effect.flatMap(trpcQuery("roomArea.list", { apartmentProjectId }), data<Array<RoomAreaPayload>>);

describe("room area trpc router", () => {
  it.effect("maps a room, corrects it, and deletes it", () =>
    Effect.gen(function* () {
      const project = yield* newProject;

      const room = yield* mapRoom(project.id, { roomType: "kitchen", name: "Galley" });
      expect(room.roomType).toBe("kitchen");
      expect(room.name).toBe("Galley");
      expect(yield* roomsOf(project.id)).toHaveLength(1);

      const corrected = yield* trpcMutation("roomArea.update", {
        id: room.id,
        roomType: "office",
        name: "Study",
        boundary: [...square.slice(0, 3), { x: 0.1, y: 0.6 }],
      });
      expect(corrected.status).toBe(200);
      expect((yield* data<RoomAreaPayload>(corrected)).name).toBe("Study");

      const deleted = yield* trpcMutation("roomArea.remove", { id: room.id });
      expect(deleted.status).toBe(200);
      expect(yield* roomsOf(project.id)).toHaveLength(0);
    }),
  );

  it.effect("refuses a boundary that crosses itself", () =>
    Effect.gen(function* () {
      const project = yield* newProject;

      const res = yield* trpcMutation("roomArea.create", {
        apartmentProjectId: project.id,
        roomType: "bedroom",
        name: "",
        boundary: bowTie,
      });

      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("The boundary crosses itself");
      expect(yield* roomsOf(project.id)).toHaveLength(0);
    }),
  );

  it.effect("refuses a boundary with too few points", () =>
    Effect.gen(function* () {
      const project = yield* newProject;

      const res = yield* trpcMutation("roomArea.create", {
        apartmentProjectId: project.id,
        roomType: "bedroom",
        name: "",
        boundary: square.slice(0, 2),
      });

      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("at least three points");
    }),
  );

  it.effect("will not confirm mapping for an apartment with no rooms", () =>
    Effect.gen(function* () {
      const project = yield* newProject;

      const res = yield* trpcMutation("roomArea.confirmMapping", { id: project.id });

      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("before confirming");
      expect((yield* projectById(project.id)).roomMappingConfirmedAt).toBeNull();
    }),
  );

  it.effect("confirms mapping, and withdraws it when a room changes", () =>
    Effect.gen(function* () {
      const project = yield* newProject;
      const room = yield* mapRoom(project.id);

      const confirmed = yield* trpcMutation("roomArea.confirmMapping", { id: project.id });
      expect(confirmed.status).toBe(200);
      expect((yield* projectById(project.id)).roomMappingConfirmedAt).not.toBeNull();

      // Redrawing a room means the apartment is no longer known to be fully mapped.
      const corrected = yield* trpcMutation("roomArea.update", {
        id: room.id,
        roomType: "bedroom",
        name: "",
        boundary: [...square.slice(0, 3), { x: 0.1, y: 0.6 }],
      });
      expect(corrected.status).toBe(200);
      expect((yield* projectById(project.id)).roomMappingConfirmedAt).toBeNull();
    }),
  );

  it.effect("withdraws the confirmation when a room is added or deleted", () =>
    Effect.gen(function* () {
      const project = yield* newProject;
      const room = yield* mapRoom(project.id);
      yield* trpcMutation("roomArea.confirmMapping", { id: project.id });

      yield* mapRoom(project.id, {
        boundary: [
          { x: 0.6, y: 0.6 },
          { x: 0.9, y: 0.6 },
          { x: 0.9, y: 0.9 },
          { x: 0.6, y: 0.9 },
        ],
      });
      expect((yield* projectById(project.id)).roomMappingConfirmedAt).toBeNull();

      yield* trpcMutation("roomArea.confirmMapping", { id: project.id });
      yield* trpcMutation("roomArea.remove", { id: room.id });
      expect((yield* projectById(project.id)).roomMappingConfirmedAt).toBeNull();
    }),
  );

  it.effect("reopens a confirmed mapping on request", () =>
    Effect.gen(function* () {
      const project = yield* newProject;
      yield* mapRoom(project.id);
      yield* trpcMutation("roomArea.confirmMapping", { id: project.id });

      const reopened = yield* trpcMutation("roomArea.reopenMapping", { id: project.id });

      expect(reopened.status).toBe(200);
      expect((yield* projectById(project.id)).roomMappingConfirmedAt).toBeNull();
    }),
  );

  it.effect("keeps each apartment's rooms to itself", () =>
    Effect.gen(function* () {
      const first = yield* newProject;
      const second = yield* newProject;
      yield* mapRoom(first.id);

      expect(yield* roomsOf(first.id)).toHaveLength(1);
      expect(yield* roomsOf(second.id)).toHaveLength(0);
    }),
  );

  it.effect("reports an unknown apartment or room", () =>
    Effect.gen(function* () {
      const missing = "11111111-1111-1111-1111-111111111111";

      expect((yield* trpcQuery("roomArea.list", { apartmentProjectId: missing })).status).toBe(404);
      expect((yield* trpcMutation("roomArea.remove", { id: missing })).status).toBe(404);
      expect((yield* trpcMutation("roomArea.confirmMapping", { id: missing })).status).toBe(404);
    }),
  );
});
