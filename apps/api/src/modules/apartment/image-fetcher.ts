import { isSupportedImageContentType } from "@home-bird/shared/image-file";
import { Context, Effect, Layer, Schema } from "effect";
import type { StoredImage } from "./image-storage.ts";

/** A link did not give us an image. The message is shown to the user as-is. */
export class ImageUnreachable extends Schema.TaggedError<ImageUnreachable>()("ImageUnreachable", {
  url: Schema.String,
  message: Schema.String,
}) {}

/**
 * Reads an image from a link the user supplied.
 *
 * It is a service of its own for the same reason image storage is: it is the
 * one place the api talks to a host it does not control, so it can be swapped
 * and — more to the point — tests can attach a link without leaving the process.
 */
export class ImageFetcher extends Context.Service<
  ImageFetcher,
  {
    readonly fetch: (url: string) => Effect.Effect<StoredImage, ImageUnreachable>;
  }
>()("@home-bird/ImageFetcher") {
  static readonly fetch = (url: string) =>
    Effect.flatMap(ImageFetcher, (fetcher) => fetcher.fetch(url));

  /** The real thing: one GET, and the response has to actually be an image. */
  static readonly layer = Layer.sync(ImageFetcher, () => ({
    fetch: Effect.fn("ImageFetcher.fetch")(function* (url: string) {
      const response = yield* Effect.tryPromise({
        try: (signal) => fetch(url, { signal, redirect: "follow" }),
        catch: () => new ImageUnreachable({ url, message: "That link could not be reached" }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: "10 seconds",
          orElse: () => new ImageUnreachable({ url, message: "That link took too long to answer" }),
        }),
      );

      if (!response.ok) {
        return yield* new ImageUnreachable({
          url,
          message: `That link answered with ${response.status}`,
        });
      }

      const contentType = (response.headers.get("content-type") ?? "").split(";")[0]!.trim();
      if (!isSupportedImageContentType(contentType)) {
        return yield* new ImageUnreachable({
          url,
          message:
            "That link is not a direct image — it must point straight at a PNG, JPEG, or WebP file",
        });
      }

      const bytes = yield* Effect.tryPromise({
        try: async () => new Uint8Array(await response.arrayBuffer()),
        catch: () => new ImageUnreachable({ url, message: "That image could not be read" }),
      });

      return { bytes, contentType };
    }),
  }));

  /** Serves only the links a test has seeded; anything else is unreachable. */
  static readonly serving = (responses: ReadonlyMap<string, StoredImage>) =>
    Layer.sync(ImageFetcher, () => ({
      fetch: (url: string) =>
        Effect.suspend(() => {
          const image = responses.get(url);
          return image === undefined
            ? new ImageUnreachable({
                url,
                message:
                  "That link is not a direct image — it must point straight at a PNG, JPEG, or WebP file",
              })
            : Effect.succeed(image);
        }),
    }));

  /** No link is reachable — the default for tests that never attach one. */
  static readonly testLayer = ImageFetcher.serving(new Map());
}
