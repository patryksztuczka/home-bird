import { afterAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { app } from "../../../app.ts";
import { runtime } from "../../../runtime.ts";
import { floorPlanUpload, pngBase64 } from "./floor-plan-fixture.ts";

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

const data = <A>(res: Response) =>
  Effect.map(json<{ result: { data: A } }>(res), (b) => b.result.data);

const errorMessage = (res: Response) =>
  Effect.map(json<{ error: { message: string } }>(res), (body) => body.error.message);

interface ReferencePayload {
  readonly id: string;
  readonly component: string;
  readonly use: string;
  readonly fileName: string;
  readonly byteSize: number;
  readonly sourceUrl: string | null;
}

const newProject = Effect.gen(function* () {
  const res = yield* trpcMutation("apartmentProject.create", {
    name: "Warsaw flat",
    floorPlan: floorPlanUpload,
  });
  return (yield* data<{ id: string }>(res)).id;
});

const uploadSource = (fileName: string) => ({
  kind: "upload" as const,
  fileName,
  contentType: "image/png" as const,
  data: pngBase64,
});

describe("apartment reference api", () => {
  it.effect("attaches, replaces, and removes an apartment reference", () =>
    Effect.gen(function* () {
      const apartmentProjectId = yield* newProject;

      const attached = yield* data<ReferencePayload>(
        yield* trpcMutation("apartmentReference.attach", {
          apartmentProjectId,
          component: "floor",
          source: uploadSource("oak-herringbone.png"),
        }),
      );
      expect(attached.component).toBe("floor");
      expect(attached.use).toBe("close-visual-match");
      expect(attached.sourceUrl).toBeNull();

      // A second component keeps its own reference alongside the first.
      yield* trpcMutation("apartmentReference.attach", {
        apartmentProjectId,
        component: "overall-style",
        source: uploadSource("scandi-loft.png"),
      });

      const replaced = yield* data<ReferencePayload>(
        yield* trpcMutation("apartmentReference.attach", {
          apartmentProjectId,
          component: "floor",
          source: uploadSource("oak-herringbone-2.png"),
        }),
      );
      expect(replaced.id).toBe(attached.id);
      expect(replaced.fileName).toBe("oak-herringbone-2.png");

      const listed = yield* data<Array<ReferencePayload>>(
        yield* trpcQuery("apartmentReference.list", { apartmentProjectId }),
      );
      expect(listed).toHaveLength(2);
      expect(listed.find((r) => r.component === "overall-style")?.use).toBe("general-inspiration");

      // The stored image comes back over the same contract, ready for a preview.
      const image = yield* data<{ contentType: string; data: string; fileName: string }>(
        yield* trpcQuery("apartmentReference.image", { id: replaced.id }),
      );
      expect(image.contentType).toBe("image/png");
      expect(image.data).toBe(pngBase64);

      yield* trpcMutation("apartmentReference.remove", { apartmentProjectId, component: "floor" });
      const afterRemoval = yield* data<Array<ReferencePayload>>(
        yield* trpcQuery("apartmentReference.list", { apartmentProjectId }),
      );
      expect(afterRemoval.map((r) => r.component)).toEqual(["overall-style"]);
    }),
  );

  it.effect("refuses an unreadable image and leaves existing references in place", () =>
    Effect.gen(function* () {
      const apartmentProjectId = yield* newProject;
      yield* trpcMutation("apartmentReference.attach", {
        apartmentProjectId,
        component: "walls",
        source: uploadSource("lime-plaster.png"),
      });

      const res = yield* trpcMutation("apartmentReference.attach", {
        apartmentProjectId,
        component: "ceiling",
        source: {
          ...uploadSource("notes.png"),
          data: Buffer.from("plain text").toString("base64"),
        },
      });

      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("Reference image could not be read");
      const listed = yield* data<Array<ReferencePayload>>(
        yield* trpcQuery("apartmentReference.list", { apartmentProjectId }),
      );
      expect(listed.map((r) => r.component)).toEqual(["walls"]);
    }),
  );

  it.effect("refuses a link that is not a direct image", () =>
    Effect.gen(function* () {
      const apartmentProjectId = yield* newProject;

      const res = yield* trpcMutation("apartmentReference.attach", {
        apartmentProjectId,
        component: "floor",
        source: { kind: "link", url: "not-a-link" },
      });

      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("http://");
    }),
  );

  it.effect("says so when the project does not exist", () =>
    Effect.gen(function* () {
      const res = yield* trpcQuery("apartmentReference.list", {
        apartmentProjectId: "3b0f1f2c-2b2a-4a1e-9f4a-1c2d3e4f5a6b",
      });

      expect(res.status).toBe(404);
    }),
  );
});
