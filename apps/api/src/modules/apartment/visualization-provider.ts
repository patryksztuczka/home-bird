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
import { Config, Context, Effect, Layer, Schema } from "effect";

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

const CODEX_MODEL = "gpt-5.6-sol";

type PiSession = Awaited<ReturnType<typeof createAgentSession>>["session"];
type ImageTool = PiSession["agent"]["state"]["tools"][number];

const imageFromToolResult = (result: {
  readonly content?: ReadonlyArray<
    | { readonly type: "text"; readonly text: string }
    | { readonly type: "image"; readonly data: string; readonly mimeType: string }
  >;
}): GeneratedVisualization | undefined => {
  const image = result.content?.find((content) => content.type === "image");
  return image?.type === "image"
    ? {
        bytes: new Uint8Array(Buffer.from(image.data, "base64")),
        contentType: image.mimeType,
      }
    : undefined;
};

const withPiSession = async <A>(
  request: ApartmentVisualizationRequest,
  agentLoop: boolean,
  use: (session: PiSession, imageTool: ImageTool, floorPlanPath: string) => Promise<A>,
): Promise<A> => {
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
    const model = agentLoop ? modelRuntime.getModel("openai-codex", CODEX_MODEL) : undefined;
    if (agentLoop && model === undefined) {
      throw new Error(`${CODEX_MODEL} is unavailable from the openai-codex provider`);
    }
    const { session } = await createAgentSession({
      cwd,
      tools: ["codex_generate_image"],
      modelRuntime,
      resourceLoader,
      settingsManager,
      sessionManager: SessionManager.inMemory(cwd),
      ...(model === undefined ? {} : { model, thinkingLevel: "medium" as const }),
    });

    try {
      const imageTool = session.agent.state.tools.find(
        (candidate) => candidate.name === "codex_generate_image",
      );
      if (imageTool === undefined) {
        throw new Error("pi-codex-image-gen did not register codex_generate_image");
      }
      return await use(session, imageTool, floorPlanPath);
    } finally {
      session.dispose();
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

const providerEffect = (
  name: string,
  generate: (request: ApartmentVisualizationRequest) => Promise<GeneratedVisualization>,
) =>
  Effect.fn(name)((request: ApartmentVisualizationRequest) =>
    Effect.tryPromise({
      try: () => generate(request),
      catch: (error) =>
        new VisualizationProviderFailure({
          message: error instanceof Error ? error.message : String(error),
        }),
    }),
  );

/**
 * Generates images through the pi SDK and the pi-codex-image-gen extension.
 * Both implementations read the server user's existing ~/.pi openai-codex login.
 */
export class VisualizationProvider extends Context.Service<
  VisualizationProvider,
  {
    readonly generateApartment: (
      request: ApartmentVisualizationRequest,
    ) => Effect.Effect<GeneratedVisualization, VisualizationProviderFailure>;
  }
>()("@home-bird/VisualizationProvider") {
  /** One Codex Responses request followed by one gpt-image-2 call. */
  static readonly directLayer = Layer.succeed(VisualizationProvider, {
    generateApartment: providerEffect("VisualizationProvider.direct.generateApartment", (request) =>
      withPiSession(request, false, async (_session, imageTool, floorPlanPath) => {
        const result = await imageTool.execute(crypto.randomUUID(), {
          prompt: apartmentVisualizationPrompt(request),
          model: CODEX_MODEL,
          outputFormat: "png",
          save: "none",
          referencedImagePaths: [floorPlanPath],
        });
        const image = imageFromToolResult(result);
        if (image === undefined) {
          throw new Error("The visualization provider did not return an image");
        }
        return image;
      }),
    ),
  });

  /** Two planning prompts at medium reasoning, then one gpt-image-2 call. */
  static readonly agentLoopLayer = Layer.succeed(VisualizationProvider, {
    generateApartment: providerEffect(
      "VisualizationProvider.agentLoop.generateApartment",
      (request) =>
        withPiSession(request, true, async (session, imageTool, floorPlanPath) => {
          session.agent.state.tools = [];
          await session.prompt(
            `Study the attached floor plan as an architect preparing an image-generation brief. Distinguish structural walls, doors, and exterior windows from furniture, plumbing fixtures, symbols, hatching, dimensions, and labels. Work out the footprint, room adjacency, openings, and the exact unrotated isometric composition. Return a concise technical brief only. Do not generate an image yet.\n\nAvailable mapped-room guidance:\n${JSON.stringify(request.rooms, null, 2)}`,
            {
              images: [
                {
                  type: "image",
                  data: Buffer.from(request.floorPlan.bytes).toString("base64"),
                  mimeType: request.floorPlan.contentType,
                },
              ],
            },
          );

          const forcedModelTool: ImageTool = {
            ...imageTool,
            execute: (toolCallId, params, signal, onUpdate) =>
              imageTool.execute(
                toolCallId,
                { ...(params as Record<string, unknown>), model: CODEX_MODEL },
                signal,
                onUpdate,
              ),
          };
          session.agent.state.tools = [forcedModelTool];

          let generated: GeneratedVisualization | undefined;
          const unsubscribe = session.subscribe((event) => {
            if (
              event.type === "tool_execution_end" &&
              event.toolName === "codex_generate_image" &&
              !event.isError
            ) {
              generated = imageFromToolResult(event.result);
            }
          });
          try {
            await session.prompt(
              `Critique your technical brief against the output contract below. Correct any interpretation that would create furniture, fixtures, camera roll, perspective distortion, misplaced openings, or warped walls. Then call codex_generate_image exactly once. Pass the attached floor plan at ${floorPlanPath} as referencedImagePaths, use PNG, save none, and use ${CODEX_MODEL}. Do not stop with a text-only answer.\n\nOUTPUT CONTRACT:\n${apartmentVisualizationPrompt(request)}`,
            );
          } finally {
            unsubscribe();
          }

          if (generated === undefined) {
            throw new Error(
              session.agent.state.errorMessage ??
                "The agent loop finished without generating an image",
            );
          }
          return generated;
        }),
    ),
  });

  /** Select with VISUALIZATION_PROVIDER_MODE=direct|agent-loop. */
  static readonly layer = Layer.unwrap(
    Config.literals(["direct", "agent-loop"], "VISUALIZATION_PROVIDER_MODE").pipe(
      Config.withDefault("direct"),
      Effect.map((mode) =>
        mode === "agent-loop"
          ? VisualizationProvider.agentLoopLayer
          : VisualizationProvider.directLayer,
      ),
    ),
  );
}
