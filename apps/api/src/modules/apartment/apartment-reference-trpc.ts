import {
  ApartmentReferenceComponentInput,
  ApartmentReferencesInput,
  AttachApartmentReferenceInput,
  ReferenceIdInput,
} from "@home-bird/shared/apartment-reference";
import { Effect, Encoding } from "effect";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { ApartmentReferenceService } from "./apartment-reference-service.ts";

export const apartmentReferenceRouter = router({
  list: publicProcedure
    .input(ApartmentReferencesInput)
    .query(({ input }) => runTrpc(ApartmentReferenceService.list(input.apartmentProjectId))),
  /**
   * The stored reference image, base64-encoded so a preview travels over the
   * same tRPC contract as everything else — and so the browser never has to go
   * back to the host a linked image came from.
   */
  image: publicProcedure.input(ReferenceIdInput).query(({ input }) =>
    runTrpc(
      ApartmentReferenceService.image(input.id).pipe(
        Effect.map((image) => ({
          fileName: image.fileName,
          contentType: image.contentType,
          data: Encoding.encodeBase64(image.bytes),
        })),
      ),
    ),
  ),
  /** Attaching to a component that already has a reference replaces it. */
  attach: publicProcedure
    .input(AttachApartmentReferenceInput)
    .mutation(({ input }) => runTrpc(ApartmentReferenceService.attach(input))),
  remove: publicProcedure
    .input(ApartmentReferenceComponentInput)
    .mutation(({ input }) =>
      runTrpc(ApartmentReferenceService.remove(input.apartmentProjectId, input.component)),
    ),
});
