import { Database } from "@home-bird/database";
import { Layer } from "effect";
import { ApartmentProjectService } from "./modules/apartment/apartment-project-service.ts";
import { ApartmentReferenceService } from "./modules/apartment/apartment-reference-service.ts";
import { ImageFetcher } from "./modules/apartment/image-fetcher.ts";
import { ImageStorage } from "./modules/apartment/image-storage.ts";
import { RoomAreaService } from "./modules/apartment/room-area-service.ts";
import { TodoService } from "./modules/todo/todo-service.ts";

export const AppLayer = Layer.mergeAll(
  ApartmentProjectService.layer,
  ApartmentReferenceService.layer,
  RoomAreaService.layer,
  TodoService.layer,
).pipe(Layer.provideMerge(Layer.mergeAll(Database.layer, ImageStorage.layer, ImageFetcher.layer)));

export type AppServices =
  | ApartmentProjectService
  | ApartmentReferenceService
  | RoomAreaService
  | TodoService
  | ImageStorage
  | ImageFetcher
  | Database;
