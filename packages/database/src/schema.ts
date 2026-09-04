import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

/**
 * One property the user is visualizing. Its floor plan is mandatory, so the
 * plan's metadata lives on the project row; the image bytes themselves live in
 * image storage under `floorPlanStorageKey`.
 */
export const apartmentProjects = pgTable("apartment_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  floorPlanFileName: text("floor_plan_file_name").notNull(),
  floorPlanContentType: text("floor_plan_content_type").notNull(),
  floorPlanByteSize: integer("floor_plan_byte_size").notNull(),
  floorPlanStorageKey: text("floor_plan_storage_key").notNull(),
  /**
   * When the user last said the whole interior is mapped. Null until they do,
   * and set back to null by any change to a room area — generation is gated on it.
   */
  roomMappingConfirmedAt: timestamp("room_mapping_confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApartmentProjectRow = typeof apartmentProjects.$inferSelect;
export type NewApartmentProjectRow = typeof apartmentProjects.$inferInsert;

/**
 * One room of an apartment, drawn as a polygon over the floor plan. The boundary
 * is stored as fractions of the floor plan image (0..1 on each axis) rather than
 * pixels, so an area stays on its walls whatever size the plan is displayed at.
 */
export const roomAreas = pgTable(
  "room_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apartmentProjectId: uuid("apartment_project_id")
      .notNull()
      .references(() => apartmentProjects.id, { onDelete: "cascade" }),
    roomType: text("room_type").notNull(),
    /** Empty when the user did not give the room a name of its own. */
    name: text("name").notNull().default(""),
    boundary: jsonb("boundary").$type<Array<{ x: number; y: number }>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("room_areas_apartment_project_id_idx").on(table.apartmentProjectId)],
);

export type RoomAreaRow = typeof roomAreas.$inferSelect;
export type NewRoomAreaRow = typeof roomAreas.$inferInsert;

/**
 * One image the user attached to say what a component of the apartment should
 * look like. A component holds exactly one reference — the unique index is what
 * makes attaching over an existing one a replacement rather than a second image.
 *
 * The bytes live in image storage under `storageKey`; `sourceUrl` records where
 * a linked image came from, and is null when the user picked a local file.
 */
export const apartmentReferences = pgTable(
  "apartment_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apartmentProjectId: uuid("apartment_project_id")
      .notNull()
      .references(() => apartmentProjects.id, { onDelete: "cascade" }),
    component: text("component").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sourceUrl: text("source_url"),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("apartment_references_project_component_idx").on(
      table.apartmentProjectId,
      table.component,
    ),
  ],
);

export type ApartmentReferenceRow = typeof apartmentReferences.$inferSelect;
export type NewApartmentReferenceRow = typeof apartmentReferences.$inferInsert;

/** One component reference attached to one room area. */
export const roomReferences = pgTable(
  "room_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomAreaId: uuid("room_area_id")
      .notNull()
      .references(() => roomAreas.id, { onDelete: "cascade" }),
    component: text("component").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sourceUrl: text("source_url"),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("room_references_room_component_idx").on(table.roomAreaId, table.component),
  ],
);

export type RoomReferenceRow = typeof roomReferences.$inferSelect;
export type NewRoomReferenceRow = typeof roomReferences.$inferInsert;

/** One immutable attempt to generate an isometric view of an apartment project. */
export const apartmentVisualizations = pgTable(
  "apartment_visualizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apartmentProjectId: uuid("apartment_project_id")
      .notNull()
      .references(() => apartmentProjects.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    inputSnapshot: jsonb("input_snapshot")
      .$type<{
        floorPlan: { fileName: string; contentType: string };
        rooms: Array<{
          id: string;
          roomType: string;
          name: string;
          boundary: Array<{ x: number; y: number }>;
        }>;
      }>()
      .notNull(),
    imageStorageKey: text("image_storage_key"),
    imageContentType: text("image_content_type"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("apartment_visualizations_project_created_idx").on(
      table.apartmentProjectId,
      table.createdAt,
    ),
  ],
);

export type ApartmentVisualizationRow = typeof apartmentVisualizations.$inferSelect;
export type NewApartmentVisualizationRow = typeof apartmentVisualizations.$inferInsert;
