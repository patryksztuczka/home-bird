import {
  apartmentProjects,
  apartmentVisualizations,
  Database,
  roomAreas,
} from "@home-bird/database";
import type { RoomType } from "@home-bird/shared/room-area";
import { and, asc, desc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Clock, Context, Effect, Layer, Result } from "effect";
import { InvalidRequest, NotFound } from "../../http/trpc.ts";
import { ImageStorage, type ImageStorageFailure, type StoredImage } from "./image-storage.ts";
import {
  VisualizationProvider,
  type VisualizationProviderFailure,
} from "./visualization-provider.ts";

export interface ApartmentVisualization {
  readonly id: string;
  readonly apartmentProjectId: string;
  readonly status: "pending" | "complete" | "failed";
  readonly errorMessage: string | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

const toVisualization = (
  row: typeof apartmentVisualizations.$inferSelect,
): ApartmentVisualization => ({
  id: row.id,
  apartmentProjectId: row.apartmentProjectId,
  status: row.status as ApartmentVisualization["status"],
  errorMessage: row.errorMessage,
  createdAt: row.createdAt,
  completedAt: row.completedAt,
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noProject = (id: string) => new NotFound({ message: `No apartment project ${id}` });
const noVisualization = (id: string) =>
  new NotFound({ message: `No apartment visualization ${id}` });

export class ApartmentVisualizationService extends Context.Service<
  ApartmentVisualizationService,
  {
    readonly generate: (
      apartmentProjectId: string,
    ) => Effect.Effect<
      ApartmentVisualization,
      | InvalidRequest
      | NotFound
      | VisualizationProviderFailure
      | ImageStorageFailure
      | EffectDrizzleQueryError
    >;
    readonly list: (
      apartmentProjectId: string,
    ) => Effect.Effect<Array<ApartmentVisualization>, NotFound | EffectDrizzleQueryError>;
    readonly image: (
      id: string,
    ) => Effect.Effect<StoredImage, NotFound | ImageStorageFailure | EffectDrizzleQueryError>;
  }
>()("@home-bird/ApartmentVisualizationService") {
  static readonly generate = (apartmentProjectId: string) =>
    Effect.flatMap(ApartmentVisualizationService, (service) =>
      service.generate(apartmentProjectId),
    );
  static readonly list = (apartmentProjectId: string) =>
    Effect.flatMap(ApartmentVisualizationService, (service) => service.list(apartmentProjectId));
  static readonly image = (id: string) =>
    Effect.flatMap(ApartmentVisualizationService, (service) => service.image(id));

  static readonly layer = Layer.effect(
    ApartmentVisualizationService,
    Effect.gen(function* () {
      const db = yield* Database;
      const storage = yield* ImageStorage;
      const provider = yield* VisualizationProvider;

      const projectRow = Effect.fn("ApartmentVisualizationService.projectRow")(function* (
        id: string,
      ) {
        if (!uuidPattern.test(id)) return yield* noProject(id);
        const rows = yield* db.select().from(apartmentProjects).where(eq(apartmentProjects.id, id));
        const project = rows[0];
        if (project === undefined) return yield* noProject(id);
        return project;
      });

      const visualizationRow = Effect.fn("ApartmentVisualizationService.visualizationRow")(
        function* (id: string) {
          if (!uuidPattern.test(id)) return yield* noVisualization(id);
          const rows = yield* db
            .select()
            .from(apartmentVisualizations)
            .where(eq(apartmentVisualizations.id, id));
          const visualization = rows[0];
          if (visualization === undefined) return yield* noVisualization(id);
          return visualization;
        },
      );

      const list = Effect.fn("ApartmentVisualizationService.list")(function* (
        apartmentProjectId: string,
      ) {
        yield* projectRow(apartmentProjectId);
        const rows = yield* db
          .select()
          .from(apartmentVisualizations)
          .where(eq(apartmentVisualizations.apartmentProjectId, apartmentProjectId))
          .orderBy(desc(apartmentVisualizations.createdAt));
        return rows.map(toVisualization);
      });

      const generate = Effect.fn("ApartmentVisualizationService.generate")(function* (
        apartmentProjectId: string,
      ) {
        const project = yield* projectRow(apartmentProjectId);
        const pending = yield* db
          .select({ id: apartmentVisualizations.id })
          .from(apartmentVisualizations)
          .where(
            and(
              eq(apartmentVisualizations.apartmentProjectId, apartmentProjectId),
              eq(apartmentVisualizations.status, "pending"),
            ),
          );
        if (pending.length > 0) {
          return yield* new InvalidRequest({
            message: "A visualization is already being generated",
          });
        }

        const roomRows = yield* db
          .select()
          .from(roomAreas)
          .where(eq(roomAreas.apartmentProjectId, apartmentProjectId))
          .orderBy(asc(roomAreas.createdAt));
        const snapshot = {
          floorPlan: {
            fileName: project.floorPlanFileName,
            contentType: project.floorPlanContentType,
          },
          rooms: roomRows.map((room) => ({
            id: room.id,
            roomType: room.roomType,
            name: room.name,
            boundary: room.boundary,
          })),
        };
        const inserted = yield* db
          .insert(apartmentVisualizations)
          .values({ apartmentProjectId, status: "pending", inputSnapshot: snapshot })
          .returning();
        const attempt = inserted[0]!;

        const floorPlanImage = yield* storage.get(project.floorPlanStorageKey);
        const outcome = yield* provider
          .generateApartment({
            floorPlan: {
              ...snapshot.floorPlan,
              bytes: floorPlanImage.bytes,
            },
            rooms: snapshot.rooms.map((room) => ({
              ...room,
              roomType: room.roomType as RoomType,
            })),
          })
          .pipe(
            Effect.flatMap((image) => {
              const storageKey = `visualizations/${attempt.id}`;
              return storage.put(storageKey, image).pipe(Effect.as({ image, storageKey }));
            }),
            Effect.result,
          );

        if (Result.isFailure(outcome)) {
          yield* db
            .update(apartmentVisualizations)
            .set({
              status: "failed",
              errorMessage: "The visualization provider did not return an image.",
              completedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .where(eq(apartmentVisualizations.id, attempt.id));
          return yield* outcome.failure;
        }

        const completedAt = new Date(yield* Clock.currentTimeMillis);
        const completed = yield* db
          .update(apartmentVisualizations)
          .set({
            status: "complete",
            imageStorageKey: outcome.success.storageKey,
            imageContentType: outcome.success.image.contentType,
            errorMessage: null,
            completedAt,
          })
          .where(eq(apartmentVisualizations.id, attempt.id))
          .returning();
        return toVisualization(completed[0]!);
      });

      const image = Effect.fn("ApartmentVisualizationService.image")(function* (id: string) {
        const visualization = yield* visualizationRow(id);
        if (visualization.status !== "complete" || visualization.imageStorageKey === null) {
          return yield* noVisualization(id);
        }
        return yield* storage.get(visualization.imageStorageKey);
      });

      return { generate, list, image };
    }),
  );
}
