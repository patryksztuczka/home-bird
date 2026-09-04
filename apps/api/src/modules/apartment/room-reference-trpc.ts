import {
  AttachRoomReferenceInput,
  RoomReferenceComponentInput,
  RoomReferenceRoomInput,
} from "@home-bird/shared/room-reference";
import { ReferenceIdInput } from "@home-bird/shared/apartment-reference";
import { Effect, Encoding } from "effect";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { RoomReferenceService } from "./room-reference-service.ts";

export const roomReferenceRouter = router({
  attach: publicProcedure
    .input(AttachRoomReferenceInput)
    .mutation(({ input }) => runTrpc(RoomReferenceService.attach(input))),
  image: publicProcedure.input(ReferenceIdInput).query(({ input }) =>
    runTrpc(
      RoomReferenceService.image(input.id).pipe(
        Effect.map((image) => ({
          fileName: image.fileName,
          contentType: image.contentType,
          data: Encoding.encodeBase64(image.bytes),
        })),
      ),
    ),
  ),
  remove: publicProcedure
    .input(RoomReferenceComponentInput)
    .mutation(({ input }) =>
      runTrpc(RoomReferenceService.remove(input.roomAreaId, input.component)),
    ),
  resolved: publicProcedure
    .input(RoomReferenceRoomInput)
    .query(({ input }) => runTrpc(RoomReferenceService.resolved(input.roomAreaId))),
});
