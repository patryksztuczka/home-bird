import { router } from "./http/trpc.ts";
import { apartmentProjectRouter } from "./modules/apartment/apartment-project-trpc.ts";
import { todoRouter } from "./modules/todo/todo-trpc.ts";

export const appRouter = router({
  apartmentProject: apartmentProjectRouter,
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;
