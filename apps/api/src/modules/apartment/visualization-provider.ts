import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import type { BoundaryPoint, RoomType } from "@home-bird/shared/room-area";
import { Context, Effect, Layer, Schema } from "effect";

export interface ApartmentVisualizationRequest {
  readonly floorPlan: {
    readonly fileName: string;
    readonly contentType: string;
    readonly bytes: Uint8Array;
  };
  readonly rooms: ReadonlyArray<{
    readonly id: string;
    readonly roomType: RoomType;
    readonly name: string;
    readonly boundary: ReadonlyArray<BoundaryPoint>;
  }>;
}

export interface GeneratedVisualization {
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

export class VisualizationProviderFailure extends Schema.TaggedError<VisualizationProviderFailure>()(
  "VisualizationProviderFailure",
  { message: Schema.String },
) {}

export const apartmentVisualizationPrompt = (request: ApartmentVisualizationRequest) =>
  `
Create one clean isometric architectural concept image from the attached floor plan.

Treat the floor plan as the source of truth for the apartment footprint, room arrangement, walls, doors, and windows. Room mapping is optional. If mapped rooms are listed below, use their boundary coordinates as additional guidance; coordinates are fractions of the attached image dimensions. If the list is empty, derive the complete architectural shell from the floor plan alone.
Mapped rooms:
${JSON.stringify(
  request.rooms.map(({ id, roomType, name, boundary }) => ({ id, roomType, name, boundary })),
  null,
  2,
)}

Follow this output contract exactly. Geometry and emptiness have priority over decoration or realism.

1. CONTENT: Render only the apartment's architectural shell: floor slab, walls, door openings, doors, and exterior-wall windows. Every room must be completely vacant. Include zero furniture and zero room contents. Do not render toilets, sinks, bathtubs, showers, cabinets, counters, appliances, radiators, lamps, switches, shelves, wardrobes, rugs, plants, decorations, people, text, labels, or loose objects. Ignore every furniture symbol, plumbing-fixture symbol, appliance symbol, room number, hatch, and annotation printed on the floor-plan image. Those marks are not objects to model. Room types and names identify spaces only; they are not permission to furnish them.

2. MATERIALS: Use smooth plain white walls and one continuous neutral light-grey floor finish throughout every room. Do not infer special materials or fixtures from a room type.

3. PROJECTION: Produce a true orthographic isometric architectural diorama on a square white canvas. Camera roll must be exactly 0 degrees. Do not rotate or tilt the finished diorama within the canvas. In image space, one floor-plan axis must run exactly 30 degrees upward to the right and the perpendicular floor-plan axis exactly 30 degrees downward to the right. All vertical wall edges must remain exactly vertical. Parallel plan edges must remain parallel, with no perspective convergence or wide-angle distortion. Center the complete footprint with even white margins on every side.

4. CUTAWAY: The camera looks toward one apartment corner from roughly 35 degrees above. The two exterior wall runs nearest the camera must be cut down to a floor-level curb at 10 percent of normal wall height. The two exterior wall runs farthest from the camera remain full height. Interior walls remain at consistent full height. Do not let a foreground wall obscure any floor area.

5. GEOMETRY: Trace the attached floor plan rather than redesigning it. Preserve its footprint, room boundaries, wall angles, wall thicknesses, openings, and room adjacency. Every wall must be straight, plumb, and constant in thickness. Corners must be crisp. No bowed, leaning, wavy, skewed, softened, or melted geometry.

6. WINDOWS: Place a window only where the floor plan has an exterior-wall window opening. Seat each window flush inside that exact wall opening and align it to the wall. Do not move, add, duplicate, resize creatively, wrap around a corner, detach, or place a window in an interior wall.

Use restrained, realistic architectural-model rendering and soft neutral daylight. Before returning the image, verify that the apartment is entirely empty, the canvas has no roll, the two plan axes are symmetrical at plus and minus 30 degrees, and no floor-plan symbol has become a 3D object.
`.trim();

const packageEntry = fileURLToPath(import.meta.resolve("pi-codex-image-gen"));
const packageExtension = join(dirname(dirname(packageEntry)), "index.ts");

/**
 * Generates images through the pi SDK and the pi-codex-image-gen extension.
 * The extension reads the server user's existing ~/.pi openai-codex login.
 */
export class VisualizationProvider extends Context.Service<
  VisualizationProvider,
  {
    readonly generateApartment: (
      request: ApartmentVisualizationRequest,
    ) => Effect.Effect<GeneratedVisualization, VisualizationProviderFailure>;
  }
>()("@home-bird/VisualizationProvider") {
  static readonly layer = Layer.succeed(VisualizationProvider, {
    generateApartment: Effect.fn("VisualizationProvider.generateApartment")((request) =>
      Effect.tryPromise({
        try: async () => {
          const temporaryDirectory = await mkdtemp(join(tmpdir(), "home-bird-visualization-"));
          try {
            const extension =
              request.floorPlan.contentType === "image/jpeg"
                ? "jpg"
                : request.floorPlan.contentType === "image/webp"
                  ? "webp"
                  : "png";
            const floorPlanPath = join(temporaryDirectory, `floor-plan.${extension}`);
            await writeFile(floorPlanPath, request.floorPlan.bytes);

            const cwd = process.cwd();
            const settingsManager = SettingsManager.inMemory();
            const resourceLoader = new DefaultResourceLoader({
              cwd,
              agentDir: getAgentDir(),
              settingsManager,
              additionalExtensionPaths: [packageExtension],
              noExtensions: true,
              noSkills: true,
              noPromptTemplates: true,
              noThemes: true,
              noContextFiles: true,
            });
            await resourceLoader.reload();
            const modelRuntime = await ModelRuntime.create();
            const { session } = await createAgentSession({
              cwd,
              tools: ["codex_generate_image"],
              modelRuntime,
              resourceLoader,
              settingsManager,
              sessionManager: SessionManager.inMemory(cwd),
            });

            try {
              const tool = session.agent.state.tools.find(
                (candidate) => candidate.name === "codex_generate_image",
              );
              if (tool === undefined) {
                throw new Error("pi-codex-image-gen did not register codex_generate_image");
              }
              const result = await tool.execute(crypto.randomUUID(), {
                prompt: apartmentVisualizationPrompt(request),
                outputFormat: "png",
                save: "none",
                referencedImagePaths: [floorPlanPath],
              });
              const image = result.content.find((content) => content.type === "image");
              if (image === undefined) {
                throw new Error("The visualization provider did not return an image");
              }
              return {
                bytes: new Uint8Array(Buffer.from(image.data, "base64")),
                contentType: image.mimeType,
              };
            } finally {
              session.dispose();
            }
          } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
          }
        },
        catch: (error) =>
          new VisualizationProviderFailure({
            message: error instanceof Error ? error.message : String(error),
          }),
      }),
    ),
  });
}
