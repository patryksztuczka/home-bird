import { afterAll, describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { app } from "../../../app.ts";
import { runtime } from "../../../runtime.ts";
import { floorPlanUpload, pngBase64 } from "./floor-plan-fixture.ts";

afterAll(() => runtime.dispose());

const json = <A>(res: Response) => Effect.promise(() => res.json() as Promise<A>);

const request = (path: string) => Effect.promise(async () => app.request(path));

const trpcQuery = (path: string, input?: unknown) =>
  request(
    input === undefined
      ? `/trpc/${path}`
      : `/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`,
  );

const trpcMutation = (path: string, body: unknown) =>
  Effect.promise(async () =>
    app.request(`/trpc/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

interface ApartmentProjectPayload {
  readonly id: string;
  readonly name: string;
  readonly floorPlan: { readonly fileName: string; readonly contentType: string };
}

interface FloorPlanImagePayload {
  readonly fileName: string;
  readonly contentType: string;
  readonly data: string;
}

const createProject = (body: unknown) =>
  Effect.gen(function* () {
    const res = yield* trpcMutation("apartmentProject.create", body);
    expect(res.status).toBe(200);
    return (yield* json<{ result: { data: ApartmentProjectPayload } }>(res)).result.data;
  });

const errorMessage = (res: Response) =>
  Effect.map(json<{ error: { message: string } }>(res), (body) => body.error.message);

describe("apartment project trpc router", () => {
  it.effect("creates a project and serves its floor plan", () =>
    Effect.gen(function* () {
      const project = yield* createProject({ name: "Warsaw flat", floorPlan: floorPlanUpload });
      expect(project.name).toBe("Warsaw flat");
      expect(project.floorPlan.fileName).toBe("ground-floor.png");

      const fetched = yield* trpcQuery("apartmentProject.byId", { id: project.id });
      expect(fetched.status).toBe(200);
      expect(
        (yield* json<{ result: { data: ApartmentProjectPayload } }>(fetched)).result.data.id,
      ).toBe(project.id);

      const image = yield* trpcQuery("apartmentProject.floorPlanImage", { id: project.id });
      expect(image.status).toBe(200);
      const stored = (yield* json<{ result: { data: FloorPlanImagePayload } }>(image)).result.data;
      expect(stored.contentType).toBe("image/png");
      expect(stored.fileName).toBe("ground-floor.png");
      expect(stored.data).toBe(pngBase64);
    }),
  );

  it.effect("rejects a project without a name", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("apartmentProject.create", {
        name: "",
        floorPlan: floorPlanUpload,
      });
      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("Apartment project name is required");
    }),
  );

  it.effect("rejects a project without a floor plan", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("apartmentProject.create", { name: "Warsaw flat" });
      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("A floor plan is required");
    }),
  );

  it.effect("rejects an unsupported floor plan file type", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("apartmentProject.create", {
        name: "Warsaw flat",
        floorPlan: { ...floorPlanUpload, fileName: "plan.pdf", contentType: "application/pdf" },
      });
      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("PNG, JPEG, or WebP");
    }),
  );

  it.effect("rejects a floor plan that cannot be read as an image", () =>
    Effect.gen(function* () {
      const res = yield* trpcMutation("apartmentProject.create", {
        name: "Warsaw flat",
        floorPlan: {
          ...floorPlanUpload,
          data: Buffer.from("this is not an image").toString("base64"),
        },
      });
      expect(res.status).toBe(400);
      expect(yield* errorMessage(res)).toContain("could not be read");
    }),
  );

  it.effect("reports an unknown project", () =>
    Effect.gen(function* () {
      const missing = "11111111-1111-1111-1111-111111111111";

      const res = yield* trpcQuery("apartmentProject.byId", { id: missing });
      expect(res.status).toBe(404);

      const image = yield* trpcQuery("apartmentProject.floorPlanImage", { id: missing });
      expect(image.status).toBe(404);
    }),
  );

  it.effect("lists created projects", () =>
    Effect.gen(function* () {
      const project = yield* createProject({ name: "Listed flat", floorPlan: floorPlanUpload });

      const res = yield* trpcQuery("apartmentProject.list");
      expect(res.status).toBe(200);

      const projects = (yield* json<{ result: { data: Array<ApartmentProjectPayload> } }>(res))
        .result.data;
      expect(projects.map((each) => each.id)).toContain(project.id);
    }),
  );
});
