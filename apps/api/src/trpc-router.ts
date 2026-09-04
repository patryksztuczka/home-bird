import { router } from "./http/trpc.ts";
import { apartmentReferenceRouter } from "./modules/apartment/apartment-reference-trpc.ts";
import { apartmentProjectRouter } from "./modules/apartment/apartment-project-trpc.ts";
import { roomAreaRouter } from "./modules/apartment/room-area-trpc.ts";
import { roomReferenceRouter } from "./modules/apartment/room-reference-trpc.ts";
import { todoRouter } from "./modules/todo/todo-trpc.ts";

export const appRouter = router({
  apartmentProject: apartmentProjectRouter,
  apartmentReference: apartmentReferenceRouter,
  roomArea: roomAreaRouter,
  roomReference: roomReferenceRouter,
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;
