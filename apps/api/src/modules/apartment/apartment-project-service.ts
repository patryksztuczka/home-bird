import { apartmentProjects, Database } from "@home-bird/database";
import {
  type CreateApartmentProjectInput,
  decodeFloorPlanData,
  type FloorPlanContentType,
  isReadableAs,
} from "@home-bird/shared/apartment-project";
import { desc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Clock, Context, Effect, Layer } from "effect";
import { InvalidRequest, NotFound } from "../../http/trpc.ts";
import { ImageStorage, type ImageStorageFailure, type StoredImage } from "./image-storage.ts";

/** The floor plan as the rest of the product sees it: metadata, not bytes. */
export interface FloorPlan {
  readonly fileName: string;
  readonly contentType: string;
  readonly byteSize: number;
}

/** An apartment project without its persistence details. */
export interface ApartmentProject {
  readonly id: string;
  readonly name: string;
  readonly floorPlan: FloorPlan;
  /** When the user last said the whole interior is mapped; null until they do. */
  readonly roomMappingConfirmedAt: Date | null;
  readonly createdAt: Date;
}

/** The stored floor plan image, ready to be served. */
export interface FloorPlanImage extends StoredImage {
  readonly fileName: string;
}

const toProject = (row: typeof apartmentProjects.$inferSelect): ApartmentProject => ({
  id: row.id,
  name: row.name,
  floorPlan: {
    fileName: row.floorPlanFileName,
    contentType: row.floorPlanContentType,
    byteSize: row.floorPlanByteSize,
  },
  roomMappingConfirmedAt: row.roomMappingConfirmedAt,
  createdAt: row.createdAt,
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = (id: string) => new NotFound({ message: `No apartment project ${id}` });

/**
 * Reads the upload's base64 payload. The shared schema already rejects
 * unreadable images at the api boundary; this repeats the check so the service
 * cannot be talked into storing something that is not an image.
 */
const readUpload = (input: CreateApartmentProjectInput) =>
  Effect.suspend(() => {
    const bytes = decodeFloorPlanData(input.floorPlan.data);
    if (bytes === undefined || !isReadableAs(bytes, input.floorPlan.contentType)) {
      return new InvalidRequest({ message: "Floor plan image could not be read" });
    }
    return Effect.succeed(bytes);
  });

export class ApartmentProjectService extends Context.Service<
  ApartmentProjectService,
  {
    readonly create: (
      input: CreateApartmentProjectInput,
    ) => Effect.Effect<
      ApartmentProject,
      InvalidRequest | ImageStorageFailure | EffectDrizzleQueryError
    >;
    readonly list: Effect.Effect<Array<ApartmentProject>, EffectDrizzleQueryError>;
    readonly byId: (
      id: string,
    ) => Effect.Effect<ApartmentProject, NotFound | EffectDrizzleQueryError>;
    readonly floorPlanImage: (
      id: string,
    ) => Effect.Effect<FloorPlanImage, NotFound | ImageStorageFailure | EffectDrizzleQueryError>;
  }
>()("@home-bird/ApartmentProjectService") {
  static readonly create = (input: CreateApartmentProjectInput) =>
    Effect.flatMap(ApartmentProjectService, (service) => service.create(input));
  static readonly list = Effect.flatMap(ApartmentProjectService, (service) => service.list);
  static readonly byId = (id: string) =>
    Effect.flatMap(ApartmentProjectService, (service) => service.byId(id));
  static readonly floorPlanImage = (id: string) =>
    Effect.flatMap(ApartmentProjectService, (service) => service.floorPlanImage(id));

  static readonly layer = Layer.effect(
    ApartmentProjectService,
    Effect.gen(function* () {
      const db = yield* Database;
      const storage = yield* ImageStorage;

      const rowById = Effect.fn("ApartmentProjectService.rowById")(function* (id: string) {
        if (!uuidPattern.test(id)) {
          return yield* notFound(id);
        }
        const rows = yield* db.select().from(apartmentProjects).where(eq(apartmentProjects.id, id));
        const row = rows[0];
        if (row === undefined) {
          return yield* notFound(id);
        }
        return row;
      });

      const create = Effect.fn("ApartmentProjectService.create")(function* (
        input: CreateApartmentProjectInput,
      ) {
        const bytes = yield* readUpload(input);
        const storageKey = `floor-plans/${yield* Effect.sync(() => crypto.randomUUID())}`;
        yield* storage.put(storageKey, {
          bytes,
          contentType: input.floorPlan.contentType,
        });

        const rows = yield* db
          .insert(apartmentProjects)
          .values({
            name: input.name,
            floorPlanFileName: input.floorPlan.fileName,
            floorPlanContentType: input.floorPlan.contentType,
            floorPlanByteSize: bytes.length,
            floorPlanStorageKey: storageKey,
          })
          .returning();
        return toProject(rows[0]!);
      });

      const list = db
        .select()
        .from(apartmentProjects)
        .orderBy(desc(apartmentProjects.createdAt))
        .pipe(
          Effect.map((rows) => rows.map(toProject)),
          Effect.withSpan("ApartmentProjectService.list"),
        );

      const byId = Effect.fn("ApartmentProjectService.byId")(function* (id: string) {
        return toProject(yield* rowById(id));
      });

      const floorPlanImage = Effect.fn("ApartmentProjectService.floorPlanImage")(function* (
        id: string,
      ) {
        const row = yield* rowById(id);
        const image = yield* storage.get(row.floorPlanStorageKey);
        return { ...image, fileName: row.floorPlanFileName };
      });

      return { create, list, byId, floorPlanImage };
    }),
  );

  /** In-memory implementation for tests — no database required. */
  static readonly testLayer = Layer.effect(
    ApartmentProjectService,
    Effect.gen(function* () {
      const storage = yield* ImageStorage;
      const store = new Map<string, ApartmentProject & { readonly storageKey: string }>();

      const create = Effect.fn("ApartmentProjectService.create")(function* (
        input: CreateApartmentProjectInput,
      ) {
        const bytes = yield* readUpload(input);
        const id = crypto.randomUUID();
        const storageKey = `floor-plans/${id}`;
        yield* storage.put(storageKey, {
          bytes,
          contentType: input.floorPlan.contentType,
        });

        const project = {
          id,
          name: input.name,
          floorPlan: {
            fileName: input.floorPlan.fileName,
            contentType: input.floorPlan.contentType as FloorPlanContentType,
            byteSize: bytes.length,
          },
          roomMappingConfirmedAt: null,
          createdAt: new Date(yield* Clock.currentTimeMillis),
          storageKey,
        };
        store.set(id, project);
        return project;
      });

      const stored = (id: string) =>
        Effect.suspend(() => {
          const project = store.get(id);
          return project === undefined ? notFound(id) : Effect.succeed(project);
        });

      return {
        create,
        list: Effect.sync(() => [...store.values()].toReversed()),
        byId: stored,
        floorPlanImage: Effect.fn("ApartmentProjectService.floorPlanImage")(function* (id: string) {
          const project = yield* stored(id);
          const image = yield* storage.get(project.storageKey);
          return { ...image, fileName: project.floorPlan.fileName };
        }),
      };
    }),
  );
}
