import { ApartmentProjectIdInput } from "@home-bird/shared/apartment-project";
import {
  ApartmentProjectRoomsInput,
  CreateRoomAreaInput,
  RoomAreaIdInput,
  UpdateRoomAreaInput,
} from "@home-bird/shared/room-area";
import { publicProcedure, router, runTrpc } from "../../http/trpc.ts";
import { RoomAreaService } from "./room-area-service.ts";

export const roomAreaRouter = router({
  list: publicProcedure
    .input(ApartmentProjectRoomsInput)
    .query(({ input }) => runTrpc(RoomAreaService.list(input.apartmentProjectId))),
  create: publicProcedure
    .input(CreateRoomAreaInput)
    .mutation(({ input }) => runTrpc(RoomAreaService.create(input))),
  update: publicProcedure
    .input(UpdateRoomAreaInput)
    .mutation(({ input }) => runTrpc(RoomAreaService.update(input))),
  remove: publicProcedure
    .input(RoomAreaIdInput)
    .mutation(({ input }) => runTrpc(RoomAreaService.remove(input.id))),
  /** Records that the whole interior is mapped; this is what unlocks generation. */
  confirmMapping: publicProcedure
    .input(ApartmentProjectIdInput)
    .mutation(({ input }) => runTrpc(RoomAreaService.confirmMapping(input.id))),
  reopenMapping: publicProcedure
    .input(ApartmentProjectIdInput)
    .mutation(({ input }) => runTrpc(RoomAreaService.reopenMapping(input.id))),
});
