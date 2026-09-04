import {
  ApartmentProjectIdInput,
  CreateApartmentProjectInput,
} from "@home-bird/shared/apartment-project";
import { Effect, Encoding } from "effect";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { ApartmentProjectService } from "./apartment-project-service.ts";

export const apartmentProjectRouter = router({
  list: publicProcedure.query(() => runTrpc(ApartmentProjectService.list)),
  byId: publicProcedure
    .input(ApartmentProjectIdInput)
    .query(({ input }) => runTrpc(ApartmentProjectService.byId(input.id))),
  /**
   * The stored floor plan, base64-encoded so the image travels over the same
   * tRPC contract as the rest of the project rather than a second transport.
   */
  floorPlanImage: publicProcedure.input(ApartmentProjectIdInput).query(({ input }) =>
    runTrpc(
      ApartmentProjectService.floorPlanImage(input.id).pipe(
        Effect.map((image) => ({
          fileName: image.fileName,
          contentType: image.contentType,
          data: Encoding.encodeBase64(image.bytes),
        })),
      ),
    ),
  ),
  create: publicProcedure
    .input(CreateApartmentProjectInput)
    .mutation(({ input }) => runTrpc(ApartmentProjectService.create(input))),
});
