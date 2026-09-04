import { apartmentReferences, Database, roomAreas, roomReferences } from "@home-bird/database";
import type { ReferenceSource, ReferenceUse } from "@home-bird/shared/apartment-reference";
import { referenceImageIssue } from "@home-bird/shared/apartment-reference";
import { decodeImageData, type ImageContentType } from "@home-bird/shared/image-file";
import type {
  AttachRoomReferenceInput,
  RoomReferenceComponent,
} from "@home-bird/shared/room-reference";
import { roomReferenceComponents } from "@home-bird/shared/room-reference";
import type { RoomType } from "@home-bird/shared/room-area";
import { and, asc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Clock, Context, Effect, Layer } from "effect";
import { InvalidRequest, NotFound } from "../../http/trpc.ts";
import { ImageFetcher } from "./image-fetcher.ts";
import { ImageStorage, type ImageStorageFailure, type StoredImage } from "./image-storage.ts";

export interface RoomReference {
  readonly id: string;
  readonly roomAreaId: string;
  readonly component: RoomReferenceComponent;
  readonly use: ReferenceUse;
  readonly fileName: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly sourceUrl: string | null;
  readonly createdAt: Date;
}

export interface ResolvedRoomReferenceValue {
  readonly id: string;
  readonly apartmentProjectId: string;
  readonly component: RoomReferenceComponent;
  readonly use: ReferenceUse;
  readonly fileName: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly sourceUrl: string | null;
  readonly createdAt: Date;
}

