import { apartmentProjects, apartmentReferences, Database } from "@home-bird/database";
import type {
  AttachApartmentReferenceInput,
  ReferenceComponent,
  ReferenceSource,
  ReferenceUse,
} from "@home-bird/shared/apartment-reference";
import { referenceImageIssue, referenceUse } from "@home-bird/shared/apartment-reference";
import { decodeImageData, type ImageContentType } from "@home-bird/shared/image-file";
import { and, asc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Clock, Context, Effect, Layer } from "effect";
import { InvalidRequest, NotFound } from "../../http/trpc.ts";
import { ImageFetcher } from "./image-fetcher.ts";
import { ImageStorage, type ImageStorageFailure, type StoredImage } from "./image-storage.ts";

/** One attached reference, as the rest of the product sees it: metadata, not bytes. */
export interface ApartmentReference {
  readonly id: string;
  readonly apartmentProjectId: string;
  readonly component: ReferenceComponent;
  /** Derived from the component, not stored: overall style is only ever inspiration. */
  readonly use: ReferenceUse;
  readonly fileName: string;
  readonly contentType: string;
  readonly byteSize: number;
  /** Where the image came from when it was attached by link; null for an upload. */
  readonly sourceUrl: string | null;
  readonly createdAt: Date;
}

/** The stored reference image, ready to be served. */
export interface ReferenceImage extends StoredImage {
  readonly fileName: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const noReference = (id: string) => new NotFound({ message: `No reference ${id}` });
const noProject = (id: string) => new NotFound({ message: `No apartment project ${id}` });

const toReference = (row: typeof apartmentReferences.$inferSelect): ApartmentReference => {
  const component = row.component as ReferenceComponent;
  return {
    id: row.id,
    apartmentProjectId: row.apartmentProjectId,
    component,
    use: referenceUse(component),
    fileName: row.fileName,
    contentType: row.contentType,
    byteSize: row.byteSize,
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt,
  };
};

/** The last segment of a link's path, so a fetched image still has a name to show. */
const fileNameFromUrl = (url: string) => {
  const path = URL.parse(url)?.pathname ?? "";
  const last = path.split("/").findLast((segment) => segment.length > 0);
  return last === undefined || last.length === 0 ? "linked-image" : decodeURIComponent(last);
};

/**
 * Reads whatever the user offered into bytes we are willing to keep.
 *
 * The shared schema already ran these checks at the api boundary; they are
 * repeated here so the service cannot be talked into storing something that is
 * not an image. A link is fetched once — what we keep is the image, not the link.
 */
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
    if (bytes === undefined) {
      return yield* new InvalidRequest({ message: "Reference image could not be read" });
    }
    const issue = referenceImageIssue(bytes, source.contentType);
    if (issue !== undefined) return yield* new InvalidRequest({ message: issue });
    return {
      bytes,
      contentType: source.contentType as string,
      fileName: source.fileName,
      sourceUrl: null,
    };
  });

/**
 * Apartment-wide references: one image per component, standing as the default
 * for every room until a room says otherwise.
 *
 * A component holds exactly one reference, so attaching to a component that
 * already has one replaces it — the browser confirms that with the user before
 * asking. Removing one leaves every other component untouched.
 */
export class ApartmentReferenceService extends Context.Service<
  ApartmentReferenceService,
  {
    readonly list: (
      apartmentProjectId: string,
    ) => Effect.Effect<Array<ApartmentReference>, NotFound | EffectDrizzleQueryError>;
    readonly attach: (
      input: AttachApartmentReferenceInput,
    ) => Effect.Effect<
      ApartmentReference,
      InvalidRequest | NotFound | ImageStorageFailure | EffectDrizzleQueryError,
      ImageFetcher
    >;
    readonly remove: (
      apartmentProjectId: string,
      component: ReferenceComponent,
    ) => Effect.Effect<
      { readonly component: ReferenceComponent },
      NotFound | EffectDrizzleQueryError
    >;
    readonly image: (
      id: string,
    ) => Effect.Effect<ReferenceImage, NotFound | ImageStorageFailure | EffectDrizzleQueryError>;
  }
