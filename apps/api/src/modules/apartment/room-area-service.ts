import { apartmentProjects, Database, roomAreas } from "@home-bird/database";
import type {
  BoundaryPoint,
  CreateRoomAreaInput,
  RoomType,
  UpdateRoomAreaInput,
} from "@home-bird/shared/room-area";
import { roomBoundaryIssue } from "@home-bird/shared/room-area";
import { asc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Clock, Context, Effect, Layer } from "effect";
import { InvalidRequest, NotFound } from "../../http/trpc.ts";

/** One room of an apartment, as the rest of the product sees it. */
export interface RoomArea {
  readonly id: string;
  readonly apartmentProjectId: string;
  readonly roomType: RoomType;
  /** Empty when the user did not give the room a name of its own. */
  readonly name: string;
  readonly boundary: ReadonlyArray<BoundaryPoint>;
  readonly createdAt: Date;
}

const toRoomArea = (row: typeof roomAreas.$inferSelect): RoomArea => ({
  id: row.id,
  apartmentProjectId: row.apartmentProjectId,
  roomType: row.roomType as RoomType,
  name: row.name,
  boundary: row.boundary,
  createdAt: row.createdAt,
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const noArea = (id: string) => new NotFound({ message: `No room area ${id}` });
const noProject = (id: string) => new NotFound({ message: `No apartment project ${id}` });

/**
 * Repeats the boundary rules the shared schema already applied at the api
 * boundary, so the service cannot be talked into storing a shape the user could
 * never have drawn.
 */
const readBoundary = (boundary: ReadonlyArray<BoundaryPoint>) =>
  Effect.suspend(() => {
    const issue = roomBoundaryIssue(boundary);
    return issue === undefined ? Effect.succeed(boundary) : new InvalidRequest({ message: issue });
  });

/**
 * Room mapping: the areas drawn over a project's floor plan, and the user's
 * statement that the whole interior is now mapped.
 *
 * The confirmation is a column on the project row rather than a table of its own,
 * the same way the floor plan's metadata is — a project has exactly one. It is
 * owned here because it is a claim about room areas: every write to an area
 * withdraws it, so a confirmation always refers to the mapping as it stands.
 */
export class RoomAreaService extends Context.Service<
  RoomAreaService,
  {
    readonly list: (
      apartmentProjectId: string,
    ) => Effect.Effect<Array<RoomArea>, NotFound | EffectDrizzleQueryError>;
    readonly create: (
      input: CreateRoomAreaInput,
    ) => Effect.Effect<RoomArea, InvalidRequest | NotFound | EffectDrizzleQueryError>;
    readonly update: (
      input: UpdateRoomAreaInput,
    ) => Effect.Effect<RoomArea, InvalidRequest | NotFound | EffectDrizzleQueryError>;
    readonly remove: (
      id: string,
    ) => Effect.Effect<{ readonly id: string }, NotFound | EffectDrizzleQueryError>;
    /** Records that the whole interior is mapped. Refused while it is not. */
    readonly confirmMapping: (
      apartmentProjectId: string,
    ) => Effect.Effect<Date, InvalidRequest | NotFound | EffectDrizzleQueryError>;
    /** Withdraws the confirmation so the mapping can be changed again. */
    readonly reopenMapping: (
      apartmentProjectId: string,
    ) => Effect.Effect<void, NotFound | EffectDrizzleQueryError>;
  }
>()("@home-bird/RoomAreaService") {
  static readonly list = (apartmentProjectId: string) =>
    Effect.flatMap(RoomAreaService, (service) => service.list(apartmentProjectId));
  static readonly create = (input: CreateRoomAreaInput) =>
    Effect.flatMap(RoomAreaService, (service) => service.create(input));
  static readonly update = (input: UpdateRoomAreaInput) =>
    Effect.flatMap(RoomAreaService, (service) => service.update(input));
  static readonly remove = (id: string) =>
    Effect.flatMap(RoomAreaService, (service) => service.remove(id));
  static readonly confirmMapping = (apartmentProjectId: string) =>
    Effect.flatMap(RoomAreaService, (service) => service.confirmMapping(apartmentProjectId));
  static readonly reopenMapping = (apartmentProjectId: string) =>
    Effect.flatMap(RoomAreaService, (service) => service.reopenMapping(apartmentProjectId));

  static readonly layer = Layer.effect(
    RoomAreaService,
    Effect.gen(function* () {
      const db = yield* Database;

      const requireProject = Effect.fn("RoomAreaService.requireProject")(function* (id: string) {
        if (!uuidPattern.test(id)) return yield* noProject(id);
        const rows = yield* db
          .select({ id: apartmentProjects.id })
          .from(apartmentProjects)
          .where(eq(apartmentProjects.id, id));
        if (rows[0] === undefined) return yield* noProject(id);
        return rows[0].id;
      });

      const areaRow = Effect.fn("RoomAreaService.areaRow")(function* (id: string) {
        if (!uuidPattern.test(id)) return yield* noArea(id);
        const rows = yield* db.select().from(roomAreas).where(eq(roomAreas.id, id));
        const row = rows[0];
        if (row === undefined) return yield* noArea(id);
        return row;
      });

      /** Any change to the mapping withdraws the user's "this is complete" claim. */
      const withdrawConfirmation = (apartmentProjectId: string) =>
        db
          .update(apartmentProjects)
          .set({ roomMappingConfirmedAt: null })
          .where(eq(apartmentProjects.id, apartmentProjectId));

      const list = Effect.fn("RoomAreaService.list")(function* (apartmentProjectId: string) {
        yield* requireProject(apartmentProjectId);
        const rows = yield* db
          .select()
          .from(roomAreas)
          .where(eq(roomAreas.apartmentProjectId, apartmentProjectId))
          .orderBy(asc(roomAreas.createdAt));
        return rows.map(toRoomArea);
      });

      const create = Effect.fn("RoomAreaService.create")(function* (input: CreateRoomAreaInput) {
        yield* requireProject(input.apartmentProjectId);
        const boundary = yield* readBoundary(input.boundary);
        const rows = yield* db
          .insert(roomAreas)
          .values({
            apartmentProjectId: input.apartmentProjectId,
            roomType: input.roomType,
            name: input.name.trim(),
            boundary: [...boundary],
          })
          .returning();
        yield* withdrawConfirmation(input.apartmentProjectId);
        return toRoomArea(rows[0]!);
      });

      const update = Effect.fn("RoomAreaService.update")(function* (input: UpdateRoomAreaInput) {
        const existing = yield* areaRow(input.id);
        const boundary = yield* readBoundary(input.boundary);
        const rows = yield* db
          .update(roomAreas)
          .set({
            roomType: input.roomType,
            name: input.name.trim(),
            boundary: [...boundary],
          })
          .where(eq(roomAreas.id, input.id))
          .returning();
        yield* withdrawConfirmation(existing.apartmentProjectId);
        return toRoomArea(rows[0]!);
      });

      const remove = Effect.fn("RoomAreaService.remove")(function* (id: string) {
        const existing = yield* areaRow(id);
        yield* db.delete(roomAreas).where(eq(roomAreas.id, id));
        yield* withdrawConfirmation(existing.apartmentProjectId);
        return { id };
      });

      const confirmMapping = Effect.fn("RoomAreaService.confirmMapping")(function* (
        apartmentProjectId: string,
      ) {
        const areas = yield* list(apartmentProjectId);
        yield* assertMappable(areas);
        const confirmedAt = new Date(yield* Clock.currentTimeMillis);
        yield* db
          .update(apartmentProjects)
          .set({ roomMappingConfirmedAt: confirmedAt })
          .where(eq(apartmentProjects.id, apartmentProjectId));
        return confirmedAt;
      });

      const reopenMapping = Effect.fn("RoomAreaService.reopenMapping")(function* (
        apartmentProjectId: string,
      ) {
        yield* requireProject(apartmentProjectId);
        yield* withdrawConfirmation(apartmentProjectId);
      });

      return { list, create, update, remove, confirmMapping, reopenMapping };
    }),
  );

  /** In-memory implementation for tests — no database required. */
  static readonly testLayer = Layer.sync(RoomAreaService, () => {
    const areas = new Map<string, RoomArea>();
    const projects = new Set<string>();
    const confirmations = new Map<string, Date>();

    // Tests reach the service directly, so any project id they use is taken as real
    // the first time it is seen; the database layer has a foreign key for that.
    const known = (apartmentProjectId: string) => {
      projects.add(apartmentProjectId);
      return apartmentProjectId;
    };

    const withdraw = (apartmentProjectId: string) => confirmations.delete(apartmentProjectId);

    const areaById = (id: string) =>
      Effect.suspend(() => {
        const area = areas.get(id);
        return area === undefined ? noArea(id) : Effect.succeed(area);
      });

    const list = (apartmentProjectId: string) =>
      Effect.sync(() =>
        [...areas.values()].filter((area) => area.apartmentProjectId === apartmentProjectId),
      );

    return {
      list,
      create: Effect.fn("RoomAreaService.create")(function* (input: CreateRoomAreaInput) {
        const boundary = yield* readBoundary(input.boundary);
        const area: RoomArea = {
          id: crypto.randomUUID(),
          apartmentProjectId: known(input.apartmentProjectId),
          roomType: input.roomType,
          name: input.name.trim(),
          boundary,
          createdAt: new Date(yield* Clock.currentTimeMillis),
        };
        areas.set(area.id, area);
        withdraw(area.apartmentProjectId);
        return area;
      }),
      update: Effect.fn("RoomAreaService.update")(function* (input: UpdateRoomAreaInput) {
        const existing = yield* areaById(input.id);
        const boundary = yield* readBoundary(input.boundary);
        const area: RoomArea = {
          ...existing,
          roomType: input.roomType,
          name: input.name.trim(),
          boundary,
        };
        areas.set(area.id, area);
        withdraw(area.apartmentProjectId);
        return area;
      }),
      remove: Effect.fn("RoomAreaService.remove")(function* (id: string) {
        const existing = yield* areaById(id);
        areas.delete(id);
        withdraw(existing.apartmentProjectId);
        return { id };
      }),
      confirmMapping: Effect.fn("RoomAreaService.confirmMapping")(function* (
        apartmentProjectId: string,
      ) {
        yield* assertMappable(yield* list(apartmentProjectId));
        const confirmedAt = new Date(yield* Clock.currentTimeMillis);
        confirmations.set(known(apartmentProjectId), confirmedAt);
        return confirmedAt;
      }),
      reopenMapping: (apartmentProjectId: string) =>
        Effect.sync(() => {
          withdraw(apartmentProjectId);
        }),
    };
  });
}

/** Mapping can only be called complete when there is something mapped and all of it is valid. */
const assertMappable = (areas: ReadonlyArray<RoomArea>) =>
  Effect.suspend(() => {
    if (areas.length === 0) {
      return new InvalidRequest({ message: "Draw an area around every room before confirming" });
    }
    const invalid = areas.filter((area) => roomBoundaryIssue(area.boundary) !== undefined);
    if (invalid.length > 0) {
      return new InvalidRequest({
        message: `${invalid.length} room area${invalid.length === 1 ? "" : "s"} still need fixing`,
      });
    }
    return Effect.void;
  });