export interface ResolvedRoomReference {
  readonly component: RoomReferenceComponent;
  readonly source: "apartment" | "room" | "unset";
  readonly reference: ResolvedRoomReferenceValue | null;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noArea = (id: string) => new NotFound({ message: `No room area ${id}` });

const toRoomReference = (row: typeof roomReferences.$inferSelect): RoomReference => ({
  id: row.id,
  roomAreaId: row.roomAreaId,
  component: row.component as RoomReferenceComponent,
  use: row.component === "overall-style" ? "general-inspiration" : "close-visual-match",
  fileName: row.fileName,
  contentType: row.contentType,
  byteSize: row.byteSize,
  sourceUrl: row.sourceUrl,
  createdAt: row.createdAt,
});

const fileNameFromUrl = (url: string) => {
  const path = URL.parse(url)?.pathname ?? "";
  const last = path.split("/").findLast((segment) => segment.length > 0);
  return last === undefined ? "linked-image" : decodeURIComponent(last);
};

const readSource = (source: ReferenceSource) =>
  Effect.gen(function* () {
    if (source.kind === "link") {
      const image = yield* ImageFetcher.fetch(source.url).pipe(
        Effect.catchTag(
          "ImageUnreachable",
          (error) => new InvalidRequest({ message: error.message }),
        ),
      );
      const issue = referenceImageIssue(image.bytes, image.contentType as ImageContentType);
      if (issue !== undefined) return yield* new InvalidRequest({ message: issue });
      return {
        bytes: image.bytes,
        contentType: image.contentType,
        fileName: fileNameFromUrl(source.url),
        sourceUrl: source.url,
      };
    }
    const bytes = decodeImageData(source.data);
    if (bytes === undefined)
      return yield* new InvalidRequest({ message: "Reference image could not be read" });
    const issue = referenceImageIssue(bytes, source.contentType);
    if (issue !== undefined) return yield* new InvalidRequest({ message: issue });
    return {
      bytes,
      contentType: source.contentType as string,
      fileName: source.fileName,
      sourceUrl: null,
    };
  });

export class RoomReferenceService extends Context.Service<
  RoomReferenceService,
  {
    readonly resolved: (
      roomAreaId: string,
    ) => Effect.Effect<Array<ResolvedRoomReference>, NotFound | EffectDrizzleQueryError>;
    readonly attach: (
      input: AttachRoomReferenceInput,
    ) => Effect.Effect<
      RoomReference,
      InvalidRequest | NotFound | ImageStorageFailure | EffectDrizzleQueryError,
      ImageFetcher
    >;
    readonly remove: (
      roomAreaId: string,
      component: RoomReferenceComponent,
    ) => Effect.Effect<
      { readonly component: RoomReferenceComponent },
      NotFound | EffectDrizzleQueryError
    >;
    readonly image: (
      id: string,
    ) => Effect.Effect<
      StoredImage & { readonly fileName: string },
      NotFound | ImageStorageFailure | EffectDrizzleQueryError
    >;
  }
>()("@home-bird/RoomReferenceService") {
  static readonly resolved = (roomAreaId: string) =>
    Effect.flatMap(RoomReferenceService, (service) => service.resolved(roomAreaId));
  static readonly attach = (input: AttachRoomReferenceInput) =>
    Effect.flatMap(RoomReferenceService, (service) => service.attach(input));
  static readonly remove = (roomAreaId: string, component: RoomReferenceComponent) =>
    Effect.flatMap(RoomReferenceService, (service) => service.remove(roomAreaId, component));
  static readonly image = (id: string) =>
    Effect.flatMap(RoomReferenceService, (service) => service.image(id));

  static readonly layer = Layer.effect(
    RoomReferenceService,
    Effect.gen(function* () {
      const db = yield* Database;
      const storage = yield* ImageStorage;

      const areaRow = Effect.fn("RoomReferenceService.areaRow")(function* (id: string) {
        if (!uuidPattern.test(id)) return yield* noArea(id);
        const rows = yield* db.select().from(roomAreas).where(eq(roomAreas.id, id));
        const area = rows[0];
        if (area === undefined) return yield* noArea(id);
        return area;
      });

      const resolved = Effect.fn("RoomReferenceService.resolved")(function* (roomAreaId: string) {
        const area = yield* areaRow(roomAreaId);

        const rows = yield* db
          .select()
          .from(apartmentReferences)
          .where(eq(apartmentReferences.apartmentProjectId, area.apartmentProjectId))
          .orderBy(asc(apartmentReferences.createdAt));
        const roomRows = yield* db
          .select()
          .from(roomReferences)
          .where(eq(roomReferences.roomAreaId, roomAreaId))
          .orderBy(asc(roomReferences.createdAt));
        const apartmentByComponent = new Map(rows.map((row) => [row.component, row]));
        const roomByComponent = new Map(roomRows.map((row) => [row.component, row]));

        return roomReferenceComponents(area.roomType as RoomType).map((component) => {
          const roomRow = roomByComponent.get(component);
          if (roomRow !== undefined) {
            return {
              component,
              source: "room" as const,
              reference: {
                id: roomRow.id,
                apartmentProjectId: area.apartmentProjectId,
                component,
                use:
                  component === "overall-style"
                    ? ("general-inspiration" as const)
                    : ("close-visual-match" as const),
                fileName: roomRow.fileName,
                contentType: roomRow.contentType,
                byteSize: roomRow.byteSize,
                sourceUrl: roomRow.sourceUrl,
                createdAt: roomRow.createdAt,
              },
            };
          }
          const row = apartmentByComponent.get(component);
          if (row === undefined) {
            return { component, source: "unset" as const, reference: null };
          }
          return {
            component,
            source: "apartment" as const,
            reference: {
              id: row.id,
              apartmentProjectId: row.apartmentProjectId,
              component,
              use:
                component === "overall-style"
                  ? ("general-inspiration" as const)
                  : ("close-visual-match" as const),
              fileName: row.fileName,
              contentType: row.contentType,
              byteSize: row.byteSize,
              sourceUrl: row.sourceUrl,
              createdAt: row.createdAt,
            },
          };
        });
      });

      const attach = Effect.fn("RoomReferenceService.attach")(function* (
        input: AttachRoomReferenceInput,
      ) {
        const area = yield* areaRow(input.roomAreaId);
        if (!roomReferenceComponents(area.roomType as RoomType).includes(input.component)) {
          return yield* new InvalidRequest({
            message: `${input.component} is not available for this room type`,
          });
        }
        const image = yield* readSource(input.source);
        const storageKey = `references/${crypto.randomUUID()}`;
        yield* storage.put(storageKey, { bytes: image.bytes, contentType: image.contentType });
        const rows = yield* db
          .insert(roomReferences)
          .values({
            roomAreaId: input.roomAreaId,
            component: input.component,
            fileName: image.fileName,
            contentType: image.contentType,
            byteSize: image.bytes.length,
            sourceUrl: image.sourceUrl,
            storageKey,
            createdAt: new Date(yield* Clock.currentTimeMillis),
          })
          .onConflictDoUpdate({
            target: [roomReferences.roomAreaId, roomReferences.component],
            set: {
              fileName: image.fileName,
              contentType: image.contentType,
              byteSize: image.bytes.length,
              sourceUrl: image.sourceUrl,
              storageKey,
              createdAt: new Date(yield* Clock.currentTimeMillis),
            },
          })
          .returning();
        return toRoomReference(rows[0]!);
      });

      const remove = Effect.fn("RoomReferenceService.remove")(function* (
        roomAreaId: string,
        component: RoomReferenceComponent,
      ) {
        yield* areaRow(roomAreaId);
        const rows = yield* db
          .delete(roomReferences)
          .where(
            and(eq(roomReferences.roomAreaId, roomAreaId), eq(roomReferences.component, component)),
          )
          .returning();
        if (rows[0] === undefined) {
          return yield* new NotFound({ message: `No room reference attached to ${component}` });
        }
        return { component };
      });

      const image = Effect.fn("RoomReferenceService.image")(function* (id: string) {
        if (!uuidPattern.test(id))
          return yield* new NotFound({ message: `No room reference ${id}` });
        const rows = yield* db.select().from(roomReferences).where(eq(roomReferences.id, id));
        const row = rows[0];
        if (row === undefined) return yield* new NotFound({ message: `No room reference ${id}` });
        const stored = yield* storage.get(row.storageKey);
        return { ...stored, fileName: row.fileName };
      });

      return { resolved, attach, remove, image };
    }),
  );
}
