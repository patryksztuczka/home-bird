import { initTRPC, TRPCError } from "@trpc/server";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Effect, Schema } from "effect";
import type { AppServices } from "../layers.ts";
import type { ImageStorageFailure } from "../modules/apartment/image-storage.ts";
import { runtime } from "../runtime.ts";

/** Domain-level "bad request" error resolvers can yield; mapped to BAD_REQUEST. */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  message: Schema.String,
}) {}

/** Domain-level "no such thing" error resolvers can yield; mapped to NOT_FOUND. */
export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {
  message: Schema.String,
}) {}

/**
 * Everything a resolver is allowed to fail with.
 *
 * The union is deliberately closed. A service that grows a new failure will not
 * typecheck at `runTrpc` until it is listed here and given a status code, so an
 * error can never quietly degrade into a 500 the way an `unknown` channel lets
 * it. The first two are part of the api's vocabulary; the rest are
 * infrastructure and are never described to the client.
 */
export type ResolverError =
  | InvalidRequest
  | NotFound
  | ImageStorageFailure
  | EffectDrizzleQueryError;

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

const ok = <A>(value: A) => ({ ok: true as const, value });
const failed = (error: TRPCError) => Effect.succeed({ ok: false as const, error });

/**
 * Runs an Effect inside a tRPC resolver through the app runtime, mapping its
 * typed error channel onto tRPC's vocabulary by tag.
 */
export const runTrpc = async <A>(
  effect: Effect.Effect<A, ResolverError, AppServices>,
): Promise<A> => {
  const result = await runtime.runPromise(
    effect.pipe(
      Effect.map(ok),
      Effect.catchTags(
        {
          InvalidRequest: (error) =>
            failed(new TRPCError({ code: "BAD_REQUEST", message: error.message })),
          NotFound: (error) => failed(new TRPCError({ code: "NOT_FOUND", message: error.message })),
        },
        // Infrastructure failures: the cause is kept for logging, never sent.
        (error) => failed(new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error })),
      ),
    ),
  );
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
};
