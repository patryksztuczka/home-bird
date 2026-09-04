import { initTRPC, TRPCError } from "@trpc/server";
import { Effect, Schema } from "effect";
import type { AppServices } from "../layers.ts";
import { runtime } from "../runtime.ts";

/** Domain-level "bad request" error resolvers can yield; mapped to BAD_REQUEST. */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  message: Schema.String,
}) {}

/** Domain-level "no such thing" error resolvers can yield; mapped to NOT_FOUND. */
export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {
  message: Schema.String,
}) {}

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Maps a resolver's typed failure onto tRPC's error vocabulary. Failures the
 * domain does not name — a failed query, a failed write to image storage —
 * become a 500 with the original error kept as the cause for logging.
 */
const toTrpcError = (error: unknown): TRPCError => {
  if (error instanceof InvalidRequest) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  if (error instanceof NotFound) {
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
};

/**
 * Runs an Effect inside a tRPC resolver through the app runtime, mapping its
 * error channel to TRPCErrors.
 */
export const runTrpc = async <A, E>(effect: Effect.Effect<A, E, AppServices>): Promise<A> => {
  const result = await runtime.runPromise(
    Effect.match(effect, {
      onSuccess: (value) => ({ ok: true as const, value }),
      onFailure: (error) => ({ ok: false as const, error: toTrpcError(error) }),
    }),
  );
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
};
