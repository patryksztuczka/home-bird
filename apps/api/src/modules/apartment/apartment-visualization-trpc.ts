import {
  ApartmentVisualizationsInput,
  ApartmentVisualizationIdInput,
  GenerateApartmentVisualizationInput,
} from "@home-bird/shared/apartment-visualization";
import { Effect, Encoding } from "effect";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { ApartmentVisualizationService } from "./apartment-visualization-service.ts";

export const apartmentVisualizationRouter = router({
  list: publicProcedure
    .input(ApartmentVisualizationsInput)
    .query(({ input }) => runTrpc(ApartmentVisualizationService.list(input.apartmentProjectId))),
  generate: publicProcedure
    .input(GenerateApartmentVisualizationInput)
    .mutation(({ input }) =>
      runTrpc(ApartmentVisualizationService.generate(input.apartmentProjectId)),
    ),
  image: publicProcedure.input(ApartmentVisualizationIdInput).query(({ input }) =>
    runTrpc(
      ApartmentVisualizationService.image(input.id).pipe(
        Effect.map((image) => ({
          contentType: image.contentType,
          data: Encoding.encodeBase64(image.bytes),
        })),
      ),
    ),
  ),
});
