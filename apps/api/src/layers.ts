import { Database } from "@home-bird/database";
import { Layer } from "effect";
import { ApartmentProjectService } from "./modules/apartment/apartment-project-service.ts";
import { ApartmentReferenceService } from "./modules/apartment/apartment-reference-service.ts";
import { ApartmentVisualizationService } from "./modules/apartment/apartment-visualization-service.ts";
import { ImageFetcher } from "./modules/apartment/image-fetcher.ts";
import { ImageStorage } from "./modules/apartment/image-storage.ts";
import { RoomAreaService } from "./modules/apartment/room-area-service.ts";
import { RoomReferenceService } from "./modules/apartment/room-reference-service.ts";
import { VisualizationProvider } from "./modules/apartment/visualization-provider.ts";
import { TodoService } from "./modules/todo/todo-service.ts";

export const AppLayer = Layer.mergeAll(
  ApartmentProjectService.layer,
  ApartmentReferenceService.layer,
  ApartmentVisualizationService.layer,
  RoomAreaService.layer,
  RoomReferenceService.layer,
  TodoService.layer,
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Database.layer,
      ImageStorage.layer,
      ImageFetcher.layer,
      VisualizationProvider.layer,
    ),
  ),
);

export type AppServices =
  | ApartmentProjectService
  | ApartmentReferenceService
  | ApartmentVisualizationService
  | RoomAreaService
  | RoomReferenceService
  | TodoService
  | ImageStorage
  | ImageFetcher
  | VisualizationProvider
  | Database;