>()("@home-bird/ApartmentReferenceService") {
  static readonly list = (apartmentProjectId: string) =>
    Effect.flatMap(ApartmentReferenceService, (service) => service.list(apartmentProjectId));
  static readonly attach = (input: AttachApartmentReferenceInput) =>
    Effect.flatMap(ApartmentReferenceService, (service) => service.attach(input));
  static readonly remove = (apartmentProjectId: string, component: ReferenceComponent) =>
    Effect.flatMap(ApartmentReferenceService, (service) =>
      service.remove(apartmentProjectId, component),
    );
  static readonly image = (id: string) =>
    Effect.flatMap(ApartmentReferenceService, (service) => service.image(id));

  static readonly layer = Layer.effect(
    ApartmentReferenceService,
    Effect.gen(function* () {
      const db = yield* Database;
      const storage = yield* ImageStorage;

      const requireProject = Effect.fn("ApartmentReferenceService.requireProject")(function* (
        id: string,
      ) {
        if (!uuidPattern.test(id)) return yield* noProject(id);
        const rows = yield* db
          .select({ id: apartmentProjects.id })
          .from(apartmentProjects)
          .where(eq(apartmentProjects.id, id));
        if (rows[0] === undefined) return yield* noProject(id);
        return rows[0].id;
      });

      const list = Effect.fn("ApartmentReferenceService.list")(function* (
        apartmentProjectId: string,
      ) {
        yield* requireProject(apartmentProjectId);
        const rows = yield* db
          .select()
          .from(apartmentReferences)
          .where(eq(apartmentReferences.apartmentProjectId, apartmentProjectId))
          .orderBy(asc(apartmentReferences.createdAt));
        return rows.map(toReference);
      });

      const attach = Effect.fn("ApartmentReferenceService.attach")(function* (
        input: AttachApartmentReferenceInput,
      ) {
        yield* requireProject(input.apartmentProjectId);
        const image = yield* readSource(input.source);

        const storageKey = `references/${yield* Effect.sync(() => crypto.randomUUID())}`;
        yield* storage.put(storageKey, { bytes: image.bytes, contentType: image.contentType });

        // One reference per component: attaching over an existing one replaces it.
        const rows = yield* db
          .insert(apartmentReferences)
          .values({
            apartmentProjectId: input.apartmentProjectId,
            component: input.component,
            fileName: image.fileName,
            contentType: image.contentType,
            byteSize: image.bytes.length,
            sourceUrl: image.sourceUrl,
            storageKey,
            createdAt: new Date(yield* Clock.currentTimeMillis),
          })
          .onConflictDoUpdate({
            target: [apartmentReferences.apartmentProjectId, apartmentReferences.component],
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
        return toReference(rows[0]!);
      });

      const remove = Effect.fn("ApartmentReferenceService.remove")(function* (
        apartmentProjectId: string,
        component: ReferenceComponent,
      ) {
        yield* requireProject(apartmentProjectId);
        const rows = yield* db
          .delete(apartmentReferences)
          .where(
            and(
              eq(apartmentReferences.apartmentProjectId, apartmentProjectId),
              eq(apartmentReferences.component, component),
            ),
          )
          .returning();
        if (rows[0] === undefined) {
          return yield* new NotFound({ message: `No reference attached to ${component}` });
        }
        return { component };
      });

      const image = Effect.fn("ApartmentReferenceService.image")(function* (id: string) {
        if (!uuidPattern.test(id)) return yield* noReference(id);
        const rows = yield* db
          .select()
          .from(apartmentReferences)
          .where(eq(apartmentReferences.id, id));
        const row = rows[0];
        if (row === undefined) return yield* noReference(id);
        const stored = yield* storage.get(row.storageKey);
        return { ...stored, fileName: row.fileName };
      });

      return { list, attach, remove, image };
    }),
  );

  /** In-memory implementation for tests — no database required. */
  static readonly testLayer = Layer.effect(
    ApartmentReferenceService,
    Effect.gen(function* () {
      const storage = yield* ImageStorage;
      const references = new Map<string, ApartmentReference & { readonly storageKey: string }>();

      const byComponent = (apartmentProjectId: string, component: ReferenceComponent) =>
        [...references.values()].find(
          (reference) =>
            reference.apartmentProjectId === apartmentProjectId &&
            reference.component === component,
        );

      const list = (apartmentProjectId: string) =>
        Effect.sync(() =>
          [...references.values()]
            .filter((reference) => reference.apartmentProjectId === apartmentProjectId)
            .map(({ storageKey: _storageKey, ...reference }) => reference),
        );

      return {
        list,
        attach: Effect.fn("ApartmentReferenceService.attach")(function* (
          input: AttachApartmentReferenceInput,
        ) {
          const image = yield* readSource(input.source);
          const existing = byComponent(input.apartmentProjectId, input.component);
          const id = existing?.id ?? crypto.randomUUID();
          const storageKey = `references/${crypto.randomUUID()}`;
          yield* storage.put(storageKey, { bytes: image.bytes, contentType: image.contentType });

          const reference = {
            id,
            apartmentProjectId: input.apartmentProjectId,
            component: input.component,
            use: referenceUse(input.component),
            fileName: image.fileName,
            contentType: image.contentType,
            byteSize: image.bytes.length,
            sourceUrl: image.sourceUrl,
            createdAt: new Date(yield* Clock.currentTimeMillis),
            storageKey,
          };
          references.set(id, reference);
          const { storageKey: _storageKey, ...attached } = reference;
          return attached;
        }),
        remove: Effect.fn("ApartmentReferenceService.remove")(function* (
          apartmentProjectId: string,
          component: ReferenceComponent,
        ) {
          const existing = byComponent(apartmentProjectId, component);
          if (existing === undefined) {
            return yield* new NotFound({ message: `No reference attached to ${component}` });
          }
          references.delete(existing.id);
          return { component };
        }),
        image: Effect.fn("ApartmentReferenceService.image")(function* (id: string) {
          const reference = references.get(id);
          if (reference === undefined) return yield* noReference(id);
          const stored = yield* storage.get(reference.storageKey);
          return { ...stored, fileName: reference.fileName };
        }),
      };
    }),
  );
}
